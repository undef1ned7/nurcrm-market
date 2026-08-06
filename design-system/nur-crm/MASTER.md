# Design System Master File — NUR CRM

> **LOGIC:** When building a page, first check `design-system/nur-crm/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> Otherwise strictly follow the rules below.

---

**Project:** NUR CRM  
**Updated:** 2026-08-04  
**Category:** B2B SaaS / CRM / POS / Warehouse ops  
**Style:** Data-dense minimal dashboard (Flat + Minimalism)  
**Design Dials:** Variance 3 | Motion 3 | Density 7  

---

## Brand (do not replace)

| Role | Hex | Token |
|------|-----|-------|
| Primary (brand yellow) | `#f7d74f` | `--nur-primary` |
| Primary dark (hover) | `#d4b800` | `--nur-primary-dark` |
| Primary darker (focus border) | `#cdb02e` | `--nur-primary-darker` |
| Primary soft | `rgba(247, 215, 79, 0.14)` | `--nur-primary-soft` |
| On primary (ink) | `#1a1505` | `--nur-primary-ink` |

**Never** put white text on primary yellow (contrast fails). Always use `--nur-primary-ink`.

---

## Neutrals & surfaces

| Role | Hex | Token |
|------|-----|-------|
| Background | `#f6f7f9` | `--nur-bg` |
| Surface | `#ffffff` | `--nur-surface` |
| Surface 2 | `#fbfcfd` | `--nur-surface-2` |
| Border | `#e9ecf1` | `--nur-border` |
| Border strong | `#dfe3ea` | `--nur-border-strong` |
| Text | `#0f172a` | `--nur-text` |
| Text secondary | `#475569` | `--nur-text-2` |
| Muted (AA) | `#64748b` | `--nur-muted` |

## Semantic

| Role | Hex | Soft |
|------|-----|------|
| Success | `#10b981` | `#ecfdf5` |
| Danger | `#ef4444` | `#fef2f2` |
| Warning | `#f59e0b` | `#fffbeb` |
| Info | `#3b82f6` | `#eff6ff` |

## Sidebar chrome

- Background: `#1a1a1a` → `#1f1f1f` gradient (`--nur-sidebar-bg`)
- Text: `#b3b3b3` / active `#ffffff`
- Active item: primary soft wash + primary accent bar

---

## Typography

- **Family:** Montserrat (brand) — single family across CRM
- **Title:** 22px / 700 / 1.25
- **Title sm:** 18px / 700
- **Body:** 14px / 500 / 1.45
- **Meta:** 13px / 500
- **Caption:** 12px / 600

Do not mix Inter/Roboto/Arial on CRM chrome (receipts/PDF may stay monospace).

---

## Spacing (4/8 rhythm)

`4 · 8 · 12 · 16 · 20 · 24 · 32 · 48` → `--nur-space-1` … `--nur-space-8`

## Radius

`8 / 12 / 16 / 20` → `--nur-radius-sm` / `--nur-radius` / `--nur-radius-lg` / `--nur-radius-xl`

## Shadows

Soft slate-tinted only — for elevation hierarchy, not decoration.

## Motion

Central tokens in `tokens.css` + utilities in `motion.css` (no Framer Motion / GSAP).

| Token | Value |
|-------|-------|
| `--nur-duration-fast` | 140ms |
| `--nur-duration` / `--nur-duration-normal` | 220ms |
| `--nur-duration-slow` | 340ms |
| `--nur-ease-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` |
| `--nur-ease-enter` | `cubic-bezier(0.16, 1, 0.3, 1)` |
| `--nur-ease-exit` | `cubic-bezier(0.4, 0, 1, 1)` |
| `--nur-ease-emphasized` | `cubic-bezier(0.2, 0, 0, 1)` |

Prefer `transform` + `opacity`. Route enter via `.nur-route-enter` (skipped on cashier/sell fullscreen). Respect `prefers-reduced-motion` in `global-ui.css` + `motion.css`. JS helpers: `@shared/lib/motion`, `AnimatedNumber`, `useDelayedLoading`.


## Controls

- Default height: **44px** (touch-friendly)
- Compact: **36px**
- Focus: 2px primary outline + soft, or 3px primary ring on inputs

---

## Component rules

### Buttons
- **Primary** — one per screen region; yellow + ink text
- **Secondary** — bordered surface
- **Ghost** — text/icon secondary actions
- **Danger** — destructive only
- Labels describe the action («Создать товар», not «ОК»)

### Page structure
1. PageHeader (title + optional subtitle + primary actions)
2. FilterBar (search / filters)
3. PagePanel / content
4. Empty / loading / error states

### Tables
- Use `.nur-table` + `.nur-table-wrap`
- Hover row highlight via primary-soft
- On ≤768px: prefer cards or horizontal scroll — never break layout

### Modals
- Max width 560 / 720 / 960
- Title + body + footer with primary right, secondary left/ghost
- Safe-area padding; close via overlay / Esc / button

### Anti-patterns
- Excessive glassmorphism / gradients
- Multiple primary buttons competing
- White-on-yellow
- Emoji as icons
- Hardcoded hex outside tokens
- Dark mode by default

---

## Implementation source of truth

`src/shared/styles/tokens.css` — CSS variables + `.nur-*` primitives.  
`src/shared/styles/motion.css` — keyframes, page/modal/card utilities.  
`src/shared/ui/page-shell` — PageShell, PageHeader, FilterBar, PagePanel, EmptyState, StatCard.  
`src/shared/styles/global-ui.css` — focus, reduced-motion, legacy bridges.
