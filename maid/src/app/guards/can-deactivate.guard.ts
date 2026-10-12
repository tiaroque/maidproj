import { CanDeactivateFn } from '@angular/router';
import { XprofileComponent } from '../components/admin/profile-base/xprofile/xprofile.component';

export const canDeactivateForm: CanDeactivateFn<XprofileComponent> = (
  component: XprofileComponent,
) => component.canExit();
