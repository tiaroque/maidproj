import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { ChatStore } from '../../../../services/admin/signals/store';

@Component({
  selector: 'app-conversation-filters',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, TranslatePipe],
  host: {
    role: 'group',
    'aria-label': 'Conversation filters',
  },
  template: `
    <div class="flex gap-1.5">
    <button
      type="button"
      class="cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold"
      [ngClass]="
        storeChat.favoritesOnly()
          ? 'border-(--mat-sys-outline-variant) text-(--mat-sys-on-surface-variant)'
          : 'border-[#7fd8c3] bg-[#7fd8c3]/15 text-(--mat-sys-on-surface)'
      "
      (click)="storeChat.setFavoritesOnly(false)"
    >
      {{ "chatScreen.all" | translate }}
    </button>
    <button
      type="button"
      class="cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold"
      [ngClass]="
        storeChat.favoritesOnly()
          ? 'border-[#7fd8c3] bg-[#7fd8c3]/15 text-(--mat-sys-on-surface)'
          : 'border-(--mat-sys-outline-variant) text-(--mat-sys-on-surface-variant)'
      "
      (click)="storeChat.setFavoritesOnly(true)"
    >
      {{ "chatScreen.favorites" | translate }}
    </button>
    </div>
  `,
})
export class ConversationFiltersComponent {
  readonly storeChat = inject(ChatStore);
}
