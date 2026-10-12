import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/browser';
import { AuthService } from './auth.service';

export class PasskeyCancelled extends Error {}

@Injectable({
  providedIn: 'root',
})
export class PasskeyService {
  private authService = inject(AuthService);

  async signIn() {
    const { challengeId, options } = await firstValueFrom(
      this.authService.passkeyLoginOptions(),
    );
    const assertion = await this.authenticate(options);
    await firstValueFrom(
      this.authService.passkeyLoginVerify(challengeId, assertion),
    );
  }

  async addPasskey() {
    const { challengeId, options } = await firstValueFrom(
      this.authService.passkeyRegisterOptions(),
    );
    const attestation = await this.register(options);
    await firstValueFrom(
      this.authService.passkeyRegisterVerify(challengeId, attestation),
    );
  }

  list() {
    return this.authService.listPasskeys();
  }

  remove(credentialId: string) {
    return this.authService.deletePasskey(credentialId);
  }

  private async authenticate(
    options: PublicKeyCredentialRequestOptionsJSON,
  ): Promise<AuthenticationResponseJSON> {
    const { startAuthentication, WebAuthnError } = await import(
      '@simplewebauthn/browser'
    );
    try {
      return await startAuthentication({ optionsJSON: options });
    } catch (error) {
      if (
        error instanceof WebAuthnError &&
        error.code === 'ERROR_CEREMONY_ABORTED'
      ) {
        throw new PasskeyCancelled();
      }
      throw error;
    }
  }

  private async register(
    options: PublicKeyCredentialCreationOptionsJSON,
  ): Promise<RegistrationResponseJSON> {
    const { startRegistration, WebAuthnError } = await import(
      '@simplewebauthn/browser'
    );
    try {
      return await startRegistration({ optionsJSON: options });
    } catch (error) {
      if (
        error instanceof WebAuthnError &&
        error.code === 'ERROR_CEREMONY_ABORTED'
      ) {
        throw new PasskeyCancelled();
      }
      throw error;
    }
  }
}
