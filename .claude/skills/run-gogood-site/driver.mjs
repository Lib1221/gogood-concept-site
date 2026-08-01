// GO GOOD concept-site driver — launches the static site under a local
// server and drives the scroll-scrubbed film with real Chrome via Playwright.
//
// Usage:  node driver.mjs [--url http://127.0.0.1:8642/]
// Needs:  `playwright` resolvable from CWD (see SKILL.md — install into a
//         scratch dir with PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1) and system
//         Google Chrome (`channel: 'chrome'` — the cached ms-playwright
//         browsers usually mismatch the freshly-installed package version).
//
// Screenshots land in /tmp/gogood-run/. Exit code 0 = all checks passed.

import { chromium } from 'playwright';

const BASE = process.argv.includes('--url')
  ? process.argv[process.argv.indexOf('--url') + 1]
  : 'http://127.0.0.1:8642/';
const OUT = '/tmp/gogood-run';
import { mkdirSync } from 'fs';
mkdirSync(OUT, { recursive: true });

let failures = 0;
function check(ok, label) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) failures++;
}

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const badRequests = [];
page.on('requestfailed', r => badRequests.push(r.url()));

// ── load + loader dismissal ─────────────────────────────────
const t0 = Date.now();
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
const loaderShown = await page.evaluate(() => !!document.getElementById('loader'));
await page.waitForFunction(() =>
  !document.getElementById('loader') ||
  document.getElementById('loader').classList.contains('done'),
  null, { timeout: 15000 });
check(loaderShown, `loader shown, dismissed after ${Date.now() - t0}ms`);
await page.waitForTimeout(800); // let the loader's fade-out transition finish

const ext = await page.evaluate(() =>
  document.createElement('canvas').toDataURL('image/webp').startsWith('data:image/webp')
    ? 'webp' : 'jpg');
check(ext === 'webp', `webp path negotiated (got: ${ext})`);
await page.screenshot({ path: `${OUT}/00_hero.png` });

// ── scrub the film to frame-locked captions ─────────────────
// [frame, expected caption substring]
const STOPS = [
  [17, 'Good,', '01_thecan'],
  [29, 'Berry', '02_berry'],
  [49, 'Orange', '03_orange'],
  [110, 'Crack.', '04_ritual'],
  [163, 'Three', '05_family'],
];
for (const [frame, expect, name] of STOPS) {
  await page.evaluate((f) => {
    const driver = document.getElementById('heroDriver');
    const total = driver.getBoundingClientRect().height - window.innerHeight;
    window.scrollTo(0, (f - 1) / 197 * total);
  }, frame);
  // the eased playhead needs a moment to settle on the target frame
  await page.waitForFunction((f) =>
    document.getElementById('frameCount').textContent.startsWith(String(f).padStart(3, '0')),
    frame, { timeout: 10000 });
  await page.waitForTimeout(300); // caption fade
  const caption = await page.evaluate(() =>
    [...document.querySelectorAll('.caption')]
      .filter(c => parseFloat(c.style.opacity) > 0.9)
      .map(c => c.querySelector('h3').textContent)[0] ?? '(none)');
  check(caption.includes(expect), `frame ${frame}: caption "${caption.replace(/\n/g, ' ')}"`);
  await page.screenshot({ path: `${OUT}/${name}.png` });
}

// ── editorial sections + CTA ────────────────────────────────
await page.evaluate(() => document.getElementById('flavours').scrollIntoView());
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/06_flavours.png` });

await page.evaluate(() => document.getElementById('shop').scrollIntoView());
await page.waitForTimeout(500);
const cta = page.getByRole('button', { name: /SHOP GO GOOD/ });
await cta.hover();
check(await cta.isVisible(), 'footer CTA visible + hoverable');
await page.screenshot({ path: `${OUT}/07_footer.png` });

check(badRequests.length === 0, `network failures: ${badRequests.length}`);
badRequests.forEach(u => console.log('  failed:', u));

await browser.close();
console.log(failures === 0 ? `\nALL CHECKS PASSED — screenshots in ${OUT}/`
                           : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
