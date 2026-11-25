/**
 * The homepage verification probe.
 *
 * Phase 03 is a data-honesty phase, so the check that matters is not "does it
 * return 200" — it is "does it say what the database actually supports". A curl
 * text dump of a Next 16 page is not the rendered page either: content lands in
 * `<div hidden id="S:n">` and the flight payload. So this reads the rendered
 * page with Playwright and reports the figures it finds, so they can be
 * compared against the live inventory recorded in
 * `docs/phase-03/00_STAGE1_AUDIT_AND_PLAN.md` §2.
 *
 * It asserts nothing. It prints. The comparison against the database is a human
 * one, deliberately: an assertion written from today's numbers would be an
 * assertion that the data never changes, which is the opposite of what this
 * phase is for.
 *
 * Run: node scripts/check-homepage.mjs [baseUrl]
 */
import { chromium } from 'playwright';

const BASE = process.argv[2] ?? 'http://127.0.0.1:3111';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

const errors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));

await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

// Visible text only. A `curl` or `innerHTML` of a Next 16 page also contains
// the flight payload inside a <script> tag, and a phrase inside that payload is
// not a phrase on the page. Walking text nodes and skipping script/style keeps
// the claim checks honest about what a reader actually sees.
const text = await page.evaluate(() => {
  const parts = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      const tag = parent.tagName.toLowerCase();
      if (tag === 'script' || tag === 'style' || tag === 'noscript') {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let node;
  while ((node = walker.nextNode())) parts.push(node.textContent ?? '');
  return parts.join(' ');
});
const haystack = text.toLowerCase();

console.log('--- HEADINGS ---');
const headings = await page.locator('h1, h2, h3').allInnerTexts();
console.log(headings.filter(Boolean).join('\n'));

console.log('\n--- OVERVIEW CARDS ---');
const cards = await page.locator('section:has(#overview-heading) .terminal-panel').allInnerTexts();
cards.forEach((c) => console.log('•', c.replace(/\n/g, ' | ').slice(0, 170)));

console.log('\n--- REQUIRED CONTENT ---');
for (const probe of [
  'Configured markets',
  'Reporting markets',
  'Tracked commodities',
  'Commodities observed',
  'Published observations',
  'Commodities with movement',
  'What this counts',
  'has not been performed',
]) {
  console.log(`${haystack.includes(probe.toLowerCase()) ? 'YES' : 'NO '}  ${probe}`);
}

console.log('\n--- FORBIDDEN CLAIMS ---');
// A page that *claims* any of these is claiming something the data cannot
// support. The bare substrings also appear in the disclaimers — "it is never
// restated as real-time", "it does not compute a national average" — so this
// looks for the affirmative forms, and the disclaimers are counted separately
// as the thing that makes the page honest.
// Each pattern looks for the *affirmative* use. "national average" appears on
// the page only inside a disclaimer ("it does not compute a regional or national
// average"), so the claim is "national price" — a figure the platform has no
// series for. Matching the bare phrase would flag the disclaimer that makes the
// page honest.
const CLAIMS = [
  [/\bis real[- ]?time/i, 'presents data as real-time'],
  [/\blive prices?\b/i, 'presents data as live'],
  [/\bnational price\b/i, 'presents a national price'],
  [/\bguaranteed\b/i, 'guarantees an outcome'],
  [/\bwe recommend\b/i, 'makes a recommendation'],
];
for (const [pattern, label] of CLAIMS) {
  console.log(`${pattern.test(text) ? 'FOUND — investigate' : 'no  '}  ${label}`);
}

const DISCLAIMERS = [
  [/never restated as .real-time./i, 'disclaims real-time'],
  [/does not\s+compute a regional or national average/i, 'disclaims a national average'],
  [/A direction, not a\s+recommendation/i, 'disclaims a recommendation'],
  [/has not been performed/i, 'disclaims completed publication'],
];
for (const [pattern, label] of DISCLAIMERS) {
  console.log(`${pattern.test(text) ? 'YES' : 'NO '}  ${label}`);
}

console.log('\n--- SEARCH ---');
const search = page.locator('input[type="search"]').nth(1);
await search.fill('maize');
await page.waitForTimeout(900);
const found = await page.locator('[role="listbox"]').innerText().catch(() => '(no listbox)');
console.log('match:  ', found.replace(/\n/g, ' | ').slice(0, 300));

await search.fill('zzzqqq');
await page.waitForTimeout(900);
const none = await page.locator('[role="listbox"]').innerText().catch(() => '(no listbox)');
console.log('no-match:', none.replace(/\n/g, ' | ').slice(0, 250));

await search.fill('m');
await page.waitForTimeout(600);
const short = await page.locator('[role="listbox"]').innerText().catch(() => '(no listbox)');
console.log('1 char:  ', short.replace(/\n/g, ' | ').slice(0, 200));

console.log('\n--- CONSOLE ERRORS ---');
console.log(errors.length === 0 ? 'none' : errors.slice(0, 8).join('\n'));

await browser.close();
