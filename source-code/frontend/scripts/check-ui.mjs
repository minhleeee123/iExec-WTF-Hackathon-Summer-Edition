import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';

const port = 4174;
const url = `http://127.0.0.1:${port}`;
const rpcUrl = 'https://ethereum-sepolia-rpc.publicnode.com';
const testAddress = '0xE412d04DA2A211F7ADC80311CC0FF9F03440B64E';
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
      page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
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

    const walletPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const walletErrors = [];
    walletPage.on('pageerror', (error) => walletErrors.push(error.message));
    walletPage.on('console', (message) => { if (message.type() === 'error') walletErrors.push(message.text()); });
    await walletPage.exposeFunction('__rpcRequest', async (method, params = []) => {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      });
      const payload = await response.json();
      if (payload.error) throw new Error(payload.error.message);
      return payload.result;
    });
    await walletPage.addInitScript(({ address }) => {
      const listeners = new Map();
      window.ethereum = {
        isMetaMask: true,
        request: ({ method, params = [] }) => {
          if (method === 'eth_accounts' || method === 'eth_requestAccounts') return Promise.resolve([address]);
          if (method === 'wallet_switchEthereumChain') return Promise.resolve(null);
          return window.__rpcRequest(method, params);
        },
        on: (event, handler) => {
          const handlers = listeners.get(event) ?? new Set();
          handlers.add(handler);
          listeners.set(event, handlers);
        },
        removeListener: (event, handler) => listeners.get(event)?.delete(handler),
      };
    }, { address: testAddress });
    await walletPage.goto(url, { waitUntil: 'networkidle' });
    await walletPage.locator('.wallet-button').filter({ hasText: '0xE412' }).waitFor();
    await walletPage.locator('.faucet-item .cooldown').first().waitFor();
    assert.equal(await walletPage.locator('.faucet-item .cooldown').count(), 2, 'live faucet cooldowns are not visible');
    await walletPage.locator('.faucet-item button').last().click();
    await walletPage.getByText(/nWETH faucet is cooling down/).waitFor();

    const assetInput = walletPage.getByLabel('Asset amount');
    await assetInput.fill('999999999999999999999999');
    const assetSection = walletPage.locator('#assets');
    await assetSection.getByText('Amount exceeds your available balance.').waitFor();
    await walletPage.getByRole('button', { name: 'Unwrap' }).click();
    await assetSection.getByText('Reveal your private balance to validate this amount.').waitFor();
    await walletPage.getByRole('button', { name: 'Decrypt and show private balances' }).waitFor();
    const walletLayout = await walletPage.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    assert(walletLayout.scrollWidth <= walletLayout.clientWidth, 'connected wallet view has horizontal overflow');
    await walletPage.screenshot({ path: '/tmp/noxswap-wallet.png', fullPage: true });
    assert.equal(walletErrors.length, 0, `wallet runtime errors: ${walletErrors.join('; ')}`);
    results.push({
      viewport: '1280x900-wallet',
      ...walletLayout,
      faucetCooldowns: await walletPage.locator('.faucet-item .cooldown').allTextContents(),
      cooldownNotice: await walletPage.locator('.notice.info').textContent(),
      excessAmountBlocked: true,
      privateBalanceRevealAvailable: true,
      screenshot: '/tmp/noxswap-wallet.png',
    });
    await walletPage.close();
  } finally {
    await browser.close();
  }
  console.log(JSON.stringify({ status: 'PASS', results }, null, 2));
} finally {
  server.kill('SIGTERM');
}
