# Flutter: синхронизация настроек принтера и панель подписки

Два независимых контракта: (1) синхронизация ESC/POS-конфига принтера между устройствами и (2) экран «Тариф и оплата» / аккаунт компании. Оба — **не готовы на бэке**, статус ниже по каждому отдельно.

**Веб-экраны:**
- Настройки принтера: `/crm/pos-print-settings`
- Настройки компании (будущая вкладка «Тариф и оплата»): `/crm/settings`
- Карточка тарифа в Аналитике (план)

**Веб-код (эталон):**
- ESC/POS настройки — хранятся в `localStorage` (`escpos_*`), см. `src/features/print/*` (экспорт/импорт JSON уже есть)
- `subscription_plan.name` уже используется: `src/entities/company` / `isStartPlan` — влияет на дефолтный статус cashflow (см. [auth-and-api-basics.md](./auth-and-api-basics.md))

**Бэкенд-доки:**
- [pos-printer-config-sync.md](../backend/pos-printer-config-sync.md) — черновик, low priority
- [subscription-account-panel-backend.md](../backend/subscription-account-panel-backend.md) — ТЗ, фронта ещё нет

**Статус (2026-09-11):**

| Компонент | Статус |
|-----------|--------|
| **Printer config sync (бэк)** | 💡 Идея/черновик. Эндпоинтов нет. Сейчас всё в `localStorage` браузера кассы |
| **Printer config sync (веб)** | Экспорт/импорт JSON на `/crm/pos-print-settings` — единственный текущий способ переноса конфига |
| **Subscription panel (бэк)** | 📝 ТЗ отправлено, не реализовано. Часть полей уже отдаётся в `GET /users/company/` (`subscription_plan`, `end_date`) |
| **Subscription panel (веб)** | Фронта нет вообще — новый экран, строить с нуля |
| **Flutter** | По обоим разделам ждать реализацию бэка; ниже — контракт «когда появится» |

---

## Содержание

1. [Printer config sync](#1-printer-config-sync)
2. [Subscription / account panel](#2-subscription--account-panel)
3. [Чеклист Flutter](#3-чеклист-flutter)
4. [Связанные документы](#4-связанные-документы)

---

## 1. Printer config sync

**Важно — что НЕ входит в этот контракт:** само ESC/POS-печатание (открытие USB/Bluetooth/сетевого соединения с принтером, отправка байтов команд, работа с драйверами) — это hardware- и platform-specific код. На Flutter это отдельный печатный плагин/модуль (USB host API на Android, свой стек на iOS и т.д.), реализуемый независимо и не по единому контракту с вебом. Этот документ описывает **только синхронизацию настроек** — чтобы конфиг, выставленный на одном устройстве/кассе, был виден на других (тот же филиал, поддержка, восстановление после сброса браузера/переустановки).

### 1.1 Статус: черновик, не реализовано

Источник — [pos-printer-config-sync.md](../backend/pos-printer-config-sync.md), помечен **«low priority»**, эндпоинты — **предложение**, не подтверждены и не реализованы бэком. Приоритет ниже флагов цены и eKassa `item_id` (по тексту дока). Flutter пока реализует **только локальное хранение** конфига на устройстве +, при желании, экспорт/импорт JSON аналогично вебу; серверную синхронизацию добавить, когда эндпоинты появятся на бэке.

### 1.2 Проблема, которую решает синхронизация

- Конфиг (ширина бумаги, code page, VID/PID принтера, команда денежного ящика) теряется при смене ПК, профиля браузера/приложения, очистке данных.
- Нельзя удалённо посмотреть, что выставлено на конкретной кассе.
- Поддержка вынуждена просить кассира вручную пересылать JSON.

### 1.3 Модель конфига (черновик)

```json
{
  "device_key": "cashier-front-1",
  "settings": {
    "escpos_dpl": "384",
    "escpos_cpl": "42",
    "escpos_font": "B",
    "escpos_line": "22",
    "escpos_cp": "17",
    "escpos_drawer_enabled": "1",
    "escpos_drawer_when": "after",
    "escpos_drawer_cmd": "27, 112, 0, 25, 250"
  },
  "updated_at": "2026-08-24T12:00:00+06:00"
}
```

| Поле | Назначение |
|------|------------|
| `escpos_dpl` | dots per line — ширина бумаги в точках |
| `escpos_cpl` | characters per line |
| `escpos_font` | шрифт (`A`/`B`) |
| `escpos_line` | межстрочный интервал |
| `escpos_cp` | code page принтера |
| `escpos_drawer_enabled` | открывать денежный ящик (`"1"`/`"0"`) |
| `escpos_drawer_when` | когда слать команду ящика (`"after"` печати чека и т.п.) |
| `escpos_drawer_cmd` | байты ESC/POS команды ящика, через запятую |

`escpos_vid` / `escpos_pid` / `escpos_serial` (VID/PID/серийник USB-принтера) — **опциональны и предлагаются с осторожностью**: source doc прямо предупреждает, что привязка к железу одного устройства может мешать при синхронизации на другую машину (другой принтер/порт). Trade current device's VID/PID as **local-only**, не тащить в общий синхронизируемый конфиг без explicit override.

### 1.4 Эндпоинты (предложение, не подтверждено бэком)

| Метод | Путь | Назначение |
|-------|------|------------|
| `GET` | `/main/pos/printer-settings/?device_key=` | прочитать конфиг устройства |
| `PUT`/`PATCH` | `/main/pos/printer-settings/` | сохранить `{ device_key, settings }` |

Авторизация: сотрудник с доступом к кассе/настройкам компании. Это не платёжные секреты — только локальные print-предпочтения, но эндпоинт всё равно требует auth (не публичный).

### 1.5 Скоуп хранения: per-device, не per-company/per-cashbox

Конфиг скоупится **per-device** через `device_key` — генерируется клиентом один раз (аналог `localStorage`-флага или device fingerprint) и передаётся во всех запросах. Явно **не** per-company и не per-cashbox/register: несколько касс одного филиала с разными физическими принтерами не должны затирать конфиг друг друга. На Flutter `device_key` — стабильный идентификатор инсталляции (например, привязанный к устройству/приложению, персистентный между запусками, не пересоздаваемый на каждый рестарт).

### 1.6 Поведение клиента (когда API появится)

1. При открытии экрана настроек принтера — опционально подтянуть remote-конфиг и предложить «Применить с сервера» (не затирать локальный автоматически).
2. После локального «Сохранить» — писать и в локальное хранилище, и на API best-effort (ошибка синка не должна блокировать локальное сохранение).
3. Экспорт/импорт JSON (как на вебе) — оставить как offline-фолбэк независимо от наличия серверного синка.

### 1.7 Dart-заготовка модели

```dart
class PrinterSettings {
  final String deviceKey;
  final Map<String, String> settings; // escpos_* ключи как строки
  final DateTime? updatedAt;

  const PrinterSettings({
    required this.deviceKey,
    required this.settings,
    this.updatedAt,
  });
}
```

Печать самих байт на принтер (USB/Bluetooth/Wi-Fi transport, форматирование ESC/POS-команд для чека) — вне этого документа, реализуется платформенным print-модулем Flutter независимо от веб-эталона.

---

## 2. Subscription / account panel

### 2.1 Статус: ТЗ отправлено, фронта нет ни на вебе, ни в API

Источник — [subscription-account-panel-backend.md](../backend/subscription-account-panel-backend.md). Веб-фронта под этот экран **пока не существует** — это ТЗ для бэкенда под будущую вкладку «Тариф и оплата». Часть данных уже доступна сегодня через `GET /users/company/` (`subscription_plan`, `end_date`), остальное — новые поля, которые нужно добавить на бэке. Flutter реализует этот раздел **после** появления бэка; ниже — целевой контракт из ТЗ.

### 2.2 Уже доступно сегодня в `GET /users/company/`

| Поле | Тип | Комментарий |
|------|-----|-------------|
| `subscription_plan` | object | сейчас читается только `subscription_plan.name` (`"Старт"` / `"Стандарт"`) |
| `end_date` | date `YYYY-MM-DD` | до какой даты действует компания; из него сегодня считают «осталось дней» на клиенте |

⚠️ Расхождение именования: в бэкенд-доках то же поле встречается и как `company.subscription_end_date`. ТЗ предлагает каноническое имя `end_date` с алиасом на переходный период — на Flutter ориентироваться на `end_date` / `subscription.end_date`, если это подтвердится бэком.

### 2.3 Связь с `subscription_plan.name` из auth-and-api-basics.md

Поле `subscription_plan.name` уже задействовано в денежной логике — тариф «Старт» переключает cashflow/ручную кассу на статус `approved` по умолчанию (см. [auth-and-api-basics.md](./auth-and-api-basics.md#подписка) и матрицу статусов в [cash-and-cashflows.md](./cash-and-cashflows.md#43-статус-cashflow)). Этот раздел документа **не переобъясняет** тот механизм — только фиксирует, что новый `subscription.plan.code` (`"start"`/`"standard"`, машиночитаемый, взамен хрупкого сравнения строки `"Старт"`) из ТЗ ниже — потенциальная будущая замена текущей проверки по имени. Пока бэк не выкатил `code`, Flutter продолжает сравнивать по `name`, как в auth-and-api-basics.md.

### 2.4 Новые поля из ТЗ (ожидаются, не реализованы)

| Поле | Тип | Обязательность | Назначение |
|------|-----|-----------------|------------|
| `created_at` | datetime ISO 8601 (`+06:00`) | обязательно | «Аккаунт открыт …» — дата регистрации компании |
| `subscription.started_at` | date | желательно | начало текущего оплаченного периода |
| `subscription.days_left` | int (может быть ≤0) | обязательно | «Осталось N дней»; считает **сервер** (см. 2.6), чтобы совпадало с пуш-уведомлениями |
| `subscription.status` | enum: `active` \| `expiring_soon` \| `expired` \| `trial` \| `grace` \| `unknown` | обязательно | `expiring_soon` при `days_left <= 7`; `unknown` если `end_date` не задан |
| `subscription.plan` | object (см. 2.5) | обязательно | полные данные тарифа вместо только `name` |
| `subscription.auto_renew` | bool \| null | нет | автопродление; `null` — механизма нет, скрыть в UI |
| `subscription.is_trial` | bool | нет | пробный период |
| `subscription.next_payment_at` | date \| null | нет | дата следующего списания (обычно = `end_date`) |
| `subscription.last_payment` | object \| null (см. 2.5) | нет | последний платёж |
| `limits` | object | желательно | лимиты тарифа + текущее потребление (сотрудники/склады/товары) |

### 2.5 Объекты `plan` и `last_payment`

```json
{
  "plan": {
    "id": 2,
    "code": "standard",
    "name": "Стандарт",
    "price": "1990.00",
    "currency": "KGS",
    "period": "month",
    "description": "Полный доступ ко всем модулям"
  },
  "last_payment": {
    "amount": "1990.00",
    "currency": "KGS",
    "paid_at": "2026-08-15T10:30:00+06:00",
    "method": "manual",
    "period_start": "2026-08-15",
    "period_end": "2026-09-15"
  }
}
```

`plan.code` (`"start"` / `"standard"`) — новое обязательное поле по ТЗ, замена хрупкого сравнения по `name`. `last_payment` — `null`, если платежи нигде не фиксируются (поле опциональное).

### 2.6 Расчёт `days_left` — только на сервере

- TZ компании — Asia/Bishkek (UTC+6); сравнение по календарным датам, без времени.
- `days_left = (end_date − today_local).days`.
- `end_date` включительно: `end_date == today` → `days_left = 0`, `status = active`/`expiring_soon`.
- `end_date < today` → `days_left` отрицательный, `status = expired`.
- `end_date` пусто → `days_left = null`, `status = unknown`.
- Опционально `grace` — N дней после `end_date`, когда доступ ещё не отрезан.

Flutter может продублировать расчёт из `end_date` как локальный fallback, но ведущим считается серверный `days_left` (чтобы не разойтись с пуш-уведомлениями 7/3/1 дня).

### 2.7 `limits` — лимиты и потребление

```json
{
  "employees":  { "used": 3, "max": 3 },
  "warehouses": { "used": 1, "max": null },
  "products":   { "used": 812, "max": null }
}
```

`max: null` = без ограничения. Для тарифа «Старт» в секторе «Магазин» уже зашит лимит 3 сотрудника (`MARKET_START_EMPLOYEE_LIMIT`) — по ТЗ его предлагается отдавать данными, а не хардкодить на клиенте (сейчас хардкод есть и на вебе).

### 2.8 Варианты API (оба предложены в ТЗ, ни один не подтверждён)

**Вариант A** — расширить `GET /users/company/` полями `created_at`, `subscription{...}`, `limits{...}` (см. пример полного ответа в источнике §8). Закрывает карточку/бейджи без лишних запросов.

**Вариант B** — отдельный owner-only эндпоинт с историей платежей:

```http
GET /users/company/subscription/
```

```json
{
  "company_created_at": "2025-11-20T09:00:00+06:00",
  "status": "active",
  "days_left": 11,
  "started_at": "2026-08-15",
  "end_date": "2026-09-15",
  "next_payment_at": "2026-09-15",
  "auto_renew": null,
  "is_trial": false,
  "plan": { "id": 2, "code": "standard", "name": "Стандарт", "price": "1990.00", "currency": "KGS", "period": "month" },
  "limits": { "employees": { "used": 3, "max": 3 } },
  "payments": [
    { "amount": "1990.00", "currency": "KGS", "paid_at": "2026-08-15T10:30:00+06:00", "method": "manual", "period_start": "2026-08-15", "period_end": "2026-09-15" }
  ]
}
```

`payments` — пагинация DRF (`?page=`), сортировка `-paid_at`; пусто → `payments: []`. ТЗ рекомендует реализовать **оба** варианта: A — для карточки/бейджей, B — для полной панели с историей (не тащит платежи в общий ответ компании).

### 2.9 Доступ: финансовая часть — только owner

Аналогично утечке `cashier_password` (см. кассир-доки) — платёжные детали должны отдаваться **только владельцу**:

| Поле | owner | прочие сотрудники |
|------|-------|--------------------|
| `created_at`, `plan.name`, `plan.code`, `end_date`, `days_left`, `status` | ✅ | ✅ |
| `plan.price`, `currency`, `last_payment`, `next_payment_at`, `auto_renew`, история платежей | ✅ | ❌ (не отдавать в ответе вообще) |
| `limits` | ✅ | ✅ (можно) |

Flutter не должен полагаться на скрытие полей в UI — бэк не должен присылать финансовые поля не-owner’ам вообще; при их отсутствии в ответе — скрывать блок в интерфейсе, не показывать ошибку.

### 2.10 Edge-кейсы (из ТЗ)

| Ситуация | Ожидаемое поведение |
|----------|----------------------|
| `end_date` не задан | `days_left: null`, `status: "unknown"` → «срок не установлен» |
| `end_date` сегодня | `days_left: 0`, доступ есть, `status: "expiring_soon"` |
| `end_date` в прошлом | `days_left < 0`, `status: "expired"` |
| Пробный период | `is_trial: true`, `status: "trial"` |
| Смена тарифа в середине периода | `plan` = актуальный; опционально `plan_changes: [{ from, to, effective_at }]` |
| Компания без `subscription_plan` | `plan: null` → «тариф не назначен» |
| `created_at` отсутствует у старых компаний | `null` → «—» |

### 2.11 Dart-заготовка модели

```dart
enum SubscriptionStatus { active, expiringSoon, expired, trial, grace, unknown }

class SubscriptionPlan {
  final int id;
  final String code;   // "start" | "standard" — предпочитать над name
  final String name;   // "Старт" | "Стандарт" — для отображения
  final String? price;
  final String? currency;
  final String? period;
  final String? description;
}

class SubscriptionLastPayment {
  final String amount;
  final String currency;
  final DateTime paidAt;
  final String method;
  final DateTime periodStart;
  final DateTime periodEnd;
}

class CompanySubscription {
  final SubscriptionStatus status;
  final int? daysLeft;       // ведущее значение — с сервера
  final DateTime? startedAt;
  final DateTime? endDate;
  final DateTime? nextPaymentAt;
  final bool? autoRenew;
  final bool isTrial;
  final SubscriptionPlan? plan;
  final SubscriptionLastPayment? lastPayment; // null для не-owner или если платежей нет
}
```

---

## 3. Чеклист Flutter

### Printer config sync

- [ ] Не проектировать печать чеков (ESC/POS transport/байты) как часть общего бэкенд-контракта — отдельный платформенный печатный модуль
- [ ] Локальное хранение конфига на устройстве — работает уже сейчас, без бэка
- [ ] Экспорт/импорт JSON конфига — offline-фолбэк, аналог веба
- [ ] Не реализовывать серверный синк (`GET`/`PUT /main/pos/printer-settings/`), пока эндпоинты не подтверждены бэком — сейчас это черновик, low priority
- [ ] Когда появится API — стабильный persistent `device_key` на устройство, а не на company/cashbox
- [ ] VID/PID/серийник принтера — не синхронизировать как общий конфиг без явного контроля пользователя

### Subscription / account panel

- [ ] Пока нет нового API — использовать только существующие `subscription_plan.name` и `end_date` из `GET /users/company/`, как сегодня
- [ ] Не реализовывать экран «Тариф и оплата» до появления бэка/веб-эталона — на вебе UI тоже ещё нет
- [ ] Когда бэк выкатит `subscription.plan.code` — переходить на сравнение по `code`, оставляя `name` только для отображения; текущая проверка по `name` (см. auth-and-api-basics.md) остаётся рабочей до этого
- [ ] `days_left` — брать серверное значение, не только локальный расчёт из `end_date`
- [ ] Финансовые поля (`price`, `last_payment`, `auto_renew`, история платежей) — скрывать блок в UI, если бэк их не прислал (не-owner)
- [ ] `limits.max: null` — трактовать как «без ограничения», не как 0
- [ ] Обработать все edge-кейсы из §2.10 без падений/пустых экранов

---

## 4. Связанные документы

| Документ | Тема |
|----------|------|
| [auth-and-api-basics.md](./auth-and-api-basics.md) | Авторизация, профиль, `subscription_plan.name` и его влияние на статус cashflow |
| [cash-and-cashflows.md](./cash-and-cashflows.md) | Кассы, cashflows, тариф «Старт» → `status: approved` по умолчанию |
