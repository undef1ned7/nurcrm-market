# Flutter: базовая настройка API (auth, окружения, права, WS, ошибки)

Фундаментальный документ — то, что предполагают все остальные доки в `docs/flutter/`, но нигде не описано целиком. Начинайте отсюда.

**Веб-код (эталон):**
- `src/shared/api/base.ts` — axios instance, base URL
- `src/shared/api/authInterceptors.ts` — refresh-flow
- `src/entities/user/api/auth.ts` — login/register/profile
- `src/entities/notification/lib/useNotificationsSocket.tsx` — WS

**Бэкенд-доки:** [../backend/README.md](../backend/README.md)

---

## Содержание

1. [Базовые URL и окружения](#1-базовые-url-и-окружения)
2. [Авторизация](#2-авторизация)
3. [Профиль, компания, права](#3-профиль-компания-права)
4. [Multi-tenancy](#4-multi-tenancy)
5. [WebSocket: подключение](#5-websocket-подключение)
6. [Формат ошибок](#6-формат-ошибок)
7. [Идемпотентность](#7-идемпотентность)
8. [Фиче-флаги клиента](#8-фиче-флаги-клиента)
9. [Общие соглашения](#9-общие-соглашения)
10. [Чеклист Flutter](#10-чеклист-flutter)

---

## 1. Базовые URL и окружения

Префикс: `{host}/api`, пути под `/main/...`, `/warehouse/...`, `/users/...`, `/construction/...`.
**Никогда** не использовать `/api/v1/`.

| Окружение | `API_URL` | `WS_URL` |
|-----------|-----------|----------|
| Prod | `https://app.nurcrm.kg/api` | `https://app.nurcrm.kg` |
| Staging | `https://stageapp.nurcrm.kg/api` | `https://stageapp.nurcrm.kg` |
| Local (веб dev) | `/api` (proxy → `http://localhost:8000`) | `window.location.host` |

WS URL строится из `WS_URL`: `http→ws`, `https→wss`, затем `/ws/notifications/?token=<accessToken>`.

На Flutter — build flavors / `--dart-define`, аналогично `VITE_API_URL`/`VITE_WS_API_URL` на вебе:

```dart
abstract class ApiConfig {
  static const apiBaseUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'https://app.nurcrm.kg/api',
  );
  static const wsBaseUrl = String.fromEnvironment(
    'WS_URL',
    defaultValue: 'https://app.nurcrm.kg',
  );

  static String buildWsUrl(String accessToken) {
    final scheme = wsBaseUrl.startsWith('https') ? 'wss' : 'ws';
    final host = wsBaseUrl.replaceFirst(RegExp(r'^https?'), '');
    return '$scheme$host/ws/notifications/?token=${Uri.encodeComponent(accessToken)}';
  }
}
```

HTTP-клиент: таймаут 20с, `Content-Type/Accept: application/json` по умолчанию (снять `Content-Type` для multipart-загрузок изображений/файлов).

---

## 2. Авторизация

JWT access/refresh пара.

```http
POST /users/auth/login/
{ "email": "...", "password": "..." }
```

```json
{ "access": "eyJ...", "refresh": "eyJ..." }
```

- `POST /users/auth/register/` — регистрация (staging может требовать `VITE_REGISTER_ACCESS_PASSWORD`-аналог, уточнить у бэка для мобильного флоу).
- `POST /users/auth/refresh/` `{ "refresh": "<token>" }` → `{ "access": "...", "refresh"?: "..." }`.

Каждый REST-запрос: `Authorization: Bearer <accessToken>`.

### 2.1 Refresh-интерцептор

Правила (как на вебе):

1. При `401` — поставить исходный запрос на паузу, вызвать refresh **один раз** (не параллельно на каждый упавший запрос — очередь).
2. Успех — повторить исходные запросы с новым `access`.
3. Неуспех (refresh истёк/невалиден, либо `refresh` отсутствует) — разлогинить, очистить токены, редирект на экран логина.

```dart
class AuthInterceptor {
  Future<Response> Function()? _refreshFuture;

  Future<Response> handle401(RequestOptions options, Dio dio, TokenStore store) async {
    _refreshFuture ??= () => _doRefresh(dio, store);
    try {
      await _refreshFuture!();
    } finally {
      _refreshFuture = null;
    }
    final newToken = store.accessToken;
    options.headers['Authorization'] = 'Bearer $newToken';
    return dio.fetch(options);
  }
}
```

### 2.2 WS-токен истёк

Сервер закрывает соединение кодом **4401**. Клиент: обновить `access` через refresh-flow и переподключиться (не показывать это пользователю как ошибку, если refresh успешен).

---

## 3. Профиль, компания, права

```http
GET /users/profile/
```

Ключевые поля: `role`, `role_display` (например `"Владелец"`), набор `can_view_*`/`can_edit_*` (пример: `can_view_cashbox`, `can_view_shifts`, `can_view_cashier`, `can_view_market_procurement`, `can_view_market_delete_cart_item`), `active_branch`, `branch`.

```http
GET /users/company/
```

Ключевые поля:

| Поле | Значение | Зачем |
|------|----------|-------|
| `sector.name` | напр. `"Магазин"` | ветвление UI/прав (`isMarketSector`) |
| `subscription_plan.name` | `"Старт"` и др. | **тариф «Старт» меняет денежную логику** — статус cashflow/POS по умолчанию `approved`, задействован legacy `/main/debts/` |
| `cashier_password` | строка | доступ только роли `owner` |
| `subscription_end_date` | date | тарифные алерты (7/3/1 дней) |
| `active_branch` | uuid? | fallback для routing касс |

```dart
bool canApproveDirectly(UserProfile profile, Company company) =>
    profile.role == 'owner' ||
    profile.role == 'admin' ||
    isMarketSector(company.sector?.name);

bool isStartPlan(Company company) => company.subscriptionPlan?.name == 'Старт';
```

Права проверять **на каждом экране**, который дергает money/warehouse операции — сервер тоже проверяет, но UI должен скрывать недоступное заранее (иначе пользователь получит `403`).

---

## 4. Multi-tenancy

Единственное измерение — `company`, извлекается сервером из токена (`request.user.company`). **Клиент никогда не передаёт `company_id` явно** ни в одном запросе. Доступ к чужим ресурсам (другая компания) → `404`, не `403` (сервер не раскрывает существование объекта).

Вторичное измерение — `branch_id` (филиал), опционально, используется только для маршрутизации касс POS (см. [cash-and-cashflows.md](./cash-and-cashflows.md)). Не путать с tenant-границей.

---

## 5. WebSocket: подключение

```
wss://{host}/ws/notifications/?token={accessToken}
```

- Ping каждые **25 секунд**: `{"action": "ping"}` → сервер отвечает `{"type": "pong"}`.
- Служебные сообщения (игнорировать в UI, кроме счётчика): `{"type":"connection_established"}`, `{"type":"pong"}`, `{"type":"unread_count","count":N}`.
- Реконнект: экспоненциальный backoff, при **4401** — сначала refresh access token, потом переподключение с новым `token`.
- Полный event-каталог и структура сообщений: [realtime-notifications.md](./realtime-notifications.md).

```dart
class NotificationsSocket {
  Timer? _pingTimer;
  int _retryAttempt = 0;

  void connect(String accessToken) {
    final url = ApiConfig.buildWsUrl(accessToken);
    // ... открыть WebSocketChannel(url)
    _pingTimer = Timer.periodic(const Duration(seconds: 25), (_) {
      channel.sink.add(jsonEncode({'action': 'ping'}));
    });
  }

  void onClose(int? code) {
    _pingTimer?.cancel();
    if (code == 4401) {
      // refresh access token, затем connect(newToken)
    } else {
      final delay = Duration(seconds: min(30, pow(2, _retryAttempt++).toInt()));
      Future.delayed(delay, () => connect(currentAccessToken));
    }
  }
}
```

---

## 6. Формат ошибок

DRF-стиль:

```json
{ "detail": "Не удалось определить кассу для операции", "code": "cashbox_unresolvable" }
```

Иногда — постатейные ошибки валидации (форма): `{ "sale_id": ["Это поле недопустимо."] }`. Обрабатывать оба варианта: если есть `detail` — показать его текстом, иначе — смэппить по ключам полей формы.

Известные коды (сквозные по всем money-эндпоинтам): `cashbox_unresolvable`, `shift_required`, `branch_cashbox_not_configured`, `cashbox_inactive`, `cashflow_already_exists` (409, считать успехом — идемпотентный повтор), `reject_cascade_failed`, `cashbox_has_open_shift`, `cashbox_has_pending`, `cashbox_role_required`. Полная таблица — в [cash-and-cashflows.md §17](./cash-and-cashflows.md#17-ошибки-api).

---

## 7. Идемпотентность

`idempotency_key` — UUIDv4, генерируется клиентом **один раз на пользовательское действие** и переиспользуется при ретраях того же действия (не при повторном нажатии кнопки пользователем ещё раз — это новое действие, новый ключ).

Обязателен на: оплата/возврат сделки (`.../deals/{id}/pay/`, `.../refund/`), возврат чека (`.../sales/{id}/return/`). Сервер уникально констрейнит по `(company, idempotency_key)` (возвраты) и `(company, source_kind, source_id[, type])` (авто-cashflows) — повторный запрос с тем же ключом возвращает тот же сохранённый ответ, а не ошибку и не дубль.

```dart
class IdempotencyKeyHolder {
  String? _key;
  String forAction() => _key ??= const Uuid().v4();
  void reset() => _key = null; // вызвать после успешного завершения действия
}
```

---

## 8. Фиче-флаги клиента

Аналог `VITE_*` на вебе — на Flutter reализовать как remote-config / build flavor:

| Флаг | Default (рекомендуемый) | Что делает |
|------|--------------------------|------------|
| `BE_CASHFLOWS` | `true` | Бэк сам создаёт cashflow внутри бизнес-транзакций — см. [cash-and-cashflows.md](./cash-and-cashflows.md) |
| `CASHFLOW_CHANGE_REQUESTS` | по готовности бэка на стенде | Запрос на правку/отмену подтверждённой записи кассы |
| `CASHBOX_DELETE` | `false` | Удаление/merge касс — контракт есть, бэк ещё не подтвердил реализацию |
| `CASHBOX_DEBT_ROLE` | `false` | Роль кассы `debt` — **не включать**, риск сломать сверку ящика смены (см. ниже) |
| `PRODUCT_BATCH_EXPIRY` | по готовности бэка | Партионный учёт сроков годности |

---

## 9. Общие соглашения

- Таймзона бизнеса: **Asia/Bishkek, UTC+6** для всех границ дат (отчёты, смены, сроки долга). Не конвертировать как UTC.
- Валюта: KGS («сом»); суммы в JSON — **decimal-строки**, `"1234.56"` (на вход иногда допустимы 3 знака, на выход всегда 2).
- Пустые/неприменимые routing-поля (`branch_id`, `cashbox_role`, `shift_id`) — **не включать** в JSON, а не слать `null`.
- Списки движения денег при отсутствии операций — всегда `"cashflows": []`, никогда `null`.
- Никогда не брать «первую кассу из списка» (`cashBoxes.first`) как дефолт для авто-операций — кассу выбирает бэкенд.

---

## 10. Чеклист Flutter

- [ ] Base URL / WS URL по build flavor (prod/staging/local), без хардкода
- [ ] Login/refresh/logout с очередью запросов на 401 (не параллельные refresh)
- [ ] WS: ping/pong 25с, реконнект с backoff, спец-обработка code 4401
- [ ] `GET /users/profile/` + `/users/company/` закешированы, права проверяются перед показом money/warehouse UI
- [ ] Тариф «Старт» — отдельная ветка статуса cashflow (`approved` по умолчанию)
- [ ] Ошибки: обработка `{detail, code}` и постатейной валидации формы
- [ ] `idempotency_key` — генерация на действие, сброс после успеха, переиспользование при ретрае
- [ ] Суммы — decimal-строки, не double в JSON
- [ ] Все даты/сроки — местное время Бишкека, не UTC

---

## Связанные документы

| Документ | Тема |
|----------|------|
| [cash-and-cashflows.md](./cash-and-cashflows.md) | Деньги, кассы, смены |
| [realtime-notifications.md](./realtime-notifications.md) | WS-события, уведомления |
| [products-catalog.md](./products-catalog.md) | Каталог товаров, фильтры, штрихкоды |
| [analytics.md](./analytics.md) | Отчёты и аналитика |
