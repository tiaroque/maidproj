import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { RecoverComponent } from './recover/recover.component';
import { UserManagementComponent } from './user-management/user-management.component';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: 'register',
    component: RegisterComponent,
  },
  {
    path: 'recover',
    component: RecoverComponent,
  },
  {
    path: 'manage',
    component: UserManagementComponent,
  },
];
