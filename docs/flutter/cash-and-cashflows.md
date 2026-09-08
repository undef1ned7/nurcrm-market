# Flutter: денежные средства (кассы, cashflows, смены)

Полный контракт для мобильного клиента: как учитываются деньги в NurCRM Market — маршрутизация касс, auto-cashflows на бэке, ручная касса, pending, смены и отчёты.

**Веб-экраны:**
- Касса (ручные операции): `/crm/kassa`, `/crm/kassa/:id`
- Кассир: `/crm/market/cashier` (open/close shift, checkout)
- Продажи: `/crm/sell`
- Pending: `/crm/pending`, `/crm/pending/:cashboxId`
- Склад: приход поставщика, создание товара, возврат поставщику
- Клиенты / долги: `/crm/clients/:id`, `/crm/debts`

**Веб-код (эталон):**
- `src/shared/lib/tools/cashboxResolution.ts` — маршрутизация
- `src/shared/lib/tools/backendCashflows.ts` — флаг режима
- `src/entities/cash/lib/postCashflowIfNeeded.ts` — legacy fallback
- `src/entities/cash/model/cashSlice.ts` — REST кассы
- `src/entities/cash/lib/cashboxReportsApi.ts` — отчёты
- `src/pages/cashier/ui/hooks/usePaymentPage.ts` — checkout + cashflow
- `src/pages/cashier/ui/CloseShiftPage.tsx` — сверка ящика
- `src/pages/pending/ui/Pending.tsx` — approve/reject

**Бэкенд-доки:**
- [auto-cashflows-backend.md](../backend/kassa/auto-cashflows-backend.md)
- [shift-cash-reconciliation-backend.md](../backend/kassa/shift-cash-reconciliation-backend.md)
- [shift-payment-breakdown-backend.md](../backend/kassa/shift-payment-breakdown-backend.md)
- [cashbox-reports-backend.md](../backend/kassa/cashbox-reports-backend.md)
- [realtime-notifications-backend.md](../backend/kassa/realtime-notifications-backend.md)

**Статус (2026-09-01):**

| Компонент | Статус |
|-----------|--------|
| **Бэкенд** | ✅ **Готов** — auto-cashflows, `resolve_cashbox`, `expected_cash` / drawer, отчёты, reject cascade |
| **Веб nur-market** | ✅ Готов; для prod включить `VITE_BE_CASHFLOWS=true` |
| **Flutter** | Реализовать по этому доку; **`BE_CASHFLOWS=true`** — основной режим |

**Как работает auto income/expense (основной путь):**

1. Flutter шлёт бизнес-API + `{ branch_id?, cashbox_role?, shift_id? }`.
2. Бэкенд в одной транзакции: операция + `INSERT cashflow(s)`.
3. Ответ: `cashflows[]`, `resolved_cashbox_id`, `resolved_cashbox_name`.
4. Flutter **не** делает второй `POST /construction/cashflows/` (кроме **ручной кассы**).

**Флаг клиента:**

| `BE_CASHFLOWS` | Поведение |
|----------------|-----------|
| **`true` (рекомендуется)** | Не POST auto-cashflows; парсить ответ бизнес-API |
| `false` | Legacy: `postCashflowIfNeeded` только с явным `cashbox`; без `cashBoxes[0]` |

Legacy fallback в коде оставить на откат, но **не** использовать как основной режим при живом бэке.

**Ручная касса** — без изменений: `POST /construction/cashflows/` с явным `cashbox`.

**Отчёты** — см. [cashbox-reports.md](./cashbox-reports.md): `GET .../report/` и `GET .../analytics/`; fallback на cashflows только при `404`/`501`.

Базовый префикс: `{host}/api`. Авторизация: `Authorization: Bearer <accessToken>`.  
Таймзона: **Asia/Bishkek (UTC+6)**. Суммы в JSON — **decimal-строки** `"1234.56"`.

---

## Содержание

1. [Архитектура](#1-архитектура)
2. [Модели данных](#2-модели-данных)
3. [Роли касс и маршрутизация](#3-роли-касс-и-маршрутизация)
4. [Два режима работы клиента](#4-два-режима-работы-клиента)
5. [Dart: утилиты маршрутизации](#5-dart-утилиты-маршрутизации)
6. [Dart: postCashflowIfNeeded](#6-dart-postcashflowifneeded)
7. [Матрица операций](#7-матрица-операций)
8. [Эндпоинты кассы (ручной режим)](#8-эндпоинты-кассы-ручной-режим)
9. [POS: checkout и продажи](#9-pos-checkout-и-продажи)
10. [Смены: open / close / сверка](#10-смены-open--close--сверка)
11. [Долги и оплата сделок](#11-долги-и-оплата-сделок)
12. [Склад и закупки](#12-склад-и-закупки)
13. [Экран «Касса» (ручные операции)](#13-экран-касса-ручные-операции)
14. [Pending (ожидают подтверждения)](#14-pending-ожидают-подтверждения)
15. [Отчёты по кассе](#15-отчёты-по-кассе)
16. [Real-time уведомления](#16-real-time-уведомления)
17. [Ошибки API](#17-ошибки-api)
18. [Чеклист Flutter](#18-чеклист-flutter)

---

## 1. Архитектура

### 1.1 Два потока денег

```text
┌─────────────────────────────────────────────────────────────────┐
│  POS (продажи, оплата долга клиента)                            │
│  Кассы: pos_main / pos_branch + открытая смена                  │
│  → income в кассу смены → влияет на expected_cash при закрытии   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Закупки / переменные расходы                                   │
│  Касса: expense_variable («Переменные расходы»)                 │
│  → expense, shift_id = null → НЕ уменьшает ящик POS-смены       │
└─────────────────────────────────────────────────────────────────┘
```

**Критично:** нельзя брать «первую кассу из списка» (`cashBoxes[0]`). Кассу выбирает **бэкенд** по `branch_id`, `cashbox_role`, `shift_id`.

### 1.2 Жизненный цикл (основной — бэкенд готов)

```text
1. Flutter шлёт бизнес-API (checkout, pay, receipt…) +
   { branch_id?, cashbox_role?, shift_id? }
2. Бэкенд в одной транзакции:
   - выполняет операцию (продажа, deal pay…)
   - resolve_cashbox()
   - INSERT cashflow(s)
3. Ответ 200 + cashflows[] + resolved_cashbox_id
4. Flutter (BE_CASHFLOWS=true) НЕ делает POST /construction/cashflows/
```

### 1.3 Legacy fallback (только при BE_CASHFLOWS=false или откате)

```text
1. Flutter шлёт бизнес-API → 200 OK
2. Flutter отдельно POST /construction/cashflows/
   ТОЛЬКО если явно выбран cashbox (ручной выбор в UI)
   БЕЗ cashbox — пропустить (не подставлять первую кассу)
3. При ошибке cashflow — warn toast, операция уже выполнена
```

---

## 2. Модели данных

### 2.1 Cashbox

```dart
enum CashboxRole {
  posMain,           // pos_main — основная POS-касса
  posBranch,         // pos_branch — касса филиала
  expenseVariable,   // expense_variable — закупки
  expenseFixed,      // expense_fixed — постоянные расходы
}

class Cashbox {
  final String id;
  final String name;
  final CashboxRole? role;
  final String? branchId;
  final String balance;       // "75431833.98"
  final String? currentBalance;
  final String currency;      // "KGS"
  final bool isActive;
  final CashboxAnalytics? analytics;
}

class CashboxAnalytics {
  final String incomeTotal;
  final String expenseTotal;
  final int salesCount;
  final String? openShiftExpectedCash;
}
```

Парсинг `role` из API: `"pos_main"` → `CashboxRole.posMain` и т.д. Если поля нет — не использовать для авто-маршрутизации.

### 2.2 Cashflow

```dart
enum CashflowType { income, expense }

enum CashflowStatus { pending, approved, rejected }

/// Стабильные коды бизнес-операции (не локализованные строки!)
enum SourceKind {
  posSale,
  posPrepayment,
  debtRepayment,
  supplierDebtPayment,
  warehousePurchase,
  procurementReceipt,
  supplierReturn,
  defectWriteoff,
  productReturn,
  manual,
}

class Cashflow {
  final String id;
  final CashflowType type;
  final String amount;           // всегда >= 0, "1500.00"
  final String? name;
  final String cashbox;          // uuid
  final String? cashboxName;
  final CashflowStatus status;
  final SourceKind? sourceKind;
  final String? sourceId;
  final String? shiftId;
  final DateTime? createdAt;

  /// Legacy — только для reject cascade в Pending
  final String? sourceBusinessOperationId;
  final String? sourceCashboxFlowId;
}
```

Legacy `source_business_operation_id` (русские строки): `"Продажа"`, `"Склад"`, `"Закупки"`, `"Оплата долга"`, `"Возврат поставщику"`, `"Списание брака"`, `"Возврат товара"`. На новых записях предпочитать `source_kind`.

### 2.3 Ответ бизнес-операции с cashflows

```dart
class BusinessOperationWithCashflows {
  final String id;
  final List<Cashflow> cashflows;
  final String? resolvedCashboxId;
  final String? resolvedCashboxName;
}

Cashflow? parseCashflowsFromResponse(Map<String, dynamic> json) {
  final raw = json['cashflows'];
  if (raw is! List) return null;
  return raw.map((e) => Cashflow.fromJson(e as Map<String, dynamic>)).toList();
}
```

Если движения денег нет → `"cashflows": []` (не `null`).

---

## 3. Роли касс и маршрутизация

### 3.1 Приоритет для POS income

```text
shift.cashbox  >  pos_branch(branch_id)  >  pos_main  >  ERROR 400
```

### 3.2 Что шлёт клиент

| Поле | Тип | Когда |
|------|-----|-------|
| `branch_id` | uuid | есть активный филиал пользователя |
| `cashbox_role` | enum string | POS / закупки |
| `shift_id` | uuid | checkout, pay debt клиента в кассире |
| `cashbox_id` | uuid | **только** явный override (ручная касса, модалка выбора) |

Пустые поля **не включать** в JSON.

### 3.3 Откуда брать branch_id

```dart
String? resolveBranchId(UserProfile? profile, Company? company) {
  final raw = profile?.activeBranch ??
      profile?.branch ??
      company?.activeBranch;
  if (raw == null || '$raw'.trim().isEmpty) return null;
  return '$raw';
}

CashboxRole resolvePosCashboxRole(UserProfile? profile, Company? company) {
  return resolveBranchId(profile, company) != null
      ? CashboxRole.posBranch
      : CashboxRole.posMain;
}
```

### 3.4 Сверка ящика смены

```dart
/// Ожидаемая сумма в физическом ящике: размен + наличные продажи − расходы из ящика.
/// Закупки на expense_variable сюда НЕ входят.
double calcShiftDrawerExpected({
  required double openingCash,
  required double cashSalesTotal,
  double drawerOutflows = 0,
}) =>
    openingCash + cashSalesTotal - drawerOutflows;

/// Если бэк ещё вычитает закупки из expected_cash смены — оценка «утечки».
double estimateShiftWarehouseDrain({
  required double openingCash,
  required double cashSalesTotal,
  required double ledgerExpectedCash,
}) {
  final drawer = calcShiftDrawerExpected(
    openingCash: openingCash,
    cashSalesTotal: cashSalesTotal,
  );
  final drain = drawer - ledgerExpectedCash;
  return drain > 0.01 ? drain : 0;
}
```

Показывать кассиру `drawer_expected_cash` (или локальный `calcShiftDrawerExpected`), а не «ledger» с закупками. См. [shift-cash-reconciliation-backend.md](../backend/kassa/shift-cash-reconciliation-backend.md).

---

## 4. Режимы работы клиента

> **Бэкенд готов.** Flutter и веб работают с **`BE_CASHFLOWS=true`**. Legacy — только для отката или старых стендов.

### 4.1 Feature flag

| Режим | Config | Поведение |
|-------|--------|-----------|
| **Backend auto (основной)** | `BE_CASHFLOWS=true` | После бизнес-API **не** POST `/construction/cashflows/`; парсить `cashflows[]`, `resolved_cashbox_name` |
| **Legacy fallback** | `BE_CASHFLOWS=false` | `postCashflowIfNeeded` только с явным `cashbox`; **не** подставлять первую кассу |

На Flutter — remote config / `.env` / build flavor (аналог `VITE_BE_CASHFLOWS` на вебе):

```dart
abstract class CashflowConfig {
  /// Основной режим при живом бэке — true.
  static bool get isBackendCashflowsEnabled =>
      RemoteConfig.instance.beCashflows ??
      const bool.fromEnvironment('BE_CASHFLOWS', defaultValue: true);

  static bool get shouldPostCashflowFallback =>
      !isBackendCashflowsEnabled;
}
```

### 4.2 Double-write

Если бэк пишет cashflows, а клиент с `BE_CASHFLOWS=false` ещё POST-ит legacy — будут **дубли**. На prod держать **`BE_CASHFLOWS=true`** на всех клиентах.

### 4.3 Статус cashflow

| Условие | `status` |
|---------|----------|
| Тариф «Старт» | `approved` |
| Иначе (авто-операции) | `pending` |
| Ручная касса, owner / market sector | `approved` |
| Ручная касса, employee | `pending` |

---

## 5. Dart: утилиты маршрутизации

```dart
class CashRoutingContext {
  final String? branchId;
  final CashboxRole? cashboxRole;
  final String? shiftId;

  const CashRoutingContext({this.branchId, this.cashboxRole, this.shiftId});
}

Map<String, String> buildCashRoutingPayload(CashRoutingContext ctx) {
  final out = <String, String>{};
  final branch = ctx.branchId?.trim();
  if (branch != null && branch.isNotEmpty) {
    out['branch_id'] = branch;
  }
  if (ctx.cashboxRole != null) {
    out['cashbox_role'] = _roleToApi(ctx.cashboxRole!);
  }
  final shift = ctx.shiftId?.trim();
  if (shift != null && shift.isNotEmpty) {
    out['shift_id'] = shift;
  }
  return out;
}

String _roleToApi(CashboxRole role) => switch (role) {
  CashboxRole.posMain => 'pos_main',
  CashboxRole.posBranch => 'pos_branch',
  CashboxRole.expenseVariable => 'expense_variable',
  CashboxRole.expenseFixed => 'expense_fixed',
};

/// POS: checkout, pay debt клиента, open shift
Map<String, String> buildPosRoutingFromUser({
  required UserProfile? profile,
  required Company? company,
  String? shiftId,
}) {
  final branchId = resolveBranchId(profile, company);
  return buildCashRoutingPayload(CashRoutingContext(
    branchId: branchId,
    cashboxRole: resolvePosCashboxRole(profile, company),
    shiftId: shiftId,
  ));
}

/// Закупки, приход поставщика, возврат поставщику, create product
Map<String, String> buildExpenseVariableRouting() =>
    buildCashRoutingPayload(
      const CashRoutingContext(cashboxRole: CashboxRole.expenseVariable),
    );

bool hasExplicitCashbox(Object? cashbox) =>
    cashbox != null && '$cashbox'.trim().isNotEmpty;
```

---

## 6. Dart: postCashflowIfNeeded

```dart
enum CashflowFailureContext {
  product,
  purchase,
  sale,
  debt,
  returnOp,
  writeoff,
  accept,
  supplierReturn,
}

Future<Cashflow?> postCashflowIfNeeded({
  required CashflowRepository repo,
  required Map<String, dynamic> payload,
  bool warnOnFailure = false,
  CashflowFailureContext? failureContext,
}) async {
  if (!CashflowConfig.shouldPostCashflowFallback) {
    return null;
  }
  if (!hasExplicitCashbox(payload['cashbox'])) {
    // Кассу выбирает бэк — не подставлять первую из списка.
    return null;
  }
  try {
    return await repo.createCashflow(payload);
  } catch (e) {
    if (warnOnFailure) {
      Notify.cashflowPartialFailure(e, failureContext);
      return null;
    }
    rethrow;
  }
}
```

**Legacy payload** для POST `/construction/cashflows/`:

```json
{
  "cashbox": "uuid",
  "type": "income",
  "amount": "1500.00",
  "name": "Продажа",
  "status": "pending",
  "source_cashbox_flow_id": "sale-uuid",
  "source_business_operation_id": "Продажа"
}
```

При `BE_CASHFLOWS=true` парсите `cashflows[]` из ответа checkout/pay и показывайте toast с `resolved_cashbox_name`.

---

## 7. Матрица операций

| Операция | HTTP | Поля маршрутизации | source_kind | type | Касса (бэк) | Cashflows |
|----------|------|-------------------|-------------|------|-------------|-----------|
| POS checkout cash/card/split | `POST .../checkout/` | branch, role, shift | `pos_sale` | income | смена → branch → main | 1–2 записи |
| Checkout чистый долг | `POST .../checkout/` | branch, role, shift | — | — | — | `[]` |
| Checkout debt + предоплата | `POST .../checkout/` | branch, role, shift | `pos_prepayment` | income | POS | 1× prepay |
| Pay debt **клиента** | `POST .../deals/.../pay/` | branch, role, shift | `debt_repayment` | income | POS | 1× |
| Pay debt **поставщику** | `POST .../deals/.../pay/` | `cashbox_role: expense_variable` | `supplier_debt_payment` | expense | variable | 1×, shift=null |
| Legacy debts | `PATCH /main/debts/{id}/` | branch, role | `debt_repayment` | income | POS | 1× на разницу |
| Create product cash | `POST .../products/create-manual/` | expense_variable, payment_mode | `warehouse_purchase` | expense | variable | 1× |
| Supplier receipt cash | `POST .../receipt/` | expense_variable | `procurement_receipt` | expense | variable | 1× |
| Supplier receipt debt | `POST .../receipt/` | — | — | — | — | `[]` |
| Supplier return cash | `POST .../returns/` | expense_variable | `supplier_return` | income | variable | 1× |
| Defect writeoff | PATCH остатка | expense_variable | `defect_writeoff` | expense | variable | 1× |
| Product return (money) | PATCH остатка | POS routing | `product_return` | income | POS | 1× |
| Open shift | `POST .../shifts/open/` | branch, role | — | — | resolve → shift.cashbox | — |
| **Ручная касса** | `POST /construction/cashflows/` | явный `cashbox` | `manual` | income/expense | из тела | 1× |

---

## 8. Эндпоинты кассы (ручной режим)

| Метод | Путь | Назначение |
|-------|------|------------|
| `GET` | `/construction/cashboxes/` | список касс |
| `GET` | `/construction/cashboxes/{id}/` | карточка кассы + analytics |
| `GET` | `/construction/cashflows/` | потоки (фильтры: cashbox, status, date_from, date_to, page) |
| `POST` | `/construction/cashflows/` | ручная операция |
| `PATCH` | `/construction/cashflows/{id}/` | approve/reject одной |
| `PATCH` | `/construction/cashflows/bulk/status/` | bulk approve/reject |

### POST ручной операции

```json
{
  "cashbox": "uuid",
  "type": "expense",
  "amount": "1000.00",
  "name": "Аренда офиса",
  "status": "approved"
}
```

Касса **обязательна** — пользователь выбирает осознанно.

### GET cashflows (карточка кассы)

```dart
final params = {
  'cashbox': cashboxId,
  'status': 'approved',  // или 'pending' на вкладке pending
  'page': page,
  'page_size': 100,
  if (dateFrom != null) 'date_from': dateFrom,
  if (dateTo != null) 'date_to': dateTo,
  if (search.isNotEmpty) 'search': search,
};
```

---

## 9. POS: checkout и продажи

### 9.1 Checkout

```http
POST /main/pos/sales/{sale_id}/checkout/
```

```json
{
  "print_receipt": true,
  "client_id": "uuid",
  "payment_method": "cash",
  "cash_received": "1500.00",
  "branch_id": "uuid",
  "cashbox_role": "pos_branch",
  "shift_id": "uuid",
  "consultant_id": "uuid",
  "schedule_version": "v2",
  "debt_schedule": { }
}
```

**Split-оплата** — массив `payments` вместо `payment_method`:

```json
{
  "payments": [
    { "method": "mbank", "amount": "500.00" },
    { "method": "cash", "amount": "1000.00" }
  ],
  "cash_received": "1000.00",
  "branch_id": "...",
  "cashbox_role": "pos_branch",
  "shift_id": "..."
}
```

Коды `method`: `cash`, `mbank`, `optima`, `obank`, `bakai`, `demir`, `transfer`, `card`, `debt`.

### 9.2 Алгоритм на клиенте после checkout

```dart
Future<void> onCheckoutSuccess(Map<String, dynamic> response) async {
  if (CashflowConfig.isBackendCashflowsEnabled) {
    final flows = response['cashflows'] as List? ?? [];
    final boxName = response['resolved_cashbox_name']?.toString();
    if (flows.isNotEmpty && boxName != null) {
      Notify.success('Касса «$boxName»: операция учтена');
    }
    return;
  }

  // Legacy — только если есть явный cashbox (обычно нет на POS)
  if (paymentMethod != PaymentMethod.deferred && total > 0) {
    await postCashflowIfNeeded(
      repo: cashflowRepo,
      payload: {
        'type': 'income',
        'amount': formatMoney(total),
        'name': 'Продажа',
        'source_cashbox_flow_id': response['id'] ?? response['sale_id'],
        'source_business_operation_id': 'Продажа',
        'status': isStartPlan ? 'approved' : 'pending',
        // cashbox — только если пользователь явно выбрал
      },
      warnOnFailure: true,
      failureContext: CashflowFailureContext.sale,
    );
  }

  // Debt + prepayment: отдельный income на сумму предоплаты (legacy)
  if (paymentMethod == PaymentMethod.deferred && prepayment > 0) { ... }
}
```

### 9.3 Отсрочка (debt)

- Checkout с `payment_method: "debt"` без предоплаты → **cashflows: []**
- С предоплатой → income `pos_prepayment` на сумму предоплаты
- После checkout создаётся deal (`POST /main/clients/{id}/deals/` или v2 schedule) — см. [debt-installment-schedule.md](./debt-installment-schedule.md)

---

## 10. Смены: open / close / сверка

### 10.1 Open shift

```http
POST /construction/shifts/open/
```

```json
{
  "cashier": "user-uuid",
  "opening_cash": "5000.00",
  "branch_id": "branch-uuid",
  "cashbox_role": "pos_branch"
}
```

Ответ содержит `cashbox`, `cashbox_name`, `resolved_cashbox_id`. Сохраните `shift.id` для всех checkout в смене.

Legacy override: поле `cashbox` в теле (admin).

### 10.2 Close shift

```http
POST /construction/shifts/{id}/close/
{ "closing_cash": "15200.00" }
```

UI закрытия смены:

| Поле | Отображение |
|------|-------------|
| `opening_cash` | Размен |
| `cash_sales_total` | Наличные продажи |
| `noncash_sales_total` | Безнал |
| `drawer_expected_cash` или локальный расчёт | **Ожидаемо в ящике** |
| `payment_breakdown[]` | Разбивка по способам оплаты |
| `closing_cash` (ввод) | Факт в ящике |
| `cash_diff` | `closing_cash - drawer_expected` |

#### Золотой кейс сверки (регрессия)

После миграции закупки **не должны** уменьшать expected ящика:

| Показатель | Значение |
|------------|----------|
| Размен | 50 сом |
| Наличные продажи | 33 768 сом |
| Закупки на `expense_variable` | 54 625 сом |
| **Drawer expected** | **33 818** (= 50 + 33 768) |
| Факт в ящике | 8 888 сом |
| **cash_diff** | **−24 930** (= 8 888 − 33 818) |

**Fail (старая модель):** expected = −20 806, diff = +29 694 — значит закупки ошибочно списаны с POS-кассы смены.

Показывай кассиру `drawer_expected_cash` (или `calcShiftDrawerExpected`), а не ledger с закупками. См. [shift-cash-reconciliation-backend.md](../backend/kassa/shift-cash-reconciliation-backend.md).

Если `payment_breakdown` нет в ответе — fallback: загрузить продажи смены и посчитать на клиенте (см. `src/entities/shift/lib/paymentBreakdown.ts`).

### 10.3 payment_breakdown

```json
{
  "payment_breakdown": [
    { "method": "cash", "label": "Наличные", "count": 9, "amount": "18000.00" },
    { "method": "mbank", "label": "МБанк", "count": 4, "amount": "6200.00" },
    { "method": "split", "label": "Смешанная", "count": 1, "amount": "1500.00" },
    { "method": "debt", "label": "Отсрочка", "count": 1, "amount": "500.00" }
  ]
}
```

Правила: один чек = один `method`; split не дробить на cash+mbank; отменённые чеки не входят.

---

## 11. Долги и оплата сделок

### 11.1 Pay deal (клиент)

```http
POST /main/clients/{clientId}/deals/{dealId}/pay/
POST /main/clientdeals/{dealId}/pay/
```

```json
{
  "idempotency_key": "uuid-v4",
  "installment_id": "uuid",
  "amount": "500.00",
  "date": "2026-08-28",
  "branch_id": "uuid",
  "cashbox_role": "pos_branch",
  "shift_id": "uuid"
}
```

Маршрутизация: `buildPosRoutingFromUser` + `openShiftId`.

### 11.2 Pay deal (поставщик)

```json
{
  "idempotency_key": "uuid-v4",
  "amount": "500.00",
  "date": "2026-08-28",
  "cashbox_role": "expense_variable"
}
```

**Без** `shift_id`. Не влияет на expected_cash POS-смены.

### 11.3 Legacy `/crm/debts`

```http
PATCH /main/debts/{id}/
{ "amount": "0.00", "branch_id": "...", "cashbox_role": "pos_main" }
```

При уменьшении amount → income на разницу.

Подробнее: [client-debt-and-kpis.md](./client-debt-and-kpis.md).

---

## 12. Склад и закупки

### 12.1 Создание товара

```http
POST /main/products/create-manual/
POST /main/products/create-by-barcode/
```

```json
{
  "name": "Товар",
  "purchase_price": "100.00",
  "quantity": 10,
  "payment_mode": "cash",
  "cashbox_role": "expense_variable"
}
```

| payment_mode | Cashflow |
|--------------|----------|
| `cash` / `prepayment` | expense `warehouse_purchase` |
| `debt` | `[]` + deal |

Legacy: `postCashflowIfNeeded` с `source_business_operation_id: "Склад"`, type `expense`.

### 12.2 Приход поставщика

```http
POST /main/suppliers/{supplier_id}/receipt/
```

```json
{
  "items": [{ "product_id": "uuid", "qty": 10, "purchase_price": "50.00" }],
  "payment_type": "cash",
  "cashbox_role": "expense_variable"
}
```

| payment_type | Cashflow |
|--------------|----------|
| `cash` | expense `procurement_receipt` |
| `debt` | `[]` |

### 12.3 Возврат поставщику

```http
POST /main/suppliers/{supplier_id}/returns/
```

```json
{
  "receipt_id": "uuid",
  "compensation": "cash",
  "cashbox_role": "expense_variable",
  "items": [...]
}
```

| compensation | Cashflow |
|--------------|----------|
| `cash` | income `supplier_return` |
| `debt_offset` / `none` | `[]` |

См. [procurement-history-returns.md](./procurement-history-returns.md).

---

## 13. Экран «Касса» (ручные операции)

### 13.1 Карта экрана `/crm/kassa/:id`

```text
┌ Header: название кассы, баланс ─────────────────┐
│ Tabs: Все | Приход | Расход | Pending | Отчёты │
├─────────────────────────────────────────────────┤
│ Список cashflows (approved) + пагинация         │
│ FAB: добавить операцию                          │
└─────────────────────────────────────────────────┘
```

### 13.2 Добавление операции

1. Пользователь **выбирает кассу** из списка (не auto-select first!).
2. `POST /construction/cashflows/` с явным `cashbox`.
3. `status`: owner или sector «Магазин» → `approved`, иначе `pending`.

### 13.3 Права

```dart
bool canApproveDirectly(UserProfile profile, Company company) =>
    profile.role == 'owner' ||
    profile.role == 'admin' ||
    isMarketSector(company.sector?.name);
```

---

## 14. Pending (ожидают подтверждения)

### 14.1 Загрузка

```http
GET /construction/cashflows/?status=pending&page=1&page_size=100
GET /construction/cashflows/?status=pending&cashbox={uuid}
```

### 14.2 Approve / Reject

```http
PATCH /construction/cashflows/{id}/
{ "status": "approved" }

PATCH /construction/cashflows/bulk/status/
{ "items": [{ "id": "...", "status": "approved" }] }
```

### 14.3 Reject cascade

| Режим | При reject |
|-------|------------|
| `BE_CASHFLOWS=true` | Только PATCH status — бэк откатывает sale/product/receipt |
| Legacy fallback | PATCH + локальные side-effects (`deleteSale`, `deleteProduct`…) |

Маппинг legacy `source_business_operation_id`:

| Строка | Действие (legacy FE) |
|--------|----------------------|
| `Продажа` | delete sale |
| `Склад` | delete product |
| `Закупки` | откат receipt |
| `Оплата долга` | refund deal pay |
| `Возврат поставщику` | откат return |

На новых записях ориентируйтесь на `source_kind`.

---

## 15. Отчёты по кассе

**Подробный контракт, Dart-модели, fallback и UI:** [cashbox-reports.md](./cashbox-reports.md).

Кратко:
- одна касса → `GET /construction/cashboxes/{id}/report/` (day/month);
- аналитика → `GET /construction/cashbox-reports/analytics/`;
- при `404`/`501` — fallback на paginated `GET /construction/cashflows/` (см. отдельный док).

---

## 16. Real-time уведомления

**WebSocket:** `wss://{host}/ws/notifications/?token={access_token}`

После auto-cashflow бэк может прислать:

```json
{
  "type": "notification",
  "data": {
    "event": "market.cashflow.created",
    "title": "Движение по кассе",
    "message": "Касса «Касса филиала 1»: +1 500,00 сом",
    "meta": {
      "cashflow_id": "uuid",
      "cashbox_id": "uuid",
      "source_kind": "pos_sale",
      "amount": "1500.00",
      "type": "income"
    }
  }
}
```

На Flutter: toast + обновление badge колокольчика. Ping каждые 25 с: `{ "action": "ping" }`.

---

## 17. Ошибки API

| code | HTTP | Когда | UI |
|------|------|-------|-----|
| `cashbox_unresolvable` | 400 | нет кассы для role/branch | «Не настроена касса для операции» |
| `shift_required` | 400 | checkout без open shift | «Откройте смену» |
| `branch_cashbox_not_configured` | 400 | нет pos_branch | обратиться к админу |
| `cashflow_already_exists` | 409 | повтор idempotent | показать успех |
| `reject_cascade_failed` | 409 | reject без отката | ошибка с detail |

Формат:

```json
{
  "detail": "Не удалось определить кассу для операции",
  "code": "cashbox_unresolvable"
}
```

---

## 18. Чеклист Flutter

### Маршрутизация

- [ ] `resolveBranchId` из profile/company
- [ ] `buildPosRoutingFromUser` на checkout, pay debt клиента, open shift
- [ ] `buildExpenseVariableRouting` на склад/закупки/долг поставщику
- [ ] **Никогда** не использовать `cashBoxes.first` для авто-операций
- [ ] Пустые routing-поля не слать в JSON

### Режим BE_CASHFLOWS (бэк готов — default true)

- [ ] `BE_CASHFLOWS=true` на prod/staging
- [ ] Не POST legacy cashflows после бизнес-API
- [ ] Парсить `cashflows[]`, `resolved_cashbox_name` из ответа
- [ ] Legacy fallback (`false`) только для отката — не основной путь

### POS / смены

- [ ] Open shift с routing payload
- [ ] Checkout с `shift_id` открытой смены
- [ ] Close shift: `drawer_expected` vs `closing_cash`
- [ ] `payment_breakdown` из API или client fallback
- [ ] Split / debt / prepayment — корректные cashflows

### Долги

- [ ] Pay client deal → POS routing + shift
- [ ] Pay supplier deal → expense_variable, без shift
- [ ] Legacy PATCH `/main/debts/`

### Склад

- [ ] Create product / receipt / return с `expense_variable`
- [ ] debt payment_type → без cashflow

### Ручная касса

- [ ] GET cashboxes / cashflows с пагинацией
- [ ] POST с явным cashbox + status по роли
- [ ] Pending approve/reject — только PATCH status (reject cascade на бэке)

### Отчёты

См. [cashbox-reports.md](./cashbox-reports.md):

- [ ] `GET .../report/` и `GET .../analytics/` — основной путь (бэк готов)
- [ ] Fallback на paginated cashflows при 404/501
- [ ] Toast при `truncated`
- [ ] Один HTTP-запрос при working BE (не N× cashflows)

### Real-time

- [ ] WS notifications + event `market.cashflow.created`
- [ ] Partial failure toast (legacy режим)

---

## Связанные документы

| Документ | Тема |
|----------|------|
| [cashier-settings.md](./cashier-settings.md) | Настройки кассира |
| [debt-installment-schedule.md](./debt-installment-schedule.md) | Продажа в долг |
| [client-debt-and-kpis.md](./client-debt-and-kpis.md) | Оплата графика долга |
| [procurement-history-returns.md](./procurement-history-returns.md) | Возвраты поставщику |
| [cashbox-reports.md](./cashbox-reports.md) | Отчёты кассы (день/месяц/аналитика) |
