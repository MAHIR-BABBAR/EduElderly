/**
 * Walk every route as the demo learner (and admin), asserting one h1 per
 * page and no console errors / failed API calls, and screenshot each at
 * desktop and phone width. The proof that a screen is done (plan V-1).
 *
 *   npm run walk -w packages/client
 *   WALK_BASE=http://localhost:5173 WALK_OUT=docs/screenshots/after npm run walk -w packages/client
 *   WALK_ROUTES=dashboard,catalog npm run walk -w packages/client   # subset
 *   WALK_FONT=huge WALK_CONTRAST=1 WALK_REDUCED=1 ...                # a11y variants
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const BASE = process.env.WALK_BASE || 'http://localhost:5173';
const OUT = process.env.WALK_OUT || path.resolve('walk-output');
const ONLY = process.env.WALK_ROUTES ? process.env.WALK_ROUTES.split(',') : null;
const FONT = process.env.WALK_FONT; // default|large|xl|huge
const CONTRAST = process.env.WALK_CONTRAST === '1';
const REDUCED = process.env.WALK_REDUCED === '1';
const LEARNER = { email: 'learner@demo.eduelderly', password: 'Demo1234!' };
const ADMIN = { email: 'admin@demo.eduelderly', password: 'Demo1234!' };

mkdirSync(OUT, { recursive: true });

let loggedInAs = null;
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1366, height: 900 },
  reducedMotion: REDUCED ? 'reduce' : 'no-preference',
});
const page = await context.newPage();

const issues = [];
// A 401 from /auth/refresh is how a guest visit learns it has no session; the
// browser logs it as a failed resource. Everything else is a finding.
let expectedRefresh401 = false;
page.on('console', (m) => {
  if (m.type() !== 'error') return;
  if (expectedRefresh401 && /status of 401/.test(m.text())) {
    expectedRefresh401 = false;
    return;
  }
  issues.push(`[console] ${m.text().slice(0, 200)}`);
});
page.on('pageerror', (e) => issues.push(`[pageerror] ${e.message.slice(0, 200)}`));
page.on('response', (r) => {
  if (r.status() === 401 && r.url().endsWith('/api/v1/auth/refresh') && !loggedInAs) {
    expectedRefresh401 = true;
    return;
  }
  if (r.status() >= 400 && r.url().includes('/api/')) issues.push(`[http ${r.status()}] ${r.url()}`);
});

async function applyPrefs() {
  await page.evaluate(
    ({ font, contrast }) => {
      if (font) document.documentElement.dataset.fontSize = font;
      if (contrast) document.documentElement.dataset.highContrast = 'true';
    },
    { font: FONT, contrast: CONTRAST },
  );
}

async function login(creds) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.getByLabel('Email address').fill(creds.email);
  await page.getByLabel('Password').fill(creds.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 15000 });
}

async function visit(name, url) {
  issues.length = 0;
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle' });
  await applyPrefs();
  await page.waitForTimeout(800);
  const h1s = await page.locator('h1').count();
  const h1 = h1s ? (await page.locator('h1').first().textContent())?.trim() : '(none)';
  const suffix = [FONT && `-${FONT}`, CONTRAST && '-hc', REDUCED && '-rm'].filter(Boolean).join('');
  await page.screenshot({ path: path.join(OUT, `${name}${suffix}.png`), fullPage: true });
  await page.setViewportSize({ width: 400, height: 860 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, `${name}${suffix}-400.png`), fullPage: true });

  const ok = h1s === 1 && issues.length === 0;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(16)} h1×${h1s}  "${(h1 || '').slice(0, 50)}"`);
  for (const issue of [...new Set(issues)].slice(0, 8)) console.log(`        - ${issue}`);
  return ok;
}

// Discover ids from the API so the walk works on any seeded database.
const api = async (p, token) =>
  (await (await fetch(`${BASE}${p}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })).json()).data;

const loginRes = await (await fetch(`${BASE}/api/v1/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(LEARNER),
})).json();
const token = loginRes?.data?.accessToken;
const courses = (await api('/api/v1/courses?limit=3')).courses;
const enrollments = token ? ((await api('/api/v1/enrollments', token)).enrollments ?? []) : [];
const activeEnrollment = enrollments.find((e) => e.status === 'active') || enrollments[0];

const routes = [
  ['landing', '/', null],
  ['catalog', '/courses', null],
  ['course-detail', `/courses/${courses?.[0]?.courseId}`, null],
  ['login', '/login', null],
  ['dashboard', '/dashboard', LEARNER],
  ['learning', activeEnrollment ? `/learn/${activeEnrollment.enrollmentId}` : null, LEARNER],
  ['quiz', activeEnrollment ? `/quiz/${activeEnrollment.courseId}` : null, LEARNER],
  ['certificates', '/certificates', LEARNER],
  ['settings', '/settings', LEARNER],
  ['admin', '/admin', ADMIN],
  ['admin-courses', '/admin/courses', ADMIN],
  ['admin-users', '/admin/users', ADMIN],
  ['admin-orders', '/admin/orders', ADMIN],
].filter(([name, url]) => url && (!ONLY || ONLY.includes(name)));

let failures = 0;
for (const [name, url, creds] of routes) {
  if (creds && loggedInAs !== creds.email) {
    await login(creds);
    loggedInAs = creds.email;
  }
  if (!(await visit(name, url))) failures += 1;
}

await browser.close();
console.log(`\n${routes.length - failures}/${routes.length} routes passed. Screenshots in ${OUT}`);
process.exit(failures ? 1 : 0);
