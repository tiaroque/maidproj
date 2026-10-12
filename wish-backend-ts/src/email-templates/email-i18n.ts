export const emailLanguages = ["en", "pt", "de", "fr", "it", "es", "nl"] as const;

export type EmailLang = (typeof emailLanguages)[number];

export type EmailCopy = {
  subject: string;
  title: string;
  preheader: string;
  heading: string;
  greeting: string;
  body: string;
  cta: string;
  fallback: string;
  expiry: string;
};

const isEmailLang = (value: string): value is EmailLang =>
  emailLanguages.includes(value as EmailLang);

export const resolveEmailLang = (lang?: string): EmailLang => {
  const normalized = String(lang || "en")
    .toLowerCase()
    .split(/[-_]/)[0];
  return isEmailLang(normalized) ? normalized : "en";
};

const verificationCopy: Record<EmailLang, EmailCopy> = {
  en: {
    subject: "Confirm your Clara account",
    title: "Confirm your Clara account",
    preheader:
      "Confirm your Clara account to get started. This link expires in 1 hour.",
    heading: "Confirm your email",
    greeting: "Hi --NAME--,",
    body: "Welcome to Clara. Please confirm your email address to finish creating your account and start using the app.",
    cta: "Confirm email",
    fallback:
      "If the button does not work, copy and paste this link into your browser:",
    expiry:
      "This link expires in 1 hour. If you did not create a Clara account, you can ignore this email.",
  },
  pt: {
    subject: "Confirme a sua conta Clara",
    title: "Confirme a sua conta Clara",
    preheader:
      "Confirme a sua conta Clara para começar. Este link expira dentro de 1 hora.",
    heading: "Confirme o seu email",
    greeting: "Olá --NAME--,",
    body: "Bem-vindo ao Clara. Confirme o seu endereço de email para concluir a criação da conta e começar a usar a app.",
    cta: "Confirmar email",
    fallback:
      "Se o botão não funcionar, copie e cole este link no navegador:",
    expiry:
      "Este link expira dentro de 1 hora. Se não criou uma conta Clara, pode ignorar este email.",
  },
  de: {
    subject: "Bestätigen Sie Ihr Clara-Konto",
    title: "Bestätigen Sie Ihr Clara-Konto",
    preheader:
      "Bestätigen Sie Ihr Clara-Konto, um loszulegen. Dieser Link läuft in 1 Stunde ab.",
    heading: "E-Mail bestätigen",
    greeting: "Hallo --NAME--,",
    body: "Willkommen bei Clara. Bitte bestätigen Sie Ihre E-Mail-Adresse, um die Kontoerstellung abzuschließen und die App zu nutzen.",
    cta: "E-Mail bestätigen",
    fallback:
      "Wenn die Schaltfläche nicht funktioniert, kopieren Sie diesen Link und fügen Sie ihn in Ihren Browser ein:",
    expiry:
      "Dieser Link läuft in 1 Stunde ab. Wenn Sie kein Clara-Konto erstellt haben, können Sie diese E-Mail ignorieren.",
  },
  fr: {
    subject: "Confirmez votre compte Clara",
    title: "Confirmez votre compte Clara",
    preheader:
      "Confirmez votre compte Clara pour commencer. Ce lien expire dans 1 heure.",
    heading: "Confirmez votre email",
    greeting: "Bonjour --NAME--,",
    body: "Bienvenue sur Clara. Veuillez confirmer votre adresse email pour terminer la création de votre compte et commencer à utiliser l'application.",
    cta: "Confirmer l'email",
    fallback:
      "Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :",
    expiry:
      "Ce lien expire dans 1 heure. Si vous n'avez pas créé de compte Clara, vous pouvez ignorer cet email.",
  },
  it: {
    subject: "Conferma il tuo account Clara",
    title: "Conferma il tuo account Clara",
    preheader:
      "Conferma il tuo account Clara per iniziare. Questo link scade tra 1 ora.",
    heading: "Conferma la tua email",
    greeting: "Ciao --NAME--,",
    body: "Benvenuto su Clara. Conferma il tuo indirizzo email per completare la creazione dell'account e iniziare a usare l'app.",
    cta: "Conferma email",
    fallback:
      "Se il pulsante non funziona, copia e incolla questo link nel browser:",
    expiry:
      "Questo link scade tra 1 ora. Se non hai creato un account Clara, puoi ignorare questa email.",
  },
  es: {
    subject: "Confirma tu cuenta de Clara",
    title: "Confirma tu cuenta de Clara",
    preheader:
      "Confirma tu cuenta de Clara para empezar. Este enlace caduca en 1 hora.",
    heading: "Confirma tu correo",
    greeting: "Hola --NAME--,",
    body: "Bienvenido a Clara. Confirma tu dirección de correo para terminar de crear tu cuenta y empezar a usar la app.",
    cta: "Confirmar correo",
    fallback:
      "Si el botón no funciona, copia y pega este enlace en el navegador:",
    expiry:
      "Este enlace caduca en 1 hora. Si no has creado una cuenta de Clara, puedes ignorar este correo.",
  },
  nl: {
    subject: "Bevestig je Clara-account",
    title: "Bevestig je Clara-account",
    preheader:
      "Bevestig je Clara-account om te beginnen. Deze link verloopt over 1 uur.",
    heading: "Bevestig je e-mailadres",
    greeting: "Hoi --NAME--,",
    body: "Welkom bij Clara. Bevestig je e-mailadres om je account aan te maken en de app te gaan gebruiken.",
    cta: "E-mailadres bevestigen",
    fallback:
      "Werkt de knop niet? Kopieer deze link en plak hem in je browser:",
    expiry:
      "Deze link verloopt over 1 uur. Heb je geen Clara-account aangemaakt? Dan kun je deze e-mail negeren.",
  },
};

const resetCopy: Record<EmailLang, EmailCopy> = {
  en: {
    subject: "Reset your Clara password",
    title: "Reset your Clara password",
    preheader: "Reset your Clara password. This link expires in 1 hour.",
    heading: "Reset your password",
    greeting: "Hi --NAME--,",
    body: "We received a request to reset the password for your Clara account. Click the button below to choose a new one.",
    cta: "Reset password",
    fallback:
      "If the button does not work, copy and paste this link into your browser:",
    expiry:
      "This link expires in 1 hour. If you did not ask to reset your password, you can ignore this email.",
  },
  pt: {
    subject: "Redefina a sua palavra-passe Clara",
    title: "Redefina a sua palavra-passe Clara",
    preheader:
      "Redefina a sua palavra-passe Clara. Este link expira dentro de 1 hora.",
    heading: "Redefinir palavra-passe",
    greeting: "Olá --NAME--,",
    body: "Recebemos um pedido para redefinir a palavra-passe da sua conta Clara. Clique no botão abaixo para escolher uma nova.",
    cta: "Redefinir palavra-passe",
    fallback:
      "Se o botão não funcionar, copie e cole este link no navegador:",
    expiry:
      "Este link expira dentro de 1 hora. Se não pediu para redefinir a palavra-passe, pode ignorar este email.",
  },
  de: {
    subject: "Setzen Sie Ihr Clara-Passwort zurück",
    title: "Setzen Sie Ihr Clara-Passwort zurück",
    preheader:
      "Setzen Sie Ihr Clara-Passwort zurück. Dieser Link läuft in 1 Stunde ab.",
    heading: "Passwort zurücksetzen",
    greeting: "Hallo --NAME--,",
    body: "Wir haben eine Anfrage erhalten, das Passwort für Ihr Clara-Konto zurückzusetzen. Klicken Sie auf die Schaltfläche unten, um ein neues zu wählen.",
    cta: "Passwort zurücksetzen",
    fallback:
      "Wenn die Schaltfläche nicht funktioniert, kopieren Sie diesen Link und fügen Sie ihn in Ihren Browser ein:",
    expiry:
      "Dieser Link läuft in 1 Stunde ab. Wenn Sie kein neues Passwort angefordert haben, können Sie diese E-Mail ignorieren.",
  },
  fr: {
    subject: "Réinitialisez votre mot de passe Clara",
    title: "Réinitialisez votre mot de passe Clara",
    preheader:
      "Réinitialisez votre mot de passe Clara. Ce lien expire dans 1 heure.",
    heading: "Réinitialiser le mot de passe",
    greeting: "Bonjour --NAME--,",
    body: "Nous avons reçu une demande de réinitialisation du mot de passe de votre compte Clara. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.",
    cta: "Réinitialiser le mot de passe",
    fallback:
      "Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :",
    expiry:
      "Ce lien expire dans 1 heure. Si vous n'avez pas demandé à réinitialiser votre mot de passe, vous pouvez ignorer cet email.",
  },
  it: {
    subject: "Reimposta la password di Clara",
    title: "Reimposta la password di Clara",
    preheader:
      "Reimposta la password di Clara. Questo link scade tra 1 ora.",
    heading: "Reimposta la password",
    greeting: "Ciao --NAME--,",
    body: "Abbiamo ricevuto una richiesta per reimpostare la password del tuo account Clara. Clicca il pulsante qui sotto per sceglierne una nuova.",
    cta: "Reimposta password",
    fallback:
      "Se il pulsante non funziona, copia e incolla questo link nel browser:",
    expiry:
      "Questo link scade tra 1 ora. Se non hai chiesto di reimpostare la password, puoi ignorare questa email.",
  },
  es: {
    subject: "Restablece tu contraseña de Clara",
    title: "Restablece tu contraseña de Clara",
    preheader:
      "Restablece tu contraseña de Clara. Este enlace caduca en 1 hora.",
    heading: "Restablecer contraseña",
    greeting: "Hola --NAME--,",
    body: "Hemos recibido una solicitud para restablecer la contraseña de tu cuenta de Clara. Haz clic en el botón de abajo para elegir una nueva.",
    cta: "Restablecer contraseña",
    fallback:
      "Si el botón no funciona, copia y pega este enlace en el navegador:",
    expiry:
      "Este enlace caduca en 1 hora. Si no has pedido restablecer tu contraseña, puedes ignorar este correo.",
  },
  nl: {
    subject: "Stel je Clara-wachtwoord opnieuw in",
    title: "Stel je Clara-wachtwoord opnieuw in",
    preheader:
      "Stel je Clara-wachtwoord opnieuw in. Deze link verloopt over 1 uur.",
    heading: "Wachtwoord opnieuw instellen",
    greeting: "Hoi --NAME--,",
    body: "We hebben een verzoek ontvangen om het wachtwoord van je Clara-account opnieuw in te stellen. Klik op de knop hieronder om een nieuw wachtwoord te kiezen.",
    cta: "Wachtwoord opnieuw instellen",
    fallback:
      "Werkt de knop niet? Kopieer deze link en plak hem in je browser:",
    expiry:
      "Deze link verloopt over 1 uur. Heb je niet gevraagd om je wachtwoord opnieuw in te stellen? Dan kun je deze e-mail negeren.",
  },
};

export const getVerificationCopy = (lang?: string): EmailCopy =>
  verificationCopy[resolveEmailLang(lang)];

export const getResetCopy = (lang?: string): EmailCopy =>
  resetCopy[resolveEmailLang(lang)];
