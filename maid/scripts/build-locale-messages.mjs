// Rebuilds the @angular/localize inputs from the ngx-translate files, so
// src/assets/i18n/*.json stays the only place copy is edited.
//
//   npm run i18n:compile
//
// Writes src/locale/compiled-messages.ts (English, with $localize ids) and
// src/locale/messages.xlf plus messages.<lang>.xlf for every other locale.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const i18nDir = join(root, 'src/assets/i18n');
const localeDir = join(root, 'src/locale');
const SOURCE_FILE = 'src/locale/compiled-messages.ts';
const TARGET_LOCALES = ['de', 'es', 'fr', 'it', 'nl', 'pt'];

const readJson = (lang) =>
  JSON.parse(readFileSync(join(i18nDir, `${lang}.json`), 'utf8'));

const flatten = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null
      ? flatten(value, `${prefix}${key}.`)
      : [[`${prefix}${key}`, String(value)]],
  );

const escapeTemplate = (text) =>
  text.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

const escapeXml = (text) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&apos;')
    .replace(/"/g, '&quot;');

// compiled-messages.ts mirrors en.json's nesting; each id records its line.
const lineOf = new Map();
const lines = [
  '/// <reference types="@angular/localize" />',
  '',
  '// Compiled from src/assets/i18n/en.json by scripts/build-locale-messages.mjs.',
  '// Each locale build replaces these strings. Do not edit by hand.',
  'export const compiledMessages = {',
];
const writeObject = (obj, prefix, indent) => {
  for (const [key, value] of Object.entries(obj)) {
    const id = `${prefix}${key}`;
    if (typeof value === 'object' && value !== null) {
      lines.push(`${indent}${key}: {`);
      writeObject(value, `${id}.`, `${indent}  `);
      lines.push(`${indent}},`);
    } else {
      lineOf.set(id, lines.length + 1);
      lines.push(`${indent}${key}: $localize\`:@@${id}:${escapeTemplate(String(value))}\`,`);
    }
  }
};
const en = readJson('en');
writeObject(en, '', '  ');
lines.push('};', '');
writeFileSync(join(localeDir, 'compiled-messages.ts'), lines.join('\n'));

const enEntries = flatten(en);

const xliff = (lang) => {
  const target = lang ? new Map(flatten(readJson(lang))) : null;
  const missing = [];
  const units = enEntries.map(([id, source]) => {
    const parts = [
      `      <trans-unit id="${id}" datatype="html">`,
      `        <source>${escapeXml(source)}</source>`,
    ];
    if (target) {
      if (!target.has(id)) {
        missing.push(id);
      }
      parts.push(`        <target>${escapeXml(target.get(id) ?? source)}</target>`);
    }
    parts.push(
      '        <context-group purpose="location">',
      `          <context context-type="sourcefile">${SOURCE_FILE}</context>`,
      `          <context context-type="linenumber">${lineOf.get(id)}</context>`,
      '        </context-group>',
      '      </trans-unit>',
    );
    return parts.join('\n');
  });
  if (missing.length) {
    console.warn(`${lang}: ${missing.length} keys fall back to English: ${missing.join(', ')}`);
  }
  const targetAttr = lang ? ` target-language="${lang}"` : '';
  return [
    '<?xml version="1.0" encoding="UTF-8" ?>',
    '<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">',
    `  <file source-language="en"${targetAttr} datatype="plaintext" original="ng2.template">`,
    '    <body>',
    ...units,
    '    </body>',
    '  </file>',
    '</xliff>',
    '',
  ].join('\n');
};

writeFileSync(join(localeDir, 'messages.xlf'), xliff(null));
for (const lang of TARGET_LOCALES) {
  writeFileSync(join(localeDir, `messages.${lang}.xlf`), xliff(lang));
}

console.log(`Wrote ${enEntries.length} messages for en + ${TARGET_LOCALES.join(', ')}.`);
