## HeaderAdmin
- Source: `maid/src/app/components/admin/header-admin/header-admin.component.html`
- Category: layout
- Description: Fixed 55px wine header with gold logo/wordmark, three icon tabs (Profile / Search / Chat), user chip, language FAB, overflow menu
- Extractable props: activeTab (string, default: "search"), userName (string, default: "tiago"), lang (string, default: "EN")
- Hardcoded: logo SVG, sugrit Albert Sans gold wordmark, dark `#1c1016` bar, gold `#e8c97a`, rose indicator `#d46a86`

## LeftNav
- Source: `maid/src/app/components/admin/left-nav/left-nav.component.html`
- Category: layout
- Description: 286px left rail that hosts a portal (filters, settings, or conversations)
- Extractable props: menuOpen (boolean, default: true), context (string, default: "admin/list")
- Hardcoded: width 286, surface-container-low, follow-us social icons, encrypted footer

## RightContent
- Source: `maid/src/app/components/admin/right-content/right-content.component.html`
- Category: layout
- Description: Latest-users card list with Connect buttons, legal links, copyright
- Extractable props: none required
- Hardcoded: "People who joined recently", Connect stroked button, Privacy/Cookies/Terms

## DatingCard
- Source: `maid/src/app/components/admin/list/dating-card/dating-card.component.html`
- Category: basic
- Description: 3:4 photo card with gradient overlay, name/age, location, Chat CTA
- Extractable props: name, age, location, photoCount, profession
- Hardcoded: rounded-3xl, rose `#d46a86` full-width Chat button, camera badge

## ProfileIcon
- Source: `maid/src/app/components/admin/profile-icon/profile-icon.component.html`
- Category: basic
- Description: Compact name + 40px avatar used in header
- Extractable props: name (string), formatName (boolean)
- Hardcoded: 40px circular photo, truncated name
