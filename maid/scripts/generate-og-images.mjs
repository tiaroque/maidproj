import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'src/assets/images/og');
const chrome =
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const work = resolve(tmpdir(), 'linpura-og');

const cards = [
  {
    lang: 'en',
    kicker: 'Home cleaning, made simple',
    title: 'Find a trusted cleaner near you.',
  },
  {
    lang: 'pt',
    kicker: 'Limpeza doméstica, sem complicações',
    title: 'Encontre um profissional de limpeza de confiança perto de si.',
  },
  {
    lang: 'fr',
    kicker: 'Le ménage, tout simplement',
    title: 'Trouvez une aide ménagère de confiance près de chez vous.',
  },
  {
    lang: 'de',
    kicker: 'Haushaltsreinigung, ganz einfach',
    title: 'Finden Sie eine vertrauenswürdige Reinigungskraft in Ihrer Nähe.',
  },
  {
    lang: 'it',
    kicker: 'Pulizie di casa, in modo semplice',
    title: 'Trova un addetto alle pulizie di fiducia vicino a te.',
  },
  {
    lang: 'es',
    kicker: 'Limpieza del hogar, sin complicaciones',
    title: 'Encuentra a un profesional de limpieza de confianza cerca de ti.',
  },
  {
    lang: 'nl',
    kicker: 'Schoonmaakhulp, heel eenvoudig',
    title: 'Vind een betrouwbare schoonmaker bij jou in de buurt.',
  },
];

const mop = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="#7fd8c3" aria-hidden="true">
  <g transform="rotate(15 32 32) translate(0 -3)">
    <rect x="30" y="3" width="4" height="27" rx="2"/>
    <path d="M23 28h18l3 9H20z"/>
    <path d="M20.5 36h5l-7 18a3.5 3.5 0 0 1-7 0z"/>
    <path d="M25 36h5l-2.5 21a3.5 3.5 0 0 1-7 0z"/>
    <path d="M29.5 36h5l1 22a3.5 3.5 0 0 1-7 0z"/>
    <path d="M34 36h5l4.5 21a3.5 3.5 0 0 1-7 0z"/>
    <path d="M38.5 36h5l8.5 18a3.5 3.5 0 0 1-7 0z"/>
  </g>
</svg>`;

function titleSize(title) {
  if (title.length > 60) return 52;
  if (title.length > 42) return 58;
  return 68;
}

function html(card, fontCss) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    ${fontCss}
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 1200px; height: 630px; overflow: hidden; }
    body {
      font-family: Nunito, sans-serif;
      color: #f6fbfa;
      background:
        radial-gradient(ellipse 80% 60% at 80% 20%, rgb(15 148 136 / 28%), transparent 55%),
        radial-gradient(ellipse 50% 40% at 10% 80%, rgb(127 216 195 / 18%), transparent 50%),
        linear-gradient(160deg, #0a2024 0%, #0f2a2e 45%, #12393d 100%);
    }
    .card { position: relative; width: 1200px; height: 630px; padding: 76px 84px 68px; }
    .brand { display: flex; align-items: center; gap: 16px; color: #7fd8c3; }
    .brand svg { width: 58px; height: 58px; flex: none; }
    .brand span {
      font-family: "Albert Sans", Nunito, sans-serif;
      font-weight: 600;
      font-size: 52px;
      letter-spacing: -0.045em;
      line-height: 1;
    }
    .kicker {
      margin-top: 58px;
      font-size: 18px;
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: #7fd8c3;
    }
    h1 {
      max-width: 980px;
      margin-top: 22px;
      font-size: ${titleSize(card.title)}px;
      font-weight: 800;
      line-height: 1.08;
      letter-spacing: -0.03em;
      color: #fff;
    }
    .rule {
      width: 84px;
      height: 5px;
      margin-top: 36px;
      border-radius: 999px;
      background: #7fd8c3;
    }
    .domain {
      position: absolute;
      right: 84px;
      bottom: 52px;
      font-size: 22px;
      font-weight: 600;
      letter-spacing: -0.01em;
      color: rgb(243 248 247 / 0.55);
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">${mop}<span>linpura</span></div>
    <p class="kicker">${card.kicker}</p>
    <h1>${card.title}</h1>
    <div class="rule"></div>
    <div class="domain">linpura.com</div>
  </div>
</body>
</html>`;
}

function run(command, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`${command} exited ${code}`));
    });
  });
}

await mkdir(work, { recursive: true });
await mkdir(outDir, { recursive: true });

const [nunito, albert] = await Promise.all([
  fetch(
    'https://github.com/google/fonts/raw/main/ofl/nunito/Nunito%5Bwght%5D.ttf',
  ).then((response) => {
    if (!response.ok) throw new Error(`Nunito ${response.status}`);
    return response.arrayBuffer();
  }),
  fetch(
    'https://github.com/google/fonts/raw/main/ofl/albertsans/AlbertSans%5Bwght%5D.ttf',
  ).then((response) => {
    if (!response.ok) throw new Error(`Albert Sans ${response.status}`);
    return response.arrayBuffer();
  }),
]);

const fontCss = [
  `@font-face { font-family: "Nunito"; font-weight: 100 900; font-style: normal; src: url("data:font/ttf;base64,${Buffer.from(nunito).toString('base64')}") format("truetype"); }`,
  `@font-face { font-family: "Albert Sans"; font-weight: 100 900; font-style: normal; src: url("data:font/ttf;base64,${Buffer.from(albert).toString('base64')}") format("truetype"); }`,
].join('\n');

for (const card of cards) {
  const htmlPath = resolve(work, `og-${card.lang}.html`);
  const pngPath = resolve(work, `og-${card.lang}.png`);
  const jpgPath = resolve(outDir, `og-${card.lang}.jpg`);
  await writeFile(htmlPath, html(card, fontCss));
  await run(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--virtual-time-budget=3000',
    '--window-size=1200,630',
    `--screenshot=${pngPath}`,
    `file://${htmlPath}`,
  ]);
  await run('sips', [
    '-s',
    'format',
    'jpeg',
    '-s',
    'formatOptions',
    '82',
    pngPath,
    '--out',
    jpgPath,
  ]);
  await run('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', jpgPath]);
}
