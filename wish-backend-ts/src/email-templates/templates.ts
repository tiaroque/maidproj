import { readFileSync } from 'fs'
import config from '../endpoints.config';
import {
    getResetCopy,
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

export const getPasswordResetEmail = (name: string, url: string, lang?: string) =>
    renderEmailTemplate(
        'reset-password.html',
        getResetCopy(lang),
        name,
        url,
        lang
    );
