/**
 * Автодооформление долга после успешного checkout.
 *
 * `productCheckout` и создание сделки (`createDeal` / легаси `/main/debts/`
 * для тарифа «Старт») — два независимых запроса. Если checkout прошёл, а
 * один из них упал, откатывать уже нечего — продажа уже финализирована.
 * Раньше кассир видел один раз предупреждение, и продажа оставалась в
 * статусе «долг» без сделки/записи, без какого-либо следа для повторной
 * попытки (см. docs/sale-flow-bugs.md, пункт 7).
 *
 * Этот модуль хранит неудавшиеся попытки в localStorage и позволяет системе
 * самой их повторять (с backoff, до победного конца), без участия кассира.
 * @see docs/sale-flow-fixes/07-debt-deal-retry-queue.md
 * @see useDebtDealQueueProcessor — где это реально прокручивается.
 */
import api from "@shared/api";
import { notify } from "@shared/lib/notifications";
import { validateResErrors } from "@shared/lib/tools/validateResErrors";
import { createDeal, type CreateDealArgs } from "../model/saleThunk";

const STORAGE_KEY = "market_pending_debt_deals_v1";
/** Backoff между попытками: 10с, 30с, 1мин, 5мин, дальше раз в 30 мин. */
const BACKOFF_MS = [10_000, 30_000, 60_000, 5 * 60_000, 30 * 60_000];
/** После стольки неудачных попыток один раз предупреждаем — но продолжаем пробовать. */
const WARN_AFTER_ATTEMPTS = 5;

export type PendingDebtDealTask = {
  id: string;
  saleId: string;
  clientName: string;
  /** Аргументы для thunk createDeal (как передаются в dispatch(createDeal(...))). */
  createDealPayload: CreateDealArgs;
  createDealDone: boolean;
  /** Тело POST /main/debts/ (легаси-фолбэк тарифа «Старт»), null — если не требуется. */
  startDebtPayload: Record<string, unknown> | null;
  startDebtDone: boolean;
  attempts: number;
  nextAttemptAt: number;
  createdAt: number;
  lastError?: string;
};

function genId(): string {
  const c: any = (globalThis as any)?.crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `debt-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readQueue(): PendingDebtDealTask[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(tasks: PendingDebtDealTask[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    // приватный режим / квота — очередь просто не переживёт перезагрузку,
    // но текущая сессия всё равно продолжит ретраить из памяти процесса.
  }
}

function backoffDelay(attempts: number): number {
  const idx = Math.min(Math.max(attempts - 1, 0), BACKOFF_MS.length - 1);
  return BACKOFF_MS[idx];
}

/**
 * Ставит в очередь недооформленный долг. Вызывается сразу после того, как
 * checkout прошёл, а createDeal и/или /main/debts/ — нет.
 * Безопасно вызывать даже если один из двух уже успешен (флаги *Done).
 */
export function enqueuePendingDebtDeal(input: {
  saleId: string | number;
  clientName?: string;
  createDealPayload: CreateDealArgs;
  createDealDone?: boolean;
  startDebtPayload?: Record<string, unknown> | null;
  startDebtDone?: boolean;
  lastError?: string;
}): PendingDebtDealTask {
  const task: PendingDebtDealTask = {
    id: genId(),
    saleId: String(input.saleId),
    clientName: input.clientName || "",
    createDealPayload: input.createDealPayload,
    createDealDone: Boolean(input.createDealDone),
    startDebtPayload: input.startDebtPayload ?? null,
    startDebtDone:
      input.startDebtDone ?? !input.startDebtPayload /* нечего повторять */,
    attempts: 0,
    nextAttemptAt: Date.now(),
    createdAt: Date.now(),
    lastError: input.lastError,
  };
  const queue = readQueue();
  queue.push(task);
  writeQueue(queue);
  return task;
}

export function listPendingDebtDeals(): PendingDebtDealTask[] {
  return readQueue();
}

function removeTask(id: string) {
  writeQueue(readQueue().filter((task) => task.id !== id));
}

function saveTask(next: PendingDebtDealTask) {
  writeQueue(readQueue().map((task) => (task.id === next.id ? next : task)));
}

let processingInFlight = false;

/**
 * Прогоняет очередь: для каждой задачи, чьё время пришло, повторяет
 * недостающие запросы. Успех обоих (createDeal + /main/debts/, если нужен)
 * — задача удаляется. Неудача — новый backoff. Если уже идёт прогон,
 * повторный вызов — no-op (не запускаем параллельные проходы очереди).
 */
export async function processPendingDebtDeals(dispatch: any): Promise<void> {
  if (processingInFlight) return;
  processingInFlight = true;
  try {
    const now = Date.now();
    const due = readQueue().filter((task) => task.nextAttemptAt <= now);

    for (const original of due) {
      let task = original;

      if (!task.startDebtDone && task.startDebtPayload) {
        try {
          // task.id стабилен на все повторы этой же задачи — если запрос на
          // самом деле прошёл, а фронт не получил ответ (таймаут), повтор с
          // тем же ключом не создаст вторую запись (при поддержке на бэке).
          await api.post("/main/debts/", {
            ...task.startDebtPayload,
            idempotency_key: task.id,
          });
          task = { ...task, startDebtDone: true };
        } catch {
          // Легаси-фолбэк тарифа «Старт» — best-effort, не блокирует Deal,
          // просто попробуем ещё раз в следующий проход вместе с createDeal.
        }
      }

      if (!task.createDealDone) {
        try {
          await dispatch(
            createDeal({ ...task.createDealPayload, idempotencyKey: task.id }),
          ).unwrap();
          task = { ...task, createDealDone: true };
        } catch (error: any) {
          const attempts = task.attempts + 1;
          task = {
            ...task,
            attempts,
            nextAttemptAt: Date.now() + backoffDelay(attempts),
            lastError: validateResErrors(error, ""),
          };
          if (attempts === WARN_AFTER_ATTEMPTS) {
            notify.warning(
              `Не удаётся автоматически дооформить долг по продаже ${task.saleId}` +
                (task.clientName ? ` (${task.clientName})` : "") +
                `. Система продолжит пробовать в фоне.`,
              { duration: 10000 },
            );
          }
        }
      }

      if (task.createDealDone && task.startDebtDone) {
        removeTask(task.id);
        notify.success(
          `Долг по продаже ${task.saleId}` +
            (task.clientName ? ` (${task.clientName})` : "") +
            ` оформлен автоматически.`,
        );
      } else {
        saveTask(task);
      }
    }
  } finally {
    processingInFlight = false;
  }
}
