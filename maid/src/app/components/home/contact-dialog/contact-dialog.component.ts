import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  apply,
  email,
  form,
  FormField,
  OneOrMany,
  required,
  schema,
  submit,
  ValidationError,
} from '@angular/forms/signals';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { TranslatePipe } from '@ngx-translate/core';
import { catchError, firstValueFrom, map, Observable, of } from 'rxjs';
import { UserService } from '../../../services/user.service';
import { hasKind } from '../../../forms/form-utils';

interface FormData {
  username: string;
  email: string;
  message: string;
}

// Opened lazily from the landing footer so the form and Material field code
// stay out of the home chunk.
@Component({
  selector: 'app-contact-dialog',
  templateUrl: './contact-dialog.component.html',
  imports: [
    TranslatePipe,
    FormsModule,
    FormField,
    MatDialogModule,
    MatButtonModule,
    MatFormField,
    MatLabel,
    MatError,
    MatInput,
    MatProgressSpinner,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<ContactDialogComponent>);
  private readonly userService = inject(UserService);
  protected readonly hasKind = hasKind;

  contactModel = signal<FormData>({
    username: '',
    email: '',
    message: '',
  });

  formSchema = schema<FormData>((schemaPath) => {
    required(schemaPath.username, { message: 'Name is required' });
    required(schemaPath.email, { message: 'Email is required' });
    email(schemaPath.email, { message: 'Email is invalid' });
    required(schemaPath.message, { message: 'Message is required' });
  });

  contactForm = form(this.contactModel, (schemaPath) => {
    apply(schemaPath, this.formSchema);
  });

  async onSubmit(event: Event) {
    event.preventDefault();
    await submit(this.contactForm, async (form) => {
      const credentials = this.contactForm();

      return await firstValueFrom(
        this.userService
          .saveContactUsMessage(
            credentials.value().username,
            credentials.value().email,
            credentials.value().message,
          )
          .pipe(
            map(() => {
              form().reset();
              form().value.set({
                message: '',
                username: '',
                email: '',
              });
              return null;
            }),
            catchError(
              (
                error: unknown,
              ): Observable<
                OneOrMany<ValidationError.WithOptionalFieldTree>
              > => {
                return of({
                  kind: 'server',
                  message:
                    error instanceof HttpErrorResponse
                      ? error.error.title
                      : 'An unexpected error occurred, please try again.',
                });
              },
            ),
          ),
      );
    });
  }

  closeForm() {
    this.contactForm().reset();
    this.dialogRef.close();
  }
}
