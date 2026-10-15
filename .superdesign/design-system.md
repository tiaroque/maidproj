# Linpura design system

## Product
Linpura is a European home-cleaning marketplace. Two roles: **Cleaner** (offers services) and **Client** (household looking for help). Authenticated `/admin` is the member app: **Profile**, **Search**, **Chat**.

Jobs to be done:
- Clients find cleaners by service, hourly rate, availability (days + time of day) and area covered
- Cleaners publish services, rate, availability, areas covered and short announcements
- Clients post job requests; both sides agree details in chat

Key pages: `/admin/list` (search), `/admin/profile` (edit: details, date of birth, services & availability, about), `/admin/offer-dreams` (announcements / job requests), `/admin/chat`, `/admin/upload`, `/admin/profile-view/:uid`.

## Brand
- Wordmark: **linpura** in Albert Sans, semibold, tracking-tighter, mint `#7fd8c3` on dark
- Logo: still the old heart-ribbon mark (`logo4_no_fill.svg`) — to be replaced
- Body: **Nunito**
- Voice: warm, practical, trustworthy

## Color (do not invent others)
Palette for a home-cleaning marketplace: fresh, clean, trustworthy.
Light:
- Header deep spruce `#0f2a2e`
- Header text fresh white `#f6fbfa`
- Mint accent `#7fd8c3` (wordmark, highlights on dark)
- Teal primary `rgb(15 118 110)` / CTA `#0f9488`, hover `#0b5e57`
- Deep teal secondary `#155e63`
- Warm amber tertiary `rgb(176 122 16)` (ratings, small highlights only)
- Page `#f3f8f7` / surface-container-low `#f7fbfa`
- Outline-variant `rgb(200 214 211)`
- On-surface `rgb(30 46 48)`, on-surface-variant `rgb(84 102 101)`

Dark: mint primary on `#0d1517` spruce surfaces.

Tokens: `--sg-ink/deep/teal/teal-deep/mint` (public.css), `--ad-deep/teal/teal-deep/mint` (admin.css), `--mat-sys-*` (m3_theme.css).
Background pattern: corner arcs + sparkles (no hearts). No neon, no purple, no pink/wine.

## Type
- UI / forms / chat: Nunito 14–16
- Page titles: Nunito 20 semibold
- Wordmark only: Albert Sans 24 tracking-tighter
- Card names: Nunito 20 semibold white on photo

## Layout DNA (current)
- Fixed 55px header, max-w-7xl
- 286px left rail (filters / settings / inbox)
- Main content with 60px top offset
- Right rail (~250px) “People who joined recently” from `lg`
- Cards `rounded-3xl`; form sections `rounded-2xl` bordered
- Material 3 fields, chips, sliders, expansion panels

## Motion
- 300ms ease-in-out for nav width
- Card photo scale 1.05 / 500ms
- Chat bubble fadeIn

## Components
- Header: wine bar, gold logo+wordmark, 3 icon tabs with rose underline on active
- Member card: 3:4 photo, name + hourly-rate pill, location, up to 3 service tags, latest announcement, full-width Connect
- Left settings: icon+label rows, active surface-variant tint
- Chat: WhatsApp-like grouped bubbles, sports doodle empty canvas, encrypted footnote
