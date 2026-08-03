# NurCRM Market

Standalone CRM for the **Магазин** / **Цветочный магазин** sector extracted from NurFront.

## Stack

React 18 + Vite + Redux Toolkit + MUI + Tailwind 4 + SCSS

## Architecture (FSD)

```
src/
  app/        # providers, router, store composition, styles
  pages/      # route-level screens
  widgets/    # layout, sidebar, header, …
  features/   # auth, add-product, barcode, scales, kassa, …
  entities/   # product, sale, warehouse, client, … (model + api)
  shared/     # api client, ui kit, hooks, lib, assets
```

Aliases: `@app`, `@pages`, `@widgets`, `@features`, `@entities`, `@shared`.  
Layer rules: see [src/ARCHITECTURE.md](src/ARCHITECTURE.md). ESLint `boundaries/dependencies` enforces them.

## Setup

```bash
cd nur-market
npm install
cp .env.example .env.local   # optional local backend
npm run dev                  # http://localhost:3000
```

## Includes

- Login / AuthGuard / Logout
- Layout, Sidebar, Header, Settings
- Market POS (`/crm/market/cashier`), warehouse, clients, procurement, documents, analytics
- Shifts, Kassa, barcodes, scales, employees, branches, debts
- Public catalog `/catalog/:slug`
- `/crm/sell` redirects to `/crm/market/cashier`

## Build

```bash
npm run build   # output → build/
npm run lint
```
