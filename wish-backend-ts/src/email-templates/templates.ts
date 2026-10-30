import { readFileSync } from 'fs'
import config from '../endpoints.config';
import {
    getResetCopy,
    getSignupReminderCopy,
    getVerificationCopy,
    resolveEmailLang,
    type EmailCopy,
} from './email-i18n';

const templateCache = new Map<string, string>();

const readCachedTemplate = (filename: string) => {
    const cached = templateCache.get(filename);
    if (cached) {
        return cached;
    }

    const template = readFileSync(`${__dirname}/${filename}`, 'utf8');
    templateCache.set(filename, template);
    return template;
}

export const readTemplate = () => {
    return readCachedTemplate('resident.html');
}

export const getResidentConfirmation = (name: string, key: string) => {
    const url = `${config.returnUrlEmail}/user-management?mode=confirmResident&oobCode=${key}`;
    return readTemplate().replace("--URL--", url);
}

const fallbackGreeting = (lang: string, greeting: string, name: string) => {
    const trimmed = name?.trim();
    if (trimmed) {
        return greeting.replace('--NAME--', trimmed);
    }

    if (lang === 'en') {
        return greeting.replace('--NAME--', 'there');
    }

    return greeting.replace(' --NAME--,', ',').replace('--NAME--', '').replace(',,', ',');
}

export const renderEmailTemplate = (
    filename: string,
    copy: EmailCopy,
    name: string,
    url: string,
    lang?: string
) => {
    const resolvedLang = resolveEmailLang(lang);
    const template = readCachedTemplate(filename);
    const greeting = fallbackGreeting(resolvedLang, copy.greeting, name);

    return template
        .replace(/--LANG--/g, resolvedLang)
        .replace(/--TITLE--/g, copy.title)
        .replace(/--PREHEADER--/g, copy.preheader)
        .replace(/--HEADING--/g, copy.heading)
        .replace(/--GREETING--/g, greeting)
        .replace(/--BODY--/g, copy.body)
        .replace(/--CTA--/g, copy.cta)
        .replace(/--FALLBACK--/g, copy.fallback)
        .replace(/--EXPIRY--/g, copy.expiry)
        .replace(/--URL--/g, url);
}

export const getAccountVerificationEmail = (name: string, url: string, lang?: string) =>
    renderEmailTemplate(
        'verify-email.html',
        getVerificationCopy(lang),
        name,
        url,
        lang
    );

export const getSignupReminderEmail = (name: string, url: string, lang?: string) =>
    renderEmailTemplate(
        'verify-email.html',
        getSignupReminderCopy(lang),
        name,
        url,
        lang
    );

export const getPasswordResetEmail = (name: string, url: string, lang?: string) =>
    renderEmailTemplate(
        'reset-password.html',
        getResetCopy(lang),
        name,
        url,
        lang
    );

const customGreetings: Record<string, string> = {
    en: 'Hi --NAME--,',
    pt: 'Olá --NAME--,',
    de: 'Hallo --NAME--,',
    fr: 'Bonjour --NAME--,',
    it: 'Ciao --NAME--,',
    es: 'Hola --NAME--,',
    nl: 'Hallo --NAME--,',
};

const escapeHtml = (value: string) =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

const messageParagraphs = (message: string) =>
    message
        .trim()
        .split(/\n{2,}/)
        .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br />')}</p>`)
        .join('');

const ctaBlock = (label: string, url: string) => `
<table role="presentation" border="0" cellpadding="0" cellspacing="0" class="btn btn-primary">
  <tbody>
    <tr>
      <td align="left">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0">
          <tbody>
            <tr>
              <td>
                <a href="${escapeHtml(url)}" target="_blank">${escapeHtml(label)}</a>
              </td>
            </tr>
          </tbody>
        </table>
      </td>
    </tr>
  </tbody>
</table>`;

export const getCustomMessageEmail = (
    name: string,
    lang: string | undefined,
    subject: string,
    message: string,
    cta?: string,
    url?: string,
) => {
    const resolvedLang = resolveEmailLang(lang);
    const greeting = escapeHtml(
        fallbackGreeting(
            resolvedLang,
            customGreetings[resolvedLang],
            name,
        ),
    );
    const preheader = message.replace(/\s+/g, ' ').trim().slice(0, 140);
    const values: Record<string, string> = {
        '--LANG--': resolvedLang,
        '--TITLE--': escapeHtml(subject),
        '--PREHEADER--': escapeHtml(preheader),
        '--HEADING--': escapeHtml(subject),
        '--GREETING--': greeting,
        '--BODY--': messageParagraphs(message),
        '--CTA_BLOCK--': cta && url ? ctaBlock(cta, url) : '',
    };

    return readCachedTemplate('message.html').replace(
        /--(?:LANG|TITLE|PREHEADER|HEADING|GREETING|BODY|CTA_BLOCK)--/g,
        (token) => values[token] ?? '',
    );
};
