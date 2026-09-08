# Backend implementation guide: expected_cash, routing, debts

**Репозиторий:** NurCRM API (Django) — отдельно от `nur-market`  
**Статус:** спецификация для реализации  
**Связано:** [auto-cashflows-backend.md](./auto-cashflows-backend.md), [shift-cash-reconciliation-backend.md](./shift-cash-reconciliation-backend.md), [shift-payment-breakdown-backend.md](./shift-payment-breakdown-backend.md)

---

## 1. Миграции

### Cashbox.role

```python
class CashboxRole(models.TextChoices):
    POS_MAIN = "pos_main"
    POS_BRANCH = "pos_branch"
    EXPENSE_VARIABLE = "expense_variable"
    EXPENSE_FIXED = "expense_fixed"

# Cashbox.role = CharField(choices=CashboxRole.choices, null=True)
# Cashbox.branch = ForeignKey(Branch, null=True, blank=True)
```

Data migration: проставить `role` по имени кассы (см. auto-cashflows-backend.md).

### Cashflow.affects_shift_drawer

```python
# Cashflow.affects_shift_drawer = BooleanField(default=False)
# Cashflow.source_kind = CharField(...)  # если ещё нет
# Cashflow.shift = ForeignKey(Shift, null=True, blank=True)
```

Default по `source_kind`:

| source_kind | type | affects_shift_drawer | shift_id |
|-------------|------|----------------------|----------|
| pos_sale, pos_prepayment | income | false | current shift |
| debt_repayment | income | false | current shift |
| warehouse_purchase, procurement_receipt | expense | **false** | **null** |
| defect_writeoff, supplier_return | expense/income | **false** | **null** |
| supplier_debt_payment | expense | **false** | **null** |
| shift_drawer_outflow | expense | **true** | current shift |

---

## 2. resolve_cashbox()

```python
from django.core.exceptions import ValidationError

POS_SOURCE_KINDS = {"pos_sale", "pos_prepayment", "debt_repayment"}
EXPENSE_VARIABLE_KINDS = {
    "warehouse_purchase",
    "procurement_receipt",
    "defect_writeoff",
    "supplier_debt_payment",
}
SUPPLIER_RETURN_CASH = "supplier_return"  # income on expense_variable


def resolve_cashbox(*, company, context: dict, source_kind: str) -> Cashbox:
    """
    context keys: branch_id, cashbox_role, shift_id, cashbox_id (legacy manual only)
    """
    if context.get("cashbox_id"):
        return Cashbox.objects.get(company=company, id=context["cashbox_id"], is_active=True)

    if source_kind in POS_SOURCE_KINDS:
        shift = _resolve_open_shift(company, context)
        if not shift or not shift.cashbox_id:
            raise ValidationError("Нет открытой смены для POS-операции")
        return shift.cashbox

    role = context.get("cashbox_role")
    if source_kind in EXPENSE_VARIABLE_KINDS or role == "expense_variable":
        return _get_unique_cashbox(company, role="expense_variable", branch_id=None)

    if role == "expense_fixed":
        return _get_unique_cashbox(company, role="expense_fixed", branch_id=None)

    if role in ("pos_main", "pos_branch"):
        branch_id = context.get("branch_id") if role == "pos_branch" else None
        return _get_unique_cashbox(company, role=role, branch_id=branch_id)

    raise ValidationError("Не удалось определить кассу для операции")
```

**Запрещено:** `Cashbox.objects.filter(company=company).first()` без role/shift.

---

## 3. expected_cash на смене

```python
from decimal import Decimal

def compute_shift_drawer_expected(shift) -> Decimal:
    opening = shift.opening_cash or Decimal("0")
    cash_sales = shift.cash_sales_total or Decimal("0")  # существующая семантика

    outflows = (
        Cashflow.objects.filter(
            shift_id=shift.id,
            type=CashflowType.EXPENSE,
            affects_shift_drawer=True,
            status__in=ACTIVE_STATUSES,
        ).aggregate(total=Sum("amount"))["total"]
        or Decimal("0")
    )

    return opening + cash_sales - outflows


def compute_non_drawer_expenses_total(shift) -> Decimal:
    """Закупки/расходы за период смены, не влияющие на ящик (отчёт)."""
    return (
        Cashflow.objects.filter(
            company_id=shift.company_id,
            created_at__gte=shift.opened_at,
            created_at__lte=shift.closed_at or timezone.now(),
            type=CashflowType.EXPENSE,
            affects_shift_drawer=False,
            source_kind__in=(
                "warehouse_purchase",
                "procurement_receipt",
                "defect_writeoff",
                "supplier_debt_payment",
            ),
        ).aggregate(total=Sum("amount"))["total"]
        or Decimal("0")
    )


def enrich_shift_reconciliation(shift, closing_cash=None) -> dict:
    drawer_expected = compute_shift_drawer_expected(shift)
    closing = closing_cash if closing_cash is not None else shift.closing_cash
    cash_diff = (closing or Decimal("0")) - drawer_expected if closing is not None else None

    return {
        "opening_cash": shift.opening_cash,
        "cash_sales_total": shift.cash_sales_total,
        "noncash_sales_total": shift.noncash_sales_total,
        "expected_cash": drawer_expected,  # после миграции = drawer_expected
        "drawer_expected_cash": drawer_expected,
        "ledger_expected_cash": drawer_expected,  # deprecated alias
        "non_drawer_expenses_total": compute_non_drawer_expenses_total(shift),
        "closing_cash": closing,
        "cash_diff": cash_diff,
        "payment_breakdown": build_payment_breakdown(shift) or [],
    }
```

### Реальный кейс (Test 2)

```
opening=50, cash_sales=33768, warehouse_purchases=54625 (expense_variable)
→ expected_cash = 33818
→ closing=8888 → cash_diff = -24930
```

---

## 4. Customer vs supplier debt

### Customer debt repayment (нам должны)

- Endpoint: `POST /main/clients/{id}/deals/{deal_id}/pay/` (существующий)
- FE шлёт: `branch_id`, `cashbox_role`, `shift_id` — **без cashbox_id**
- Backend:
  - `source_kind = debt_repayment`
  - `type = income`
  - `cashbox = shift.cashbox`
  - `shift_id = current shift`
  - Наличная часть → уже в `cash_sales_total` **или** отдельный cashflow income (не дублировать totals)

### Supplier debt payment (мы должны)

- Тот же pay endpoint для supplier deals **или** отдельный — главное разделить `source_kind`
- Backend:
  - `source_kind = supplier_debt_payment`
  - `type = expense`
  - `cashbox_role = expense_variable` → `resolve_cashbox`
  - `shift_id = null`
  - **Не** уменьшает `expected_cash` смены

FE уже различает: `DebtModal.tsx` — `buildExpenseVariableRouting()` для supplier, `buildPosRoutingFromUser()` для customer.

---

## 5. payment_breakdown

```python
SKIP_SALE_STATUSES = {"canceled", "cancelled", "refunded", "returned"}


def classify_sale_payment_method(sale) -> tuple[str, Decimal]:
    if sale.status.lower() in SKIP_SALE_STATUSES:
        return None, Decimal("0")

    payments = list(sale.payments.all())
    methods = {normalize_method(p.method) for p in payments if p.amount > 0}

    if len(methods) > 1:
        return "split", sale.total

    if sale.payment_method in ("debt", "deferred"):
        return "debt", sale.total

    method = normalize_method(sale.payment_method or (payments[0].method if payments else "cash"))
    return method, sale.total


def build_payment_breakdown(shift) -> list[dict]:
    rows = {}
    for sale in shift.sales.select_related().prefetch_related("payments"):
        method, amount = classify_sale_payment_method(sale)
        if not method:
            continue
        row = rows.setdefault(method, {"method": method, "label": LABELS[method], "count": 0, "amount": Decimal("0")})
        row["count"] += 1
        row["amount"] += amount

    result = sorted(rows.values(), key=lambda r: (-r["amount"], -r["count"]))
    return [
        {**r, "amount": f"{r['amount']:.2f}"} for r in result
    ]
```

**Никогда** не возвращать `payment_breakdown: null` — только `[]`.

---

## 6. Auto-cashflow + idempotency

```python
@transaction.atomic
def create_checkout_with_cashflows(...):
    sale = create_sale(...)
    for payment in cash_payments:
        Cashflow.objects.get_or_create(
            company=company,
            source_kind="pos_sale",
            source_id=sale.id,
            defaults={
                "cashbox": resolve_cashbox(...),
                "shift": shift,
                "amount": payment.amount,
                "type": "income",
                ...
            },
        )
```

Unique constraint: `(company_id, source_kind, source_id)` где `source_id` not null.

---

## 7. Django tests (минимум 8)

Файл: `construction/tests/test_shift_reconciliation.py`

```python
class ShiftReconciliationTests(TestCase):
    def test_basic_shift_expected_cash(self):
        # opening=50, cash_sales=33768, outflows=0 → 33818
        ...

    def test_warehouse_purchases_do_not_affect_expected_cash(self):
        # +54625 on expense_variable → expected still 33818
        ...

    def test_drawer_outflow_reduces_expected(self):
        # opening=5000, sales=10000, outflow=2000 → 13000
        ...

    def test_supplier_debt_payment_on_expense_variable(self):
        # payment 5000 → shift.expected unchanged
        ...

    def test_customer_debt_repayment_increases_shift_cash(self):
        # 5000 cash → cash_sales or income on shift cashbox
        ...

    def test_payment_breakdown_mixed_receipts(self):
        # 3 cash, 1 mbank, 1 split, 1 debt, 1 canceled → counts as spec
        ...

    def test_split_single_count(self):
        # cash 500 + mbank 1000 → split count=1 amount=1500
        ...

    def test_empty_shift_payment_breakdown(self):
        assert shift.payment_breakdown == []
```

---

## 8. Backward compatibility

| Изменение | Риск | Митигация |
|-----------|------|-----------|
| `expected_cash` formula | Старые смены показывали закупки в ящике | `ledger_expected_cash` + `non_drawer_expenses_total` в ответе |
| FE без cashbox_id | Legacy FE с `VITE_BE_CASHFLOWS=false` не создаст cashflow без явной кассы | Синхронный выкат BE auto-cashflows |
| `payment_breakdown: []` vs null | Старый FE мог не ожидать поле | Поле optional; FE fallback на sales aggregate |
| Supplier pay на POS-кассе (legacy data) | Исторические записи | Не переписывать; новые — только expense_variable |

---

## 9. Чек-лист выката

1. Миграция `Cashbox.role` + data fill  
2. `Cashflow.affects_shift_drawer` + backfill false для закупок  
3. `resolve_cashbox()` во всех auto-cashflow call sites  
4. Исправить `ShiftSerializer` / close action  
5. `payment_breakdown` в GET/close shift  
6. Разделить `debt_repayment` / `supplier_debt_payment`  
7. Включить `AUTO_CASHFLOWS=true` на staging  
8. FE: `VITE_BE_CASHFLOWS=true`  
9. Прогнать 8 tests + ручной кейс 50 / 33768 / 54625 / 8888
