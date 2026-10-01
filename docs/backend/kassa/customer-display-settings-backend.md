# Маркет — Настройки второго экрана покупателя

**Экраны фронта:**
- Настройки: `/crm/set` → вкладка **«Касса»**, блок «Второй экран покупателя» (`src/pages/settings/ui/Settings/tabs/CashierTab.tsx`)
- Сам экран: `/crm/market/customer-display` (`src/features/customer-display/ui/CustomerDisplayView.tsx`, открывается отдельным окном/на отдельном устройстве)

**Новый эндпоинт (требуется реализовать):**
- `GET /main/pos/customer-display-settings/` — прочитать настройки компании
- `PATCH /main/pos/customer-display-settings/` — сохранить (owner/admin)

**Фронт-клиент:** `src/shared/api/customerDisplaySettings.ts`, синк-слой `src/features/customer-display/model/settings.ts`
**Статус:** фронт готов и задеплоен «мягко» — пока эндпоинта нет, `GET`/`PATCH` падают тихо, экран и вкладка настроек работают как раньше — целиком на `localStorage` браузера, где их настроили.

---

## 1. Задача

Второй экран покупателя показывает приветствие, промо-слайды и тему (тёмная/светлая) вместо простоя, пока не идёт продажа. Сейчас эти 4 настройки (`enabled`, `welcome_text`, `theme`, `slides`) хранятся **только в `localStorage`** того браузера, где их однажды задал кассир.

**Проблема, в отличие от чисто личных настроек интерфейса ([ui-preferences-backend.md](../ui-preferences-backend.md)):** это не персональное предпочтение сотрудника, а **контент магазина** — он должен быть один и тот же на всех кассах компании. Сейчас же:

- если в магазине несколько касс/терминалов, промо-слайды и приветствие надо вручную повторить на каждом;
- если экран покупателя открывается на **отдельном устройстве** (второй монитор/планшет с собственным браузером, а не просто второе окно на том же ПК кассира) — у него своя `localStorage`, общий `BroadcastChannel`/`storage`-транспорт корзины (`src/features/customer-display/lib/channel.ts`, не трогаем — это живая передача корзины между окнами одного устройства, отдельный механизм) до него не достаёт, и экран показывает дефолтные приветствие/тему, а не то, что настроено.

**Решение:** настройки — **одна запись на компанию** (singleton, per-company, не per-user — как `MarketCashierSettings`, см. [cashier-settings.md](./cashier-settings.md)). `localStorage` остаётся мгновенным локальным кэшем/офлайн-фолбэком, источник правды — бэк.

---

## 2. Модель данных

Предлагаемая модель `MarketCustomerDisplaySettings`:

| Поле | Тип | Описание |
|---|---|---|
| `id` | uuid | PK |
| `company` | FK → Company, `unique=True` | Компания-владелец настроек |
| `enabled` | `BooleanField(default=False)` | Показывать ли кнопку/функцию второго экрана в кассе |
| `welcome_text` | `CharField(max_length=200, blank=True, default="")` | Текст приветствия в режиме простоя. Пусто = фронт подставляет дефолт `«Добро пожаловать в {компания}»` |
| `theme` | `CharField(choices=["dark","light"], default="dark")` | Тема экрана покупателя |
| `slides` | `JSONField(default=list)` | Промо-слайды, см. §3 за форматом |
| `updated_at` | datetime | Авто |
| `updated_by` | FK → User, null | Кто последний менял |

Запись создаётся лениво: при первом `GET`/`PATCH` — `get_or_create(company=request.user.company)`.

---

## 3. Контракт API

### 3.1 `GET /main/pos/customer-display-settings/`

Доступ: любой авторизованный сотрудник компании (экран открывает не только owner/admin).

**Ответ 200:**

```json
{
  "enabled": true,
  "welcome_text": "Добро пожаловать в NurMarket",
  "theme": "dark",
  "slides": [
    { "imageUrl": "https://.../promo1.jpg" },
    { "imageUrl": "https://.../promo2.jpg", "caption": "Скидка 20% на молочку" }
  ]
}
```

Когда ничего не настроено — дефолты из §2 (`enabled: false`, `theme: "dark"`, `welcome_text: ""`, `slides: []`), без ошибки.

### 3.2 `PATCH /main/pos/customer-display-settings/`

Доступ: **только `owner` и `admin`** своей компании (сама настройка кассы — как в §3.2 [cashier-settings.md](./cashier-settings.md)). Остальным — `403`.

**Запрос — фронт отправляет только изменённое поле (partial update), отдельным запросом на каждое поле:**

```json
{ "enabled": true }
```

```json
{ "theme": "light" }
```

```json
{ "welcome_text": "Добро пожаловать!" }
```

```json
{
  "slides": [
    { "imageUrl": "https://.../promo1.jpg" },
    { "imageUrl": "https://.../promo2.jpg", "caption": "Скидка 20%" }
  ]
}
```

**Валидация:**

| Поле | Правило | Ошибка |
|---|---|---|
| `enabled` | `bool` | `400 {"enabled": ["Must be a valid boolean."]}` |
| `theme` | `"dark"` \| `"light"` | `400 {"theme": ["Допустимы dark или light"]}` |
| `welcome_text` | строка, до 200 символов | `400 {"welcome_text": ["Слишком длинный текст"]}` |
| `slides` | массив объектов `{imageUrl: string, caption?: string}`, `imageUrl` — непустая строка (фронт не валидирует, что это именно URL картинки) | `400 {"slides": ["Каждый слайд должен содержать imageUrl"]}` |

**Ответ 200** — тот же объект, что и в `GET`.

---

## 4. Поведение фронта (что уже сделано)

1. **Первая отрисовка** — всегда мгновенно из `localStorage` (без сети), чтобы не мигало ни на вкладке настроек, ни на самом экране покупателя.
2. **Синхронизация с бэка** — при открытии **обоих** экранов (вкладка «Касса» и сам `/crm/market/customer-display`) фронт дополнительно, не блокируя рендер, дёргает `GET`. Если бэк ответил — перезаписывает `localStorage` и рассылает событие `customer-display-settings-synced` (слушают оба экрана и обновляются на лету, даже если уже открыты).
3. **Сохранение** — каждое изменение (тумблер, тема, `onBlur` у текста приветствия/слайдов) сразу пишет в `localStorage` (как раньше) **и** отправляет `PATCH` на бэк (fire-and-forget — ошибка сети молча игнорируется, значение уже применено локально).
4. **Бэка ещё нет** — `GET`/`PATCH` ловятся в `catch`, ничего не падает, всё работает как до этой доработки.
5. Живая передача корзины/оплаты на экран во время продажи (`BroadcastChannel` + `storage`-событие, `src/features/customer-display/lib/channel.ts`) — **отдельный механизм, этот контракт его не касается**. Он работает только в пределах одного браузера (окно кассы ↔ окно экрана на том же устройстве) и не должен идти через API — там реалтайм на каждый чек, не настройки.
6. Код: `src/shared/api/customerDisplaySettings.ts` (HTTP), `src/features/customer-display/model/settings.ts` (localStorage ↔ бэк мост + событие `customer-display-settings-synced`).

---

## 5. Чек-лист для бэкенда

- [ ] Модель `MarketCustomerDisplaySettings` (per-company, singleton), `get_or_create` по компании текущего пользователя
- [ ] `GET /main/pos/customer-display-settings/` — всем сотрудникам компании, дефолты если записи ещё нет
- [ ] `PATCH /main/pos/customer-display-settings/` — только owner/admin, валидация из §3.2
- [ ] Учесть, что `PATCH` может прилетать часто и по одному полю (кассир печатает текст приветствия → `onBlur`) — эндпоинт должен быть дешёвым
