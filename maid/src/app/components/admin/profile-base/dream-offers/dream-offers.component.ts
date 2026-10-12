import {
  Component,
  inject,
  input,
  OnInit,
  signal,
  ChangeDetectionStrategy,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { form, FormField, maxLength } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { A11yModule } from '@angular/cdk/a11y';
import { hasKind } from '../../../../forms/form-utils';
import { UserDetailsObject } from '../../../../services/admin/interfaces/user.interface';
import { UserService } from '../../../../services/user.service';
import { UtilsService } from '../../../../services/utils.service';
import { tap } from 'rxjs';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ChatStore } from '../../../../services/admin/signals/store';
import { AuthService } from '../../../../services/auth.service';

@Component({
  selector: 'app-dream-offers',
  imports: [
    A11yModule,
    MatButtonModule,
    MatDialogModule,
    MatFormField,
    MatLabel,
    MatInput,
    MatProgressSpinner,
    FormField,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dream-offers.component.html',
})
export class DreamOffersComponent implements OnInit {
  private usersService = inject(UserService);
  private dialog = inject(MatDialog);
  protected utilsService = inject(UtilsService);

  readonly userProfile = input<UserDetailsObject>();
  translateService = inject(TranslateService);
  loading = signal(true);

  readonly addOfferDialog = viewChild.required<TemplateRef<unknown>>(
    'addOfferDialog',
  );

  readonly storeChat = inject(ChatStore);
  readonly authService = inject(AuthService);

  readonly offersKeywords = signal<string[]>([]);

  readonly offerModel = signal({ offer: '' });
  readonly offerForm = form(this.offerModel, (p) => {
    maxLength(p.offer, 80);
  });
  protected readonly hasKind = hasKind;
  protected readonly offerMaxLength = 80;

  ngOnInit(): void {
    this.getDetailsData();
  }

  openAdd() {
    this.offerForm.offer().value.set('');
    this.offerForm().reset();
    this.dialog.open(this.addOfferDialog(), {
      hasBackdrop: true,
      width: '28rem',
      maxWidth: 'calc(100vw - 2rem)',
    });
  }

  confirmAdd() {
    const value = this.offerForm.offer().value().trim();
    if (!this.canSubmitOffer(value)) {
      return;
    }

    const alreadyListed = this.offersKeywords().some(
      (keyword) => keyword.toLocaleLowerCase() === value.toLocaleLowerCase(),
    );
    if (alreadyListed) {
      this.dialog.closeAll();
      return;
    }

    this.offersKeywords.update((keywords) => [...keywords, value]);
    this.submit(value);
    this.dialog.closeAll();
  }

  removeReactiveKeyword(keyword: string) {
    const close = this.translateService.instant('buttonClose');
    const removed = this.translateService.instant('offer.removed');
    this.usersService.deleteOffer(keyword).subscribe(
      (val) => {
        console.log('valid');
        this.utilsService.alert(removed, close);
      },
      (err) => {
        const removedError = this.translateService.instant('offer.removeError');
        this.utilsService.alert(removedError, 'Ok');
      },
    );

    this.offersKeywords.update((keywords) => {
      const index = keywords.indexOf(keyword);
      if (index < 0) {
        return keywords;
      }

      keywords.splice(index, 1);
      return [...keywords];
    });
  }

  private canSubmitOffer(value: string): boolean {
    if (!value || !this.offerForm().valid()) {
      this.offerForm.offer().markAsTouched();
      return false;
    }
    return true;
  }

  submit(offer: string) {
    const close = this.translateService.instant('buttonClose');
    const saved = this.translateService.instant('offer.saved');
    this.usersService.createDreamOffer(offer.toLocaleLowerCase()).subscribe(
      (val) => {
        console.log('valid');
        this.utilsService.alert(saved, close);
      },
      (err) => {
        const saveError = this.translateService.instant('offer.saveError');
        this.utilsService.alert(saveError, close);
      },
    );
  }

  getDetailsData() {
    this.loading.set(true);

    this.authService
      .getUser()
      .pipe(
        tap((user) => this.storeChat.addMeUser(user)),
      )
      .subscribe({
        next: (result: UserDetailsObject) => {
          this.offersKeywords.update((keywords) => {
            return result.user.offers
              ? result.user.offers.map((item) => item.offer)
              : [];
          });
        },
        complete: () => this.loading.set(false),
      });
  }
}
