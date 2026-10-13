# Clara theme tokens

Framework: Angular 22 + Angular Material 3 (magenta-violet / custom M3) + Tailwind CSS v4.
CSS approach: Material CSS variables (`--mat-sys-*`) + Tailwind utilities + `src/styles/*.css`.

## Compact token summary

### Brand

- Product: clara — European maid / lifestyle matching (Client / Provider)
- Wordmark: Albert Sans, tracking-tighter, gold `#e8c97a`
- Body: Nunito
- Header chrome: wine `#1c1016` with cream text `#fff6ee`
- Accent / CTA: rose `#d46a86` / `rgb(180 74 106)`
- Logo: `maid/src/assets/images/logo4_no_fill.svg`

### Light (default admin)

| Token                    | Value                                                        |
| ------------------------ | ------------------------------------------------------------ |
| primary                  | rgb(180 74 106) / #b44a6a                                    |
| on-primary               | #fff                                                         |
| primary-container        | rgb(255 218 227)                                             |
| secondary                | rgb(107 45 69) / #6b2d45                                     |
| tertiary / gold          | rgb(184 148 74) / inverse-primary rgb(232 201 122) `#e8c97a` |
| background / surface     | rgb(255 246 238) `#fff6ee`                                   |
| on-surface               | rgb(32 18 24)                                                |
| on-surface-variant       | rgb(84 52 62)                                                |
| outline                  | rgb(132 96 106)                                              |
| outline-variant          | rgb(228 198 206)                                             |
| surface-container-low    | rgb(255 241 236)                                             |
| surface-container        | rgb(255 234 228)                                             |
| surface-variant          | rgb(244 220 226)                                             |
| inverse-surface / header | rgb(28 16 22) `#1c1016`                                      |
| CTA pink                 | `#d46a86`                                                    |

### Dark (`.unicorn-dark-theme`)

| Token                 | Value                 |
| --------------------- | --------------------- |
| primary               | rgb(232 201 122) gold |
| background / surface  | rgb(28 16 22)         |
| on-surface            | rgb(255 236 232)      |
| surface-container-low | rgb(36 20 28)         |

### Type

- Body / Material type scale: Nunito
- Logo wordmark: Albert Sans 24px semibold tracking-tighter
- Admin header height: 55px
- Left nav: 286px open / 64px collapsed (mobile overlay)

### Radius / elevation

- Dating cards: `rounded-3xl` + `shadow-lg`
- Form sections: `rounded-2xl` + 1px outline-variant
- Buttons / chips: Material rounded-full CTAs
- Chat bubbles: `rounded-xl` with grouped corner flattening

### Layout

- Admin max width: `max-w-7xl` centered
- Breakpoints: Tailwind defaults; left nav docks at `md` (768); right rail at `lg`
- Pattern: floral diamond repeat `bg-pattern.svg` opacity 0.2 on public/home; chat uses sports doodle `pattern-1.svg`

### Hardcoded admin chrome (material-overwrite.css)

```
.admin-chrome {
  --mat-sys-on-surface: #fff6ee;
  --mat-sys-on-surface-variant: #e8c97a;
  --mat-sys-primary: #e8c97a;
  --mat-tab-active-indicator-color: #d46a86;
}
header.admin-chrome: bg-[#1c1016] text-[#fff6ee] border-b border-white/10
Active tab gold; inactive cream 78% opacity
```

## Raw sources

### maid/src/styles/styles.css (tokens + Tailwind)

```css
@layer custom, material, material-overwrite, tailwind;
@import "@angular/material/prebuilt-themes/magenta-violet.css" layer(material);
@import "./m3_theme.css" layer(material);
@import "./material-overwrite.css" layer(material-overwrite);
@import "./animations.css" layer(custom);
@import "./main.css" layer(custom);
@import "tailwindcss";

.border-color {
  border-color: var(--mat-sys-surface-variant);
}
@custom-variant dark (&:is(.dark *));

@utility profile-img-border {
  @apply rounded-full border border-neutral-400 dark:border-neutral-500;
}
@utility auth-buttons {
  @apply relative tracking-wide disabled:opacity-50 rounded-full cursor-pointer font-semibold text-white bg-(--mat-sys-primary);
}
.floral-layer {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image: url("/assets/images/bg-pattern.svg");
  background-repeat: repeat;
  background-size: 220px;
  opacity: 0.2;
}
```

### maid/src/styles/m3_theme.css — :root light tokens

See compact table above. Full file at `maid/src/styles/m3_theme.css`.

### maid/src/styles/main.css

```css
html {
  font-family: Nunito, sans-serif !important;
  height: 100%;
}
.gradient {
  background: linear-gradient(120deg, #2a141c 0%, #6b2d45 50%, #d46a86 100%);
}
.chat-bg {
  background-image: url("../assets/images/chat/pattern-1.svg");
  background-repeat: repeat;
}
.menu-active {
  background-color: var(--mat-sys-surface-variant) !important;
}
```
