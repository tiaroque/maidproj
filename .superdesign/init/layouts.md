# Layouts — authenticated `/admin` shell

## AdminComponent

Path: `maid/src/app/components/admin/admin.component.html`

Centered column wrapping header + outlet.

```html
<div class="mx-auto w-full h-full max-w-7xl flex flex-col">
  <app-header-admin></app-header-admin>
  <router-outlet></router-outlet>
</div>
```

## HeaderAdmin (desktop render)

Path: `maid/src/app/components/admin/header-admin/header-admin.component.html`

Fixed 55px wine bar. Left: gold logo SVG + "clara" Albert Sans. Center: Material tab-nav with three 28px icons (profile person, users, chat). Right: ProfileIcon + language mini-fab + more_vert menu (dark theme, view profile, logout). Mobile: hamburger + full-screen menu.

```html
<header
  class="admin-chrome fixed top-0 right-0 left-0 z-50 block border-b border-white/10 bg-[#1c1016] text-[#fff6ee]"
>
  <div
    class="flex flex-nowrap items-center justify-between relative max-w-7xl w-full h-[55px] px-2 mx-auto"
  >
    <div
      class="flex justify-start items-center font-bold text-[#e8c97a] md:w-[220px]"
    >
      <svg class="w-15 h-15 pt-1 fill-current -translate-y-1">
        <use xlink:href="assets/images/logo4_no_fill.svg#Capa_1"></use>
      </svg>
      <div
        class="hidden sm:block text-2xl font-[Albert_Sans] font-semibold tracking-tighter text-[#e8c97a] -translate-x-2"
      >
        clara
      </div>
    </div>
    <nav mat-tab-nav-bar>
      <a mat-tab-link class="w-20">profile svg</a>
      <a mat-tab-link class="w-20">users svg</a>
      <a mat-tab-link class="w-20">chat svg</a>
    </nav>
    <div class="hidden md:flex items-center justify-end">
      <app-profile-icon></app-profile-icon>
      <app-language-selector></app-language-selector>
      <button mat-icon-button><mat-icon>more_vert</mat-icon></button>
    </div>
  </div>
</header>
```

## MainComponent (desktop three-pane)

Path: `maid/src/app/components/admin/main.component.html`

List route hides left nav translation on mobile; md always shows 286px. Content padded `md:pl-[286px] pt-[60px]`. Right rail `hidden lg:block min-w-[250px] mt-[65px]`.

```html
<main class="flex flex-nowrap relative min-w-[375px] min-h-full">
  <app-left-nav
    class="fixed top-[57px] md:translate-x-0 md:w-[286px] z-30 ease-in-out duration-300 border-r border-(--mat-sys-outline-variant) h-[calc(100%-55px)] bg-(--mat-sys-surface-container-low) overflow-x-hidden overflow-y-auto"
  ></app-left-nav>
  <div
    class="md:pl-[286px] w-full pt-[60px] border-0 md:border-r-2 border-color"
  >
    <router-outlet></router-outlet>
  </div>
  <app-right-content
    class="min-w-[250px] hidden lg:block ml-2 mt-[65px]"
  ></app-right-content>
</main>
```

## LeftNav

Path: `maid/src/app/components/admin/left-nav/left-nav.component.html`

Portal outlet fills grow. Footer: social icons (list/profile) or "messages encrypted" (chat).

## RightContent

Path: `maid/src/app/components/admin/right-content/right-content.component.html`

Card titled "People who joined recently" / latestUsers. Rows: 44px avatar, name+age, location, profession · photo count, Connect stroked button. Footer legal links + © 2025 clara.

## ProfileBase left settings portal

Path: `maid/src/app/components/admin/profile-base/profile-base.component.html`

Four full-width `matButton` rows (286px grid icon+label): Edit profile, Wishes, Photos, Preferences. Active uses `.menu-active` surface-variant background.
