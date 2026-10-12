import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { PasskeysComponent } from '../preferences/passkeys.component';
import { DeleteAccountComponent } from './delete-account.component';

@Component({
  selector: 'app-account',
  imports: [TranslatePipe, PasskeysComponent, DeleteAccountComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './account.component.html',
})
export class AccountComponent {}
