# DESIGN.md — CEdPreneur

## Source of truth
**Figma is the source of truth for high-fidelity UI.** When implementing or revising a screen that has a corresponding Figma frame, read the frame via the Figma MCP (`get_design_context` / `get_metadata`) and use its real values — sizes, spacing, alignment, and visual hierarchy — instead of guessing from screenshots alone.

Figma's raw export uses absolute pixel positioning. **Always convert that into responsive Tailwind (flex/grid, relative sizing)** — never ship raw `position: absolute; left/top: Npx` layout copied straight from Figma.

## Brand colors (design tokens)
Defined in `app/globals.css` and exposed as Tailwind color names — always use the token name, never a raw new hex value in components:

- `purple` `#5721E0`, `purple-dark` `#4318B3`
- `orange` `#FF6E00`, `orange-light` `#FF9142`
- `pink` `#E81A63`
- `navy` `#14054D` — headings / primary body text
- `muted` `#5C6185` — secondary/supporting text
- `soft-gray` `#F5F4F1` — page background
- `soft-gray-dark` `#E0E0ED` — borders

Utility classes `.header-gradient` and `.brand-gradient-text` implement the purple → pink → orange gradient used across the brand.

## Layout & component style
- **Header**: gradient bar (purple → pink → orange) spanning the content area next to the sidebar (not full-bleed over the sidebar). Shows semester/mata kuliah text on the left and a rounded user-name chip on the right.
- **Sidebar**: white / soft-gray background, logo at the top, per-role menu items (each with an icon), active menu item highlighted in **orange**, logout link pinned to the bottom.
- **Cards**: white background, rounded corners, soft border (`soft-gray-dark`), gentle shadow. No harsh borders or heavy shadows.
- **Typography**: modern, clean sans-serif (Geist, via `app/layout.tsx`). Headings in `navy`, supporting text in `muted`.
- **Buttons**: `primary` = orange, `secondary` = purple, `outline`/`ghost` for lower-emphasis actions — see `components/ui/Button.tsx` for the variant map.

## Logo usage
The real brand logo **must** be read from the local file:

```
public/images/brand/logo-cedupreneur.png
```

referenced in code as `/images/brand/logo-cedupreneur.png` via `next/image`. Never recreate the logo from text/shapes/placeholder initials, and never use a remote/Figma-hosted asset URL for it — those URLs expire. Preserve the logo's real aspect ratio (don't stretch/squish it "gepeng").

## Working from a Figma link (workflow)
1. Call `get_design_context` with the frame's fileKey/nodeId to get real code + measurements; use `get_metadata` when you need to check whether a node actually has child layers (e.g. an icon) before assuming it does.
2. Extract the real relative proportions (widths, heights, gaps, font sizes) and translate them into Tailwind classes using flex/grid — don't copy absolute positioning.
3. Only download real vector/icon/illustration assets into `public/` when they're genuinely custom graphics. Simple shapes (circles, ellipses, dot grids) should be plain Tailwind `div`s (`rounded-full`, `bg-color/opacity`), not image files.
4. Map Figma colors onto the existing token names above — extend `globals.css` tokens if a genuinely new brand color is needed; don't hardcode hex in components.
5. User-supplied real logos/images go in `public/images/brand/` and are read via `next/image`.
