import { email, maxLength, minLength, required, schema, validate } from '@angular/forms/signals';

export interface CredentialsModel {
  email: string;
  pass: string;
}

export function defaultCredentials(): CredentialsModel {
  return {
    email: '',
    pass: '',
  };
}

export const credentialsSchema = schema<CredentialsModel>((p) => {
  required(p.email);
  email(p.email);
  maxLength(p.email, 35);
  required(p.pass);
  minLength(p.pass, 6);
  maxLength(p.pass, 55);
});

export function passwordRuleStates(password: string) {
  return [
    {
      id: 'length',
      met: password.length >= 6,
      key: 'auth.passwordMinLength',
    },
    {
      id: 'uppercase',
      met: /[A-Z]/.test(password),
      key: 'auth.passwordUppercase',
    },
    {
      id: 'lowercase',
      met: /[a-z]/.test(password),
      key: 'auth.passwordLowercase',
    },
    {
      id: 'number',
      met: /\d/.test(password),
      key: 'auth.passwordNumber',
    },
    {
      id: 'special',
      met: /[^A-Za-z0-9]/.test(password),
      key: 'auth.passwordSpecial',
    },
  ];
}

const passwordStrength = ({ value }: { value: () => string }) => {
  const password = value();
  const errors = [
    password && !/[A-Z]/.test(password) ? { kind: 'uppercase' } : null,
    password && !/[a-z]/.test(password) ? { kind: 'lowercase' } : null,
    password && !/\d/.test(password) ? { kind: 'number' } : null,
    password && !/[^A-Za-z0-9]/.test(password) ? { kind: 'special' } : null,
  ].filter((error) => error !== null);
  return errors.length ? errors : null;
};

export const registerCredentialsSchema = schema<CredentialsModel>((p) => {
  required(p.email);
  email(p.email);
  maxLength(p.email, 35);
  required(p.pass);
  minLength(p.pass, 6);
  maxLength(p.pass, 55);
  validate(p.pass, passwordStrength);
});

export const strongPasswordSchema = schema<{ pass: string }>((p) => {
  required(p.pass);
  minLength(p.pass, 6);
  maxLength(p.pass, 55);
  validate(p.pass, passwordStrength);
});
