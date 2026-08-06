# Page overrides — Cashier / POS

> Overrides `design-system/nur-crm/MASTER.md` for the fullscreen cashier workspace.

## Goal
High-speed retail checkout: scan → find → add → pay in minimal taps.

## Layout
- Fullscreen (`App--fullscreen`) — no CRM sidebar chrome during sale
- **Products left (~62%)**, **Cart right (~38%)**, resizable splitter
- Sticky search under carts bar; product grid fills remaining height
- Cart: sticky header + scrollable lines + sticky totals/pay footer

## Density & touch
- Density 9: compact product cards, large tap targets (≥44px)
- Search input ≥48px tall (barcode + keyboard)
- Product cards: name + price dominant; stock secondary
- `touch-action: manipulation` on interactive controls

## Hierarchy
1. Search / barcode (always visible)
2. Product grid (primary browse surface)
3. Cart lines + qty steppers
4. **Оплатить** — single primary CTA (brand yellow + ink)
5. Close shift = danger, secondary modes (Розница/Опт) = segmented

## Brand
Keep `--nur-primary` yellow; never white-on-yellow.

## Anti-patterns
- Decorative cards / glass clutter in cart
- Competing primary buttons
- Tiny qty hit areas
- Hidden pay CTA below fold
