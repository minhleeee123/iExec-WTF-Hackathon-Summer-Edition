import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';

const port = 4174;
const url = `http://127.0.0.1:${port}`;
const server = spawn(
  process.execPath,
  ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port)],
  { stdio: ['ignore', 'pipe', 'pipe'] },
);

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error('Vite preview did not start.');
}

const results = [];
try {
  await waitForServer();
  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox'],
  });
  try {
    for (const viewport of [
      { name: 'desktop', width: 1440, height: 1000 },
      { name: 'mobile', width: 390, height: 844 },
    ]) {
      const page = await browser.newPage({ viewport });
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.locator('.protocol-visual dd').nth(2).waitFor();
      await page.screenshot({ path: `/tmp/noxswap-${viewport.name}.png`, fullPage: true });
      const layout = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        title: document.querySelector('h1')?.textContent,
        oracle: document.querySelectorAll('.protocol-visual dd')[2]?.textContent,
        swapPanelVisible: Boolean(document.querySelector('#swap')),
      }));
      assert.equal(errors.length, 0, `${viewport.name} runtime errors: ${errors.join('; ')}`);
      assert(layout.scrollWidth <= layout.clientWidth, `${viewport.name} has horizontal overflow`);
      assert.equal(layout.title, 'Swap without publishing amounts.');
      assert.match(layout.oracle, /^\$[\d,.]+$/);
      assert(layout.swapPanelVisible);
      results.push({ viewport: `${viewport.width}x${viewport.height}`, ...layout, screenshot: `/tmp/noxswap-${viewport.name}.png` });
      await page.close();
    }
  } finally {
    await browser.close();
  }
  console.log(JSON.stringify({ status: 'PASS', results }, null, 2));
} finally {
  server.kill('SIGTERM');
}
