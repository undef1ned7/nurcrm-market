# NurCRM Market

Standalone CRM for the **Магазин** / **Цветочный магазин** sector extracted from NurFront.

## Stack

React 18 + Vite + Redux Toolkit + MUI + Tailwind 4 + SCSS

## Setup

```bash
cd nur-market
npm install
cp .env.example .env.local   # optional local backend
npm run dev                  # http://localhost:3001
```

## Includes

- Login / AuthGuard / Logout
- Layout, Sidebar, Header, Settings
- Market POS (`/crm/market/cashier`), warehouse, clients, procurement, documents, analytics
- Shifts, Kassa, barcodes, scales, employees, branches, debts
- Public catalog `/catalog/:slug`

## Build

```bash
npm run build   # output → build/
```
