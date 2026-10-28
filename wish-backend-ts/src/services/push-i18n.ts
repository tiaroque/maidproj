import { EmailLang, resolveEmailLang } from "../email-templates/email-i18n";

type PushCopy = {
  chatTitle: string;
  chatMedia: string;
  likeTitle: string;
  likeBody: string;
  visitTitle: string;
  visitBody: string;
};

const pushCopy: Record<EmailLang, PushCopy> = {
  en: {
    chatTitle: "New message from --NAME--",
    chatMedia: "Sent you a photo",
    likeTitle: "New like",
    likeBody: "--NAME-- liked your profile",
    visitTitle: "New profile visit",
    visitBody: "--NAME-- viewed your profile",
  },
  pt: {
    chatTitle: "Nova mensagem de --NAME--",
    chatMedia: "Enviou-lhe uma foto",
    likeTitle: "Novo gosto",
    likeBody: "--NAME-- gostou do seu perfil",
    visitTitle: "Nova visita ao perfil",
    visitBody: "--NAME-- viu o seu perfil",
  },
  de: {
    chatTitle: "Neue Nachricht von --NAME--",
    chatMedia: "Hat Ihnen ein Foto gesendet",
    likeTitle: "Neues Like",
    likeBody: "--NAME-- gefällt Ihr Profil",
    visitTitle: "Neuer Profilbesuch",
    visitBody: "--NAME-- hat Ihr Profil angesehen",
  },
  fr: {
    chatTitle: "Nouveau message de --NAME--",
    chatMedia: "Vous a envoyé une photo",
    likeTitle: "Nouveau j'aime",
    likeBody: "--NAME-- a aimé votre profil",
    visitTitle: "Nouvelle visite de profil",
    visitBody: "--NAME-- a consulté votre profil",
  },
  it: {
    chatTitle: "Nuovo messaggio da --NAME--",
    chatMedia: "Ti ha inviato una foto",
    likeTitle: "Nuovo mi piace",
    likeBody: "A --NAME-- piace il tuo profilo",
    visitTitle: "Nuova visita al profilo",
    visitBody: "--NAME-- ha visto il tuo profilo",
  },
  es: {
    chatTitle: "Nuevo mensaje de --NAME--",
    chatMedia: "Te ha enviado una foto",
    likeTitle: "Nuevo me gusta",
    likeBody: "A --NAME-- le gusta tu perfil",
    visitTitle: "Nueva visita al perfil",
    visitBody: "--NAME-- ha visto tu perfil",
  },
  nl: {
    chatTitle: "Nieuw bericht van --NAME--",
    chatMedia: "Heeft je een foto gestuurd",
    likeTitle: "Nieuwe like",
    likeBody: "--NAME-- vindt je profiel leuk",
    visitTitle: "Nieuw profielbezoek",
    visitBody: "--NAME-- heeft je profiel bekeken",
  },
};

export const getPushCopy = (lang?: string) => {
  const resolved = resolveEmailLang(lang);
  return { lang: resolved, copy: pushCopy[resolved] };
};

export const withName = (text: string, name: string) =>
  text.replace("--NAME--", name);
