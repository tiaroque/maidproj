import {
  Component,
  computed,
  inject,
  input,
  ChangeDetectionStrategy,
} from '@angular/core';
import { ChatStore } from '../../../../services/admin/signals/store';

@Component({
  selector: 'app-list-skeleton',
  imports: [],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './list-skeleton.component.html',
})
export class ListSkeletonComponent {
  numeOfTiles = input<number>(12);
  array = computed(() => Array.from(Array(this.numeOfTiles()).keys()));
  storeChat = inject(ChatStore);
  user = computed(() => this.storeChat.me());
}
