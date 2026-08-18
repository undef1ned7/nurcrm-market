import { useEffect, useMemo, useState } from "react";
import api from "@shared/api";
import "./debts.scss";
import {
  addCashFlows,
  getCashBoxes,
  useCash,
} from "@entities/cash";
import { PageShell, PagePanel } from "@shared/ui/page-shell";
import Pagination from "@pages/warehouse/ui/components/Pagination";
import { useDebouncedValue } from "@shared/hooks/useDebounce";

import {
  listFrom,
  extractApiErr,
  checkNotifications,
  inRange,
  getDebtAmount,
  phoneNorm,
  num,
} from "./helpers";

import { DebtsHeader } from "./components/DebtsHeader";
import { Notifications } from "./components/Notifications";
import { DebtsTable } from "./components/DebtsTable";
import { NewDebtModal } from "./components/NewDebtModal";
import { PayDebtModal } from "./components/PayDebtModal";
import { EditDebtModal } from "./components/EditDebtModal";
import { useAppDispatch } from "@app/store";

async function fetchDebtsPage({
  page,
  page_size,
  q,
  dateFrom,
  dateTo,
}: {
  page: number;
  page_size: number;
  q: string;
  dateFrom: string;
  dateTo: string;
}) {
  const params: any = { page, page_size };
  const trimmed = String(q || "").trim();
  if (trimmed) {
    // на случай разных бэкенд-реализаций отправим и `search`, и `q`
    params.search = trimmed;
    params.q = trimmed;
  }
  if (dateFrom) params.date_from = dateFrom;
  if (dateTo) params.date_to = dateTo;

  const res = await api.get("/main/debts/", { params });
  return res?.data || {};
}

async function createDebt(payload) {
  const res = await api.post("/main/debts/", payload);
  return res.data;
}

async function updateDebt(id, payload) {
  const res = await api.patch(`/main/debts/${id}/`, payload);
  return res.data;
}

async function deleteDebt(id) {
  await api.delete(`/main/debts/${id}/`);
}

const Debts = () => {
  const [items, setItems] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState("");
  const [notifications, setNotifications] = useState<any[]>([]);

  const [q, setQ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Пагинация списка долгов (убирает while-loop до 60 страниц)
  const PAGE_SIZE = 50;
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPrevPage, setHasPrevPage] = useState(false);

  // Дебаунс поискового инпута, чтобы не дергать API на каждый символ
  const debouncedQ = useDebouncedValue(q, 300, () => {});

  const [isNewOpen, setIsNewOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [formErr, setFormErr] = useState("");
  const [savingNew, setSavingNew] = useState(false);

  const [payOpen, setPayOpen] = useState(false);
  const [payId, setPayId] = useState<any>(null);
  const [payAmt, setPayAmt] = useState("");
  const [payErr, setPayErr] = useState("");
  const [savingPay, setSavingPay] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<any>(null);
  const [eFullName, setEFullName] = useState("");
  const [ePhone, setEPhone] = useState("");
  const [eAmount, setEAmount] = useState("");
  const [eDueDate, setEDueDate] = useState("");
  const [editErr, setEditErr] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const { list: cashBoxes } = useCash();
  const [cashbox, setCashbox] = useState("");
  const [confirmId, setConfirmId] = useState<any>(null);

  const dispatch = useAppDispatch();

  const load = async () => {
    try {
      setLoading(true);
      setLoadErr("");
      const data = await fetchDebtsPage({
        page,
        page_size: PAGE_SIZE,
        q: debouncedQ,
        dateFrom,
        dateTo,
      });

      // data в формате DRF: { count, next, previous, results }
      const nextItems = Array.isArray(data?.results) ? data.results : listFrom({ data });
      setItems(Array.isArray(nextItems) ? nextItems : []);

      const nextCount =
        typeof data?.count === "number" ? data.count : Array.isArray(nextItems) ? nextItems.length : 0;
      setTotalCount(nextCount);
      setHasNextPage(Boolean(data?.next));
      setHasPrevPage(Boolean(data?.previous));

      const newNotifications = checkNotifications(nextItems || []);
      setNotifications(newNotifications);
    } catch (e: any) {
      console.error(e);
      setLoadErr(extractApiErr(e, "Не удалось загрузить долги"));
      setItems([]);
      setTotalCount(0);
      setHasNextPage(false);
      setHasPrevPage(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    dispatch(getCashBoxes({} as any) as any);
  }, [dispatch]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQ, dateFrom, dateTo]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedQ, dateFrom, dateTo]);

  useEffect(() => {
    if (cashBoxes && cashBoxes.length > 0 && !cashbox) {
      const firstCashBox = cashBoxes[0];
      const firstCashBoxId = firstCashBox?.id || firstCashBox?.uuid || "";
      if (firstCashBoxId) {
        setCashbox(firstCashBoxId);
      }
    }
  }, [cashBoxes, cashbox]);

  const filtered = useMemo(() => {
    const s = String(debouncedQ || "").trim().toLowerCase();
    let arr = !s
      ? items
      : items.filter((x) => `${x.name} ${x.phone}`.toLowerCase().includes(s));

    arr = arr.filter((x) => getDebtAmount(x) > 0);

    if (dateFrom || dateTo) {
      arr = arr.filter((x) => inRange(x.created_at, dateFrom, dateTo));
    }
    return [...arr].sort(
      (a: any, b: any) => Number(new Date(b.created_at || 0)) - Number(new Date(a.created_at || 0))
    );
  }, [items, debouncedQ, dateFrom, dateTo]);

  const openNew = () => {
    setFullName("");
    setPhone("");
    setAmount("");
    setDueDate("");
    setFormErr("");
    setIsNewOpen(true);
  };

  const submitNew = async (e) => {
    e.preventDefault();
    setFormErr("");

    if (!fullName.trim()) return setFormErr("Введите имя");
    const ph = phoneNorm(phone);
    if (!ph) return setFormErr("Введите телефон");
    if (items.some((x) => phoneNorm(x.phone) === ph))
      return setFormErr("Такой номер телефона уже существует");
    const a = num(amount);
    if (!(a > 0)) return setFormErr("Введите сумму долга (> 0)");

    try {
      setSavingNew(true);
      const created = await createDebt({
        name: fullName.trim(),
        phone: ph,
        amount: String(a),
        due_date: dueDate || null,
      });
      setItems((p) => [created, ...p]);
      setIsNewOpen(false);

      const newNotifications = checkNotifications([created, ...items]);
      setNotifications(newNotifications);
    } catch (e2: any) {
      console.error(e2);
      setFormErr(extractApiErr(e2, "Не удалось создать долг"));
    } finally {
      setSavingNew(false);
    }
  };

  const openPay = (id) => {
    setPayId(id);
    setPayAmt("");
    setPayErr("");
    setPayOpen(true);
  };

  const submitPay = async (e) => {
    e.preventDefault();
    setPayErr("");
    const amt = num(payAmt);
    if (!(amt > 0)) return setPayErr("Введите сумму оплаты (> 0)");

    const current = items.find((x) => x.id === payId);
    if (!current) return setPayErr("Запись не найдена");

    if (!cashbox)
      return setPayErr("Касса не выбрана. Создайте кассу в разделе «Кассы».");

    const baseDebt = getDebtAmount(current);
    const nextAmount = Math.max(0, baseDebt - amt);

    try {
      setSavingPay(true);
      const updated = await updateDebt(payId, { amount: String(nextAmount) });
      setItems((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));

      await dispatch(
        addCashFlows({
          name: current.name
            ? `Возврат долга: ${current.name}`
            : "Возврат долга",
          amount: String(amt),
          type: "income",
          cashbox,
        })
      ).unwrap();

      setPayOpen(false);
    } catch (e2: any) {
      console.error(e2);
      setPayErr(extractApiErr(e2, "Не удалось обновить сумму долга"));
    } finally {
      setSavingPay(false);
    }
  };

  const openEdit = (item) => {
    setEditId(item.id);
    setEFullName(item.name || "");
    setEPhone(item.phone || "");
    setEAmount(String(item.amount ?? ""));
    setEDueDate(item.due_date || "");
    setEditErr("");
    setEditOpen(true);
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    setEditErr("");

    if (!eFullName.trim()) return setEditErr("Введите имя");
    const ph = phoneNorm(ePhone);
    if (!ph) return setEditErr("Введите телефон");
    if (items.some((x) => x.id !== editId && phoneNorm(x.phone) === ph))
      return setEditErr("Такой номер телефона уже существует");
    const newAmount = num(eAmount);
    if (!(newAmount > 0)) return setEditErr("Введите сумму долга (> 0)");

    try {
      setSavingEdit(true);
      const updated = await updateDebt(editId, {
        name: eFullName.trim(),
        phone: ph,
        amount: String(newAmount),
        due_date: eDueDate || null,
      });
      const updatedItems = items.map((x) =>
        x.id === updated.id ? updated : x
      );
      setItems(updatedItems);
      setEditOpen(false);

      const newNotifications = checkNotifications(updatedItems);
      setNotifications(newNotifications);
    } catch (e2: any) {
      console.error(e2);
      setEditErr(extractApiErr(e2, "Не удалось сохранить изменения"));
    } finally {
      setSavingEdit(false);
    }
  };

  const askDelete = (id) => setConfirmId(id);
  const cancelDelete = () => setConfirmId(null);
  const doDelete = async (id) => {
    try {
      await deleteDebt(id);
      const updatedItems = items.filter((x) => x.id !== id);
      setItems(updatedItems);

      const newNotifications = checkNotifications(updatedItems);
      setNotifications(newNotifications);
    } catch (e: any) {
      console.error(e);
    } finally {
      setConfirmId(null);
    }
  };

  return (
    <PageShell className="debts-page">
      <DebtsHeader
        q={q}
        setQ={setQ}
        dateFrom={dateFrom}
        setDateFrom={setDateFrom}
        dateTo={dateTo}
        setDateTo={setDateTo}
        onAddClick={openNew}
      />

      {loadErr && (
        <div className="debts-page__alert debts-page__alert--danger">
          {loadErr}
        </div>
      )}

      <Notifications notifications={notifications} />

      <PagePanel flush>
        <DebtsTable
          loading={loading}
          items={filtered}
          confirmId={confirmId}
          onAskDelete={askDelete}
          onCancelDelete={cancelDelete}
          onDelete={doDelete}
          onOpenPay={openPay}
          onOpenEdit={openEdit}
        />
      </PagePanel>

      <div style={{ marginTop: 12 }}>
        <Pagination
          currentPage={page}
          totalPages={Math.max(1, Math.ceil(totalCount / PAGE_SIZE))}
          count={totalCount}
          countLabel="долгов"
          loading={loading}
          hasNextPage={hasNextPage}
          hasPrevPage={hasPrevPage}
          onPageChange={(p) => {
            if (p < 1) return;
            setPage(p);
          }}
        />
      </div>

      <NewDebtModal
        open={isNewOpen}
        fullName={fullName}
        setFullName={setFullName}
        phone={phone}
        setPhone={setPhone}
        amount={amount}
        setAmount={setAmount}
        dueDate={dueDate}
        setDueDate={setDueDate}
        formErr={formErr}
        savingNew={savingNew}
        onClose={() => setIsNewOpen(false)}
        onSubmit={submitNew}
      />

      <PayDebtModal
        open={payOpen}
        payAmt={payAmt}
        setPayAmt={setPayAmt}
        payErr={payErr}
        savingPay={savingPay}
        onClose={() => setPayOpen(false)}
        onSubmit={submitPay}
      />

      <EditDebtModal
        open={editOpen}
        eFullName={eFullName}
        setEFullName={setEFullName}
        ePhone={ePhone}
        setEPhone={setEPhone}
        eAmount={eAmount}
        setEAmount={setEAmount}
        eDueDate={eDueDate}
        setEDueDate={setEDueDate}
        editErr={editErr}
        savingEdit={savingEdit}
        onClose={() => setEditOpen(false)}
        onSubmit={submitEdit}
      />
    </PageShell>
  );
};

export default Debts;
