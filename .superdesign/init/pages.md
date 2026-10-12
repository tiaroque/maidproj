## /:lang/admin/list (Search / discovery)
Entry: `maid/src/app/components/admin/list/list.component.html`
Dependencies:
- `maid/src/app/components/admin/admin.component.html`
  - `maid/src/app/components/admin/header-admin/header-admin.component.html`
    - `maid/src/app/components/admin/profile-icon/profile-icon.component.html`
    - `maid/src/app/shared/language-selector/language-selector.component.html`
- `maid/src/app/components/admin/main.component.html`
  - `maid/src/app/components/admin/left-nav/left-nav.component.html`
    - `maid/src/app/components/admin/left-nav/list-filtering/list-filtering.component.html`
      - location-search, nationality, languages (profile-base/xprofile)
  - `maid/src/app/components/admin/right-content/right-content.component.html`
    - `maid/src/app/shared/profile-avatar/profile-avatar.component.html`
- `maid/src/app/components/admin/list/filtering/filtering.component.html` (dreams chip search)
- `maid/src/app/components/admin/list/dating-card/dating-card.component.html`
- `maid/src/app/components/admin/list/list-skeleton/list-skeleton.component.html`
- `maid/src/app/shared/infinite-scroll/infinite-scroll.component.html`
- `maid/src/styles/styles.css`
- `maid/src/styles/m3_theme.css`
- `maid/src/styles/material-overwrite.css`
- `maid/src/styles/main.css`

## /:lang/admin/profile
Entry: `maid/src/app/components/admin/profile-base/xprofile/xprofile.component.html`
Dependencies:
- admin + header + main + left-nav + right-content (same shell)
- `maid/src/app/components/admin/profile-base/profile-base.component.html` (settings portal)
- details, birthdate, measurements, additional, location-search, nationality, languages
- `maid/src/app/shared/profile-avatar/profile-avatar.component.html`

## /:lang/admin/chat
Entry: `maid/src/app/components/admin/chat/chat.component.html`
Dependencies:
- admin + header + main + left-nav + right-content
- `maid/src/app/components/admin/left-nav/messages-list/messages-list.component.html`
- `maid/src/app/shared/profile-avatar/profile-avatar.component.html`

## /:lang/admin/upload
Entry: `maid/src/app/components/admin/profile-base/upload/upload.component.html`
Dependencies: profile-base shell + photo grid

## /:lang/admin/profile-view/:uid
Entry: `maid/src/app/components/admin/view-users-profile/view-users-profile.component.html`
Dependencies:
- admin header (no Main left nav)
- `maid/src/app/shared/profile-view/profile-view.component.html`
