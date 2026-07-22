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
      await page.locator('.landing-terminal').waitFor();
      await page.screenshot({ path: `/tmp/noxswap-${viewport.name}.png`, fullPage: true });
      const layout = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        title: document.querySelector('h1')?.textContent,
        oracle: document.querySelector('.landing-terminal div:last-child strong')?.textContent,
        landingVisible: Boolean(document.querySelector('.landing-page')),
      }));
      assert.equal(errors.length, 0, `${viewport.name} runtime errors: ${errors.join('; ')}`);
      assert(layout.scrollWidth <= layout.clientWidth, `${viewport.name} has horizontal overflow`);
      assert.equal(layout.title, 'NoxSwap');
      assert.equal(await page.title(), 'NoxSwap | Confidential DeFi');
      assert.match(layout.oracle, /^\$[\d,.]+$/);
      assert(layout.landingVisible);
      assert.equal(await page.locator('.app-sidebar').count(), 0, 'landing must not render the application sidebar');
      assert.equal(await page.locator('.mobile-bottom-nav').count(), 0, 'landing must not render application navigation');
      assert.equal(await page.getByRole('button', { name: /connect wallet/i }).count(), 0, 'landing must not request a wallet connection');

      await page.locator('.landing-hero .launch-button').click();
      await page.waitForURL(`${url}/app/trade`);
      await page.locator('.page-heading h1').filter({ hasText: 'Trade' }).waitFor();
      assert.equal(await page.title(), 'Trade | NoxSwap');
      const primaryNav = page.getByTestId(viewport.width <= 900 ? 'mobile-primary-nav' : 'desktop-primary-nav');
      assert(await primaryNav.isVisible(), `${viewport.name} primary navigation is not visible`);
      if (viewport.width > 900) {
        assert(await page.locator('.app-sidebar .compact-wallet').isVisible(), 'desktop private wallet is not persistent');
      } else {
        await page.getByRole('button', { name: 'Open private wallet' }).click();
        await page.locator('.mobile-wallet-drawer .compact-wallet').waitFor();
        await page.getByRole('button', { name: 'Close private wallet' }).click();
      }

      await page.getByRole('tab', { name: 'Limit orders' }).click();
      await page.waitForURL(`${url}/app/trade?mode=orders`);
      await page.getByRole('heading', { name: 'Confidential limit order' }).waitFor();

      await primaryNav.locator('a[href="/app/wallet"]').click();
      await page.waitForURL(`${url}/app/wallet`);
      await page.locator('.page-heading h1').filter({ hasText: 'Wallet' }).waitFor();
      assert.equal(await page.title(), 'Wallet | NoxSwap');
      await page.getByRole('tab', { name: 'Auditor access' }).click();
      await page.waitForURL(`${url}/app/wallet?tab=access`);
      await page.getByRole('heading', { name: 'Grant an auditor access' }).waitFor();

      await primaryNav.locator('a[href="/app/activity"]').click();
      await page.waitForURL(`${url}/app/activity`);
      await page.locator('.page-heading h1').filter({ hasText: 'Activity' }).waitFor();
      assert.equal(await page.title(), 'Activity | NoxSwap');
      const appLayout = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      assert(appLayout.scrollWidth <= appLayout.clientWidth, `${viewport.name} app has horizontal overflow`);
      await page.screenshot({ path: `/tmp/noxswap-app-${viewport.name}.png`, fullPage: true });
      results.push({
        viewport: `${viewport.width}x${viewport.height}`,
        ...layout,
        appLayout,
        landingScreenshot: `/tmp/noxswap-${viewport.name}.png`,
        appScreenshot: `/tmp/noxswap-app-${viewport.name}.png`,
      });
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
    await walletPage.goto(`${url}/app/wallet`, { waitUntil: 'networkidle' });
    await walletPage.locator('.sidebar-account').filter({ hasText: '0xE412' }).waitFor();
    await walletPage.locator('.faucet-item .cooldown').first().waitFor();
    assert(await walletPage.locator('.faucet-item .cooldown').count() >= 2, 'live faucet cooldowns are not visible');
    const cooldownRow = walletPage.locator('.faucet-item').filter({ has: walletPage.locator('.cooldown') }).first();
    const cooldownSymbol = await cooldownRow.locator('span').textContent();
    const cooldownButton = cooldownRow.getByRole('button');
    await walletPage.waitForFunction((button) => !button.disabled, await cooldownButton.elementHandle());
    await cooldownButton.click();
    await walletPage.getByText(new RegExp(`${cooldownSymbol} faucet is cooling down`)).waitFor();

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
