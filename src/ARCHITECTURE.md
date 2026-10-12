# FSD Architecture (nur-market)

Слои (сверху вниз): `app` → `pages` → `widgets` → `features` → `entities` → `shared`.

## Правила импортов

- Импорт только вниз по слоям.
- Между слайсами одного слоя — только через Public API (`index.js`).
- Aliases: `@app`, `@pages`, `@widgets`, `@features`, `@entities`, `@shared`, `@`.

## Сегменты слайса

`ui/`, `model/`, `api/`, `lib/`, `config/` + `index.js`.
