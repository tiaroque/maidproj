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
    subject: "Confirm your Linpura account",
    title: "Confirm your Linpura account",
    preheader:
      "Confirm your Linpura account to get started. This link expires in 1 hour.",
    heading: "Confirm your email",
    greeting: "Hi --NAME--,",
    body: "Welcome to Linpura. Please confirm your email address to finish creating your account and start using the app.",
    cta: "Confirm email",
    fallback:
      "If the button does not work, copy and paste this link into your browser:",
    expiry:
      "This link expires in 1 hour. If you did not create a Linpura account, you can ignore this email.",
  },
  pt: {
    subject: "Confirme a sua conta Linpura",
    title: "Confirme a sua conta Linpura",
    preheader:
      "Confirme a sua conta Linpura para começar. Este link expira dentro de 1 hora.",
    heading: "Confirme o seu email",
    greeting: "Olá --NAME--,",
    body: "Bem-vindo ao Linpura. Confirme o seu endereço de email para concluir a criação da conta e começar a usar a app.",
    cta: "Confirmar email",
    fallback:
      "Se o botão não funcionar, copie e cole este link no navegador:",
    expiry:
      "Este link expira dentro de 1 hora. Se não criou uma conta Linpura, pode ignorar este email.",
  },
  de: {
    subject: "Bestätigen Sie Ihr Linpura-Konto",
    title: "Bestätigen Sie Ihr Linpura-Konto",
    preheader:
      "Bestätigen Sie Ihr Linpura-Konto, um loszulegen. Dieser Link läuft in 1 Stunde ab.",
    heading: "E-Mail bestätigen",
    greeting: "Hallo --NAME--,",
    body: "Willkommen bei Linpura. Bitte bestätigen Sie Ihre E-Mail-Adresse, um die Kontoerstellung abzuschließen und die App zu nutzen.",
    cta: "E-Mail bestätigen",
    fallback:
      "Wenn die Schaltfläche nicht funktioniert, kopieren Sie diesen Link und fügen Sie ihn in Ihren Browser ein:",
    expiry:
      "Dieser Link läuft in 1 Stunde ab. Wenn Sie kein Linpura-Konto erstellt haben, können Sie diese E-Mail ignorieren.",
  },
  fr: {
    subject: "Confirmez votre compte Linpura",
    title: "Confirmez votre compte Linpura",
    preheader:
      "Confirmez votre compte Linpura pour commencer. Ce lien expire dans 1 heure.",
    heading: "Confirmez votre email",
    greeting: "Bonjour --NAME--,",
    body: "Bienvenue sur Linpura. Veuillez confirmer votre adresse email pour terminer la création de votre compte et commencer à utiliser l'application.",
    cta: "Confirmer l'email",
    fallback:
      "Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :",
    expiry:
      "Ce lien expire dans 1 heure. Si vous n'avez pas créé de compte Linpura, vous pouvez ignorer cet email.",
  },
  it: {
    subject: "Conferma il tuo account Linpura",
    title: "Conferma il tuo account Linpura",
    preheader:
      "Conferma il tuo account Linpura per iniziare. Questo link scade tra 1 ora.",
    heading: "Conferma la tua email",
    greeting: "Ciao --NAME--,",
    body: "Benvenuto su Linpura. Conferma il tuo indirizzo email per completare la creazione dell'account e iniziare a usare l'app.",
    cta: "Conferma email",
    fallback:
      "Se il pulsante non funziona, copia e incolla questo link nel browser:",
    expiry:
      "Questo link scade tra 1 ora. Se non hai creato un account Linpura, puoi ignorare questa email.",
  },
  es: {
    subject: "Confirma tu cuenta de Linpura",
    title: "Confirma tu cuenta de Linpura",
    preheader:
      "Confirma tu cuenta de Linpura para empezar. Este enlace caduca en 1 hora.",
    heading: "Confirma tu correo",
    greeting: "Hola --NAME--,",
    body: "Bienvenido a Linpura. Confirma tu dirección de correo para terminar de crear tu cuenta y empezar a usar la app.",
    cta: "Confirmar correo",
    fallback:
      "Si el botón no funciona, copia y pega este enlace en el navegador:",
    expiry:
      "Este enlace caduca en 1 hora. Si no has creado una cuenta de Linpura, puedes ignorar este correo.",
  },
  nl: {
    subject: "Bevestig je Linpura-account",
    title: "Bevestig je Linpura-account",
    preheader:
      "Bevestig je Linpura-account om te beginnen. Deze link verloopt over 1 uur.",
    heading: "Bevestig je e-mailadres",
    greeting: "Hoi --NAME--,",
    body: "Welkom bij Linpura. Bevestig je e-mailadres om je account aan te maken en de app te gaan gebruiken.",
    cta: "E-mailadres bevestigen",
    fallback:
      "Werkt de knop niet? Kopieer deze link en plak hem in je browser:",
    expiry:
      "Deze link verloopt over 1 uur. Heb je geen Linpura-account aangemaakt? Dan kun je deze e-mail negeren.",
  },
};

const resetCopy: Record<EmailLang, EmailCopy> = {
  en: {
    subject: "Reset your Linpura password",
    title: "Reset your Linpura password",
    preheader: "Reset your Linpura password. This link expires in 1 hour.",
    heading: "Reset your password",
    greeting: "Hi --NAME--,",
    body: "We received a request to reset the password for your Linpura account. Click the button below to choose a new one.",
    cta: "Reset password",
    fallback:
      "If the button does not work, copy and paste this link into your browser:",
    expiry:
      "This link expires in 1 hour. If you did not ask to reset your password, you can ignore this email.",
  },
  pt: {
    subject: "Redefina a sua palavra-passe Linpura",
    title: "Redefina a sua palavra-passe Linpura",
    preheader:
      "Redefina a sua palavra-passe Linpura. Este link expira dentro de 1 hora.",
    heading: "Redefinir palavra-passe",
    greeting: "Olá --NAME--,",
    body: "Recebemos um pedido para redefinir a palavra-passe da sua conta Linpura. Clique no botão abaixo para escolher uma nova.",
    cta: "Redefinir palavra-passe",
    fallback:
      "Se o botão não funcionar, copie e cole este link no navegador:",
    expiry:
      "Este link expira dentro de 1 hora. Se não pediu para redefinir a palavra-passe, pode ignorar este email.",
  },
  de: {
    subject: "Setzen Sie Ihr Linpura-Passwort zurück",
    title: "Setzen Sie Ihr Linpura-Passwort zurück",
    preheader:
      "Setzen Sie Ihr Linpura-Passwort zurück. Dieser Link läuft in 1 Stunde ab.",
    heading: "Passwort zurücksetzen",
    greeting: "Hallo --NAME--,",
    body: "Wir haben eine Anfrage erhalten, das Passwort für Ihr Linpura-Konto zurückzusetzen. Klicken Sie auf die Schaltfläche unten, um ein neues zu wählen.",
    cta: "Passwort zurücksetzen",
    fallback:
      "Wenn die Schaltfläche nicht funktioniert, kopieren Sie diesen Link und fügen Sie ihn in Ihren Browser ein:",
    expiry:
      "Dieser Link läuft in 1 Stunde ab. Wenn Sie kein neues Passwort angefordert haben, können Sie diese E-Mail ignorieren.",
  },
  fr: {
    subject: "Réinitialisez votre mot de passe Linpura",
    title: "Réinitialisez votre mot de passe Linpura",
    preheader:
      "Réinitialisez votre mot de passe Linpura. Ce lien expire dans 1 heure.",
    heading: "Réinitialiser le mot de passe",
    greeting: "Bonjour --NAME--,",
    body: "Nous avons reçu une demande de réinitialisation du mot de passe de votre compte Linpura. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.",
    cta: "Réinitialiser le mot de passe",
    fallback:
      "Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :",
    expiry:
      "Ce lien expire dans 1 heure. Si vous n'avez pas demandé à réinitialiser votre mot de passe, vous pouvez ignorer cet email.",
  },
  it: {
    subject: "Reimposta la password di Linpura",
    title: "Reimposta la password di Linpura",
    preheader:
      "Reimposta la password di Linpura. Questo link scade tra 1 ora.",
    heading: "Reimposta la password",
    greeting: "Ciao --NAME--,",
    body: "Abbiamo ricevuto una richiesta per reimpostare la password del tuo account Linpura. Clicca il pulsante qui sotto per sceglierne una nuova.",
    cta: "Reimposta password",
    fallback:
      "Se il pulsante non funziona, copia e incolla questo link nel browser:",
    expiry:
      "Questo link scade tra 1 ora. Se non hai chiesto di reimpostare la password, puoi ignorare questa email.",
  },
  es: {
    subject: "Restablece tu contraseña de Linpura",
    title: "Restablece tu contraseña de Linpura",
    preheader:
      "Restablece tu contraseña de Linpura. Este enlace caduca en 1 hora.",
    heading: "Restablecer contraseña",
    greeting: "Hola --NAME--,",
    body: "Hemos recibido una solicitud para restablecer la contraseña de tu cuenta de Linpura. Haz clic en el botón de abajo para elegir una nueva.",
    cta: "Restablecer contraseña",
    fallback:
      "Si el botón no funciona, copia y pega este enlace en el navegador:",
    expiry:
      "Este enlace caduca en 1 hora. Si no has pedido restablecer tu contraseña, puedes ignorar este correo.",
  },
  nl: {
    subject: "Stel je Linpura-wachtwoord opnieuw in",
    title: "Stel je Linpura-wachtwoord opnieuw in",
    preheader:
      "Stel je Linpura-wachtwoord opnieuw in. Deze link verloopt over 1 uur.",
    heading: "Wachtwoord opnieuw instellen",
    greeting: "Hoi --NAME--,",
    body: "We hebben een verzoek ontvangen om het wachtwoord van je Linpura-account opnieuw in te stellen. Klik op de knop hieronder om een nieuw wachtwoord te kiezen.",
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
