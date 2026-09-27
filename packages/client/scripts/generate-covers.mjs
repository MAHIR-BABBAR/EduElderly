/**
 * Generates the illustrated course covers in public/covers/*.svg.
 *
 * Each cover is a simple geometric motif on its subject-world gradient, drawn
 * in paper-coloured strokes, so seven very different topics read as one
 * art-directed set (plan SIG-4). Regenerate with:
 *
 *   node scripts/generate-covers.mjs
 *
 * Colours mirror styles/tokens.css. Add a course: add an entry to COVERS.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const OUT = path.resolve('public/covers');
const PAPER = '#FAF6EF';
const MARIGOLD = '#E9A23B';

const WORLDS = {
  health: ['#1F4A36', '#4E9C78'],
  digital: ['#22386B', '#5673BD'],
  life: ['#7A3520', '#D0714F'],
  money: ['#512B54', '#9A5F9E'],
  default: ['#0C343D', '#1F7A8C'],
};

const W = 1200;
const H = 750;

const frame = (world, motif) => {
  const [a, b] = WORLDS[world];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-hidden="true">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${PAPER}" stop-opacity="0.35"/><stop offset="1" stop-color="${PAPER}" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <g fill="none" stroke="${PAPER}" stroke-opacity="0.12" stroke-width="2">
    ${[220, 340, 460, 580].map((r) => `<circle cx="${W}" cy="${H}" r="${r}"/>`).join('\n    ')}
  </g>
  ${motif}
</svg>
`;
};

// A sun (or moon) disc with a soft glow, used by several motifs.
const sun = (cx, cy, r, color = MARIGOLD) =>
  `<circle cx="${cx}" cy="${cy}" r="${r * 2.2}" fill="url(#glow)"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}"/>`;

const stroke = `fill="none" stroke="${PAPER}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"`;

const COVERS = {
  // Walking: sun over two rolling hills and a winding path.
  'healthy-living-older-adults': frame(
    'health',
    `${sun(880, 230, 90)}
    <path d="M-20 560 C 240 420, 420 420, 640 540 S 1000 600, 1220 470 V ${H} H -20 Z" fill="${PAPER}" fill-opacity="0.16"/>
    <path d="M-20 640 C 300 560, 520 620, 760 580 S 1060 520, 1220 600 V ${H} H -20 Z" fill="${PAPER}" fill-opacity="0.22"/>
    <path d="M120 ${H} C 260 620, 380 640, 470 560 S 640 480, 760 530" ${stroke} stroke-dasharray="0 34"/>`,
  ),
  // Nutrition: a bowl with three leaves.
  'nutrition-healthy-aging': frame(
    'health',
    `${sun(260, 200, 60)}
    <path d="M330 430 H 870 A 270 270 0 0 1 600 700 A 270 270 0 0 1 330 430 Z" fill="${PAPER}" fill-opacity="0.2" stroke="${PAPER}" stroke-width="14"/>
    <path d="M600 430 C 600 300, 680 240, 780 230 C 770 340, 700 410, 600 430 Z" fill="${MARIGOLD}"/>
    <path d="M560 420 C 520 320, 450 280, 360 280 C 380 380, 450 430, 560 420 Z" fill="${PAPER}" fill-opacity="0.85"/>
    <path d="M600 430 C 620 330, 600 260, 640 180" ${stroke}/>`,
  ),
  // Digital health: a tablet with a heartbeat line.
  'discover-digital-health': frame(
    'digital',
    `${sun(980, 160, 70)}
    <rect x="300" y="150" width="600" height="450" rx="36" fill="${PAPER}" fill-opacity="0.18" stroke="${PAPER}" stroke-width="14"/>
    <circle cx="600" cy="560" r="14" fill="${PAPER}"/>
    <path d="M360 380 H 470 L 520 300 L 580 460 L 640 340 L 680 380 H 840" ${stroke}/>`,
  ),
  // Reliable information: a magnifying glass over lines of text.
  'finding-reliable-health-info': frame(
    'digital',
    `${sun(220, 200, 56)}
    <g stroke="${PAPER}" stroke-opacity="0.55" stroke-width="16" stroke-linecap="round">
      <path d="M300 300 H 700"/><path d="M300 380 H 640"/><path d="M300 460 H 690"/><path d="M300 540 H 560"/>
    </g>
    <circle cx="790" cy="420" r="150" fill="${PAPER}" fill-opacity="0.18" stroke="${PAPER}" stroke-width="18"/>
    <path d="M900 530 L 1010 640" fill="none" stroke="${PAPER}" stroke-width="30" stroke-linecap="round"/>
    <path d="M730 430 L 775 475 L 860 370" fill="none" stroke="${MARIGOLD}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>`,
  ),
  // Ageing and society: overlapping circles — a community.
  'introducing-ageing': frame(
    'life',
    `${sun(200, 170, 62)}
    <g fill="${PAPER}" fill-opacity="0.16" stroke="${PAPER}" stroke-width="14">
      <circle cx="480" cy="420" r="170"/><circle cx="660" cy="360" r="150"/><circle cx="720" cy="520" r="130"/>
    </g>
    <circle cx="620" cy="440" r="42" fill="${MARIGOLD}"/>`,
  ),
  // Care: two open hands holding a heart.
  'age-friendly-care-basics': frame(
    'life',
    `${sun(960, 190, 70)}
    <path d="M330 560 C 330 470, 400 430, 470 430 L 720 430 C 800 430, 860 470, 860 560 L 860 640 C 760 700, 440 700, 330 640 Z" fill="${PAPER}" fill-opacity="0.18" stroke="${PAPER}" stroke-width="14"/>
    <path d="M600 470 C 560 400, 470 400, 470 330 C 470 280, 520 260, 560 290 C 580 305, 590 320, 600 340 C 610 320, 620 305, 640 290 C 680 260, 730 280, 730 330 C 730 400, 640 400, 600 470 Z" fill="${MARIGOLD}"/>`,
  ),
  // Wellness: a lotus with rays.
  'premium-wellness-workshop': frame(
    'health',
    `${sun(600, 300, 80)}
    <g stroke="${PAPER}" stroke-opacity="0.5" stroke-width="10" stroke-linecap="round">
      ${[-60, -35, -10, 10, 35, 60].map((d) => { const r = (d * Math.PI) / 180; return `<path d="M${600 + Math.sin(r) * 130} ${300 - Math.cos(r) * 130} L ${600 + Math.sin(r) * 200} ${300 - Math.cos(r) * 200}"/>`; }).join('')}
    </g>
    <g fill="${PAPER}" fill-opacity="0.85">
      <path d="M600 640 C 520 600, 480 520, 500 440 C 560 470, 600 540, 600 640 Z"/>
      <path d="M600 640 C 680 600, 720 520, 700 440 C 640 470, 600 540, 600 640 Z"/>
      <path d="M600 650 C 540 580, 540 480, 600 410 C 660 480, 660 580, 600 650 Z" fill-opacity="1"/>
      <path d="M600 650 C 470 640, 400 560, 380 470 C 470 480, 560 560, 600 650 Z" fill-opacity="0.6"/>
      <path d="M600 650 C 730 640, 800 560, 820 470 C 730 480, 640 560, 600 650 Z" fill-opacity="0.6"/>
    </g>`,
  ),
};

mkdirSync(OUT, { recursive: true });
for (const [slug, svg] of Object.entries(COVERS)) {
  writeFileSync(path.join(OUT, `${slug}.svg`), svg);
  console.log('wrote', `${slug}.svg`);
}
