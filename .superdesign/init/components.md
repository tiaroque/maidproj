# Shared layouts (admin)

Angular Material + Tailwind. No shadcn. Shared primitives live under `maid/src/app/shared/` and admin-specific under `maid/src/app/components/admin/`.

## DatingCard
Path: `maid/src/app/components/admin/list/dating-card/dating-card.component.html`

Photo-forward 3:4 member card. Overlay gradient, name+age, location, optional profession, rose Chat CTA.

```html
<div class="rounded-3xl shadow-lg overflow-hidden relative aspect-3/4 bg-[#2a1820] group">
  <div class="absolute inset-0">
    <img class="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
    <div class="absolute inset-0 bg-linear-to-t from-black/90 via-black/45 to-transparent"></div>
  </div>
  <div class="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">camera + count</div>
  <div class="absolute inset-x-0 bottom-0 p-4 text-white">
    <p class="text-xl font-semibold truncate">Name, age</p>
    <p class="text-sm opacity-80 truncate">Location (CC)</p>
    <button mat-flat-button class="w-full! rounded-full! bg-[#d46a86]! text-white!">Chat</button>
  </div>
</div>
```

## ProfileIcon
Path: `maid/src/app/components/admin/profile-icon/profile-icon.component.html`

```html
<div class="flex flex-row-reverse md:flex-row md:justify-start items-center px-4 md:px-0">
  <div class="mx-2"><h3 class="body-2">{{ name }}</h3></div>
  <img class="w-10 h-10 profile-img-border object-cover" />
</div>
```

## ProfileAvatar
Path: `maid/src/app/shared/profile-avatar/profile-avatar.component.html`

```html
<svg class="profile-img-border fill-current text-black/30 dark:text-white/40 aspect-square w-full">
  <use href="assets/images/female-avatar-svgrepo-com.svg#Capa_1"></use>
</svg>
```

## LanguageSelector
Path: `maid/src/app/shared/language-selector/language-selector.component.html`

```html
<button mat-mini-fab disableRipple [matMenuTriggerFor]="menu">{{ selectedLanguage() | uppercase }}</button>
```
Pink circular FAB in header (EN).

## Angular Material primitives used on admin
Button (icon / stroked / flat / fab), Tabs (tab-nav-bar), Menu, SlideToggle, FormField, Autocomplete, Chip, ChipGrid, Slider, Accordion/ExpansionPanel, ProgressBar, ProgressSpinner, Badge, Dialog, Tooltip, Icon.
