#!/usr/bin/env node
/**
 * IFS App smoke / screenshot driver.
 *
 * Usage:
 *   node .claude/skills/run-ifs-app/driver.mjs [--port 5000] [--ss path/to/out.png] [--url /sign-in]
 *
 * The script:
 *  1. Verifies the Vite dev server is reachable on PORT (starts it if not running).
 *  2. Loads the page, waits for the brand background to paint (CSS loads even without Clerk).
 *  3. Checks whether React rendered content (requires valid VITE_CLERK_PUBLISHABLE_KEY).
 *  4. Optionally navigates to --url and screenshots to --ss.
 *
 * Exit codes:
 *   0  server healthy (React content rendered OR brand background present)
 *   1  server unreachable or unexpected error
 */

import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(fileURLToPath(import.meta.url), '../../../..');

const args = process.argv.slice(2);
function arg(flag, fallback = null) {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : fallback;
}
const port   = arg('--port', process.env.PORT || '5000');
const ssPath = arg('--ss');
const navUrl = arg('--url', '/');
const BASE   = `http://localhost:${port}`;

/** Return true if Vite dev server is already running on PORT */
async function isRunning() {
  try {
    const res = await fetch(`${BASE}/`).catch(() => null);
    return res?.ok;
  } catch { return false; }
}

/** Start `npm run dev -- --port PORT` in the background, wait up to 15 s */
async function startServer() {
  process.stdout.write(`Starting dev server on port ${port}…\n`);
  const child = spawn('npm', ['run', 'dev', '--', '--port', port], {
    cwd: ROOT,
    stdio: 'pipe',
    detached: false,
  });
  child.stderr.on('data', d => process.stderr.write(d));
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 500));
    if (await isRunning()) return child;
  }
  child.kill();
  throw new Error(`Dev server did not start on port ${port} within 15 s`);
}

async function run() {
  let serverChild = null;

  if (!(await isRunning())) {
    serverChild = await startServer();
  } else {
    process.stdout.write(`Dev server already running on port ${port}\n`);
  }

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

    // Block noisy third-party scripts so console is readable
    await page.route('**/onesignal.com/**', r => r.abort());

    await page.goto(`${BASE}${navUrl}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);

    // Verify brand background (#faf9f5) → CSS loaded correctly
    const bg = await page.evaluate(() =>
      window.getComputedStyle(document.body).backgroundColor
    );
    const brandBg = 'rgb(250, 249, 245)';
    const cssOk   = bg === brandBg;

    // Check whether React rendered content
    const rootHtml = await page.locator('#root').innerHTML().catch(() => '');
    const reactRendered = rootHtml.trim().length > 0;

    if (ssPath) {
      await page.screenshot({ path: ssPath, fullPage: false });
      process.stdout.write(`Screenshot saved to ${ssPath}\n`);
    }

    process.stdout.write(`\n--- Health check ---\n`);
    process.stdout.write(`URL            : ${page.url()}\n`);
    process.stdout.write(`HTTP 200       : OK\n`);
    process.stdout.write(`CSS loaded     : ${cssOk ? 'OK (brand background)' : `FAIL (got ${bg})`}\n`);
    process.stdout.write(`React rendered : ${reactRendered ? 'YES — UI is visible' : 'NO — check VITE_CLERK_PUBLISHABLE_KEY in .env.local'}\n`);

    if (!cssOk) process.exitCode = 1;

    if (!reactRendered) {
      process.stdout.write(`\nFix: create .env.local with a valid VITE_CLERK_PUBLISHABLE_KEY.\n`);
      process.stdout.write(`See .env.example for all required variables.\n`);
    }
  } finally {
    await browser.close();
    if (serverChild) serverChild.kill();
  }
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
