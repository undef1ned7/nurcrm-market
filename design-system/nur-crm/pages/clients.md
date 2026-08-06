# Page overrides — Clients / Counterparties

> Overrides `design-system/nur-crm/MASTER.md` for this page.

## Structure
1. PageHeader — «Контрагенты» + primary «Создать контрагента»
2. Type tabs (Клиенты / Поставщики) — segmented, active = brand yellow + ink text
3. Optional agent filter
4. Balance / period bar (KPI context)
5. Search FilterBar
6. Table (desktop) / Cards (mobile)
7. Pagination
8. EmptyState when no results

## Density
Slightly denser tables (`--density` ~7). Row hover = `--nur-primary-soft`.

## Mobile
- Tabs scroll horizontally
- Cards instead of wide tables where implemented
- Primary action full-width under 390px via PageShell rules
