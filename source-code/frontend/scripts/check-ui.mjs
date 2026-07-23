import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';

const port = 4174;
const url = `http://127.0.0.1:${port}`;
const rpcUrl = 'https://eth-sepolia.api.onfinality.io/public';
const testAddress = '0xE412d04DA2A211F7ADC80311CC0FF9F03440B64E';
let actionableOrderId = null;
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

async function installReadOnlyWallet(page, address, { mockRecentClaims = false } = {}) {
  await page.exposeFunction('__rpcRequest', async (method, params = []) => {
    const callData = params[0]?.data ?? params[0]?.input ?? '';
    if (mockRecentClaims && method === 'eth_call' && callData.startsWith('0x03822d3b')) {
      const recentClaim = Math.floor(Date.now() / 1000).toString(16).padStart(64, '0');
      return `0x${recentClaim}`;
    }
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    });
    const payload = await response.json();
    if (payload.error) throw new Error(payload.error.message);
    return payload.result;
  });
  await page.addInitScript(({ walletAddress }) => {
    const listeners = new Map();
    window.ethereum = {
      isMetaMask: true,
      request: ({ method, params = [] }) => {
        if (method === 'eth_accounts' || method === 'eth_requestAccounts') return Promise.resolve([walletAddress]);
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
  }, { walletAddress: address });
}

const results = [];
const recordConsoleError = (errors) => (message) => {
  if (message.type() !== 'error') return;
  const text = message.text();
  if (/Failed to load resource: the server responded with a status of (403|429)/.test(text)) return;
  errors.push(text);
};
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
      let agentRequest = null;
      await page.route('**/api/agent/plan', async (route) => {
        agentRequest = route.request().postDataJSON();
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            plan: {
              version: 1,
              supported: true,
              unsupportedReason: '',
              action: 'limit_order',
              side: 'sell',
              amountMode: 'exact',
              amountValue: '0.01',
              triggerPriceUsd: '2500',
              slippageBps: 100,
              expiryMinutes: 360,
              requiresWrap: false,
              summary: 'Sell 0.01 cETH if ETH reaches $2,500.',
              riskNote: 'Execution depends on oracle freshness and encrypted pool liquidity.',
            },
            meta: { provider: 'groq', model: 'openai/gpt-oss-20b', requestId: 'ui-test' },
          }),
        });
      });
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', recordConsoleError(errors));
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
      assert.equal(await page.locator('.onboarding-flow li').count(), 5, 'landing onboarding must contain five real workflow steps');
      assert.equal(await page.locator('.privacy-matrix > div').count(), 2, 'landing must explain public and encrypted data');
      assert.equal(await page.locator('.faq-list details').count(), 9, 'landing must contain the complete FAQ set');
      await page.locator('.faq-list summary').first().click();
      assert(await page.locator('.faq-list details').first().evaluate((element) => element.open), 'FAQ disclosure must open');
      assert.match(await page.locator('.landing-footer').textContent(), /Testnet only/i);

      await page.locator('.landing-hero .launch-button').click();
      await page.waitForURL(`${url}/app/trade`);
      await page.locator('.page-heading h1').filter({ hasText: 'Trade' }).waitFor();
      assert.equal(await page.title(), 'Trade | NoxSwap');
      const getNav = () => page.getByTestId(viewport.width <= 900 ? 'mobile-primary-nav' : 'desktop-primary-nav');
      assert(await getNav().isVisible(), `${viewport.name} primary navigation is not visible`);
      if (viewport.width > 900) {
        assert(await page.locator('.app-sidebar .compact-wallet').isVisible(), 'desktop private wallet is not persistent');
      } else {
        await page.getByRole('button', { name: 'Open private wallet' }).click();
        await page.locator('.mobile-wallet-drawer .compact-wallet').waitFor();
        await page.getByRole('button', { name: 'Close private wallet' }).click();
      }

      await page.getByRole('tab', { name: 'Strategy Agent' }).click();
      await page.waitForURL(`${url}/app/trade?mode=agent`);
      await page.getByLabel('Trading intent').fill('Sell 0.01 cETH when ETH reaches $2,500. Expire in 6 hours.');
      await page.getByRole('button', { name: 'Generate private strategy draft' }).click();
      await page.getByText('DRAFT READY').waitFor();
      assert.deepEqual(Object.keys(agentRequest).sort(), ['intent', 'market']);
      assert.deepEqual(Object.keys(agentRequest.market).sort(), ['blockTimestamp', 'ethPriceUsd', 'oracleUpdatedAt']);
      assert.equal(JSON.stringify(agentRequest).match(/wallet|balance|handle|proof|signature/gi), null, 'agent request must contain only intent and public market context');
      await page.getByRole('button', { name: 'Apply to order form' }).click();
      assert.equal(await page.getByLabel('Limit order amount').inputValue(), '0.01');
      assert.equal(await page.getByLabel('ETH trigger price').inputValue(), '2500');
      assert.equal(await page.getByLabel('Limit order expiry minutes').inputValue(), '360');
      assert.equal(await page.getByLabel('Limit order oracle tolerance').inputValue(), '100');
      await page.waitForFunction(() => document.querySelector('[aria-label="Limit order minimum output"]')?.value === '24.67575');
      const agentLayout = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      assert(agentLayout.scrollWidth <= agentLayout.clientWidth, `${viewport.name} agent view has horizontal overflow`);
      await page.screenshot({ path: `/tmp/noxswap-agent-${viewport.name}.png`, fullPage: true });

      await page.getByRole('tab', { name: 'Limit orders' }).click();
      await page.waitForURL(`${url}/app/trade?mode=orders`);
      await page.getByRole('heading', { name: 'Confidential limit order' }).waitFor();
      await page.locator('.public-order-row').first().waitFor({ timeout: 30_000 });
      const publicOrderCount = await page.locator('.public-order-row').count();
      assert(publicOrderCount >= 2, 'public orderbook must load real orders without a connected wallet');

      await page.getByLabel('Order status').selectOption('open');
      await page.locator('.public-order-row').first().waitFor();
      const openOrderText = await page.locator('.public-order-row .order-identity strong').first().textContent();
      const openOrderId = Number(openOrderText.match(/^#(\d+)/)?.[1]);
      assert(Number.isInteger(openOrderId), 'a live open order is required for owner permission UI tests');
      if (actionableOrderId === null) actionableOrderId = openOrderId;
      else assert.equal(openOrderId, actionableOrderId, 'desktop and mobile must read the same open order');
      await page.getByLabel('Order status').selectOption('all');
      await page.waitForURL(`${url}/app/trade?mode=orders`);

      await page.getByLabel('Order status').selectOption('executed');
      await page.waitForURL(/status=executed/);
      await page.locator('.public-order-row').first().waitFor();
      assert.equal(await page.getByLabel('Order status').inputValue(), 'executed');
      await page.goBack();
      await page.waitForURL(`${url}/app/trade?mode=orders`);
      assert.equal(await page.getByLabel('Order status').inputValue(), 'all', 'browser back must restore order filters');
      await page.goForward();
      await page.waitForURL(/status=executed/);
      assert.equal(await page.getByLabel('Order status').inputValue(), 'executed', 'browser forward must restore order filters');
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.locator('.public-order-row').first().waitFor({ timeout: 30_000 });
      assert.equal(await page.getByLabel('Order status').inputValue(), 'executed', 'order filter must survive reload');

      await page.getByLabel('Order status').selectOption('open');
      await page.locator('.public-order-row').first().click();
      await page.getByRole('dialog', { name: /order \d+ details/i }).waitFor();
      assert.match(page.url(), /[?&]order=\d+/);
      assert.equal(await page.locator('.order-detail-drawer').getByText('Encrypted amount', { exact: true }).count(), 1);
      assert.equal(await page.getByRole('button', { name: 'Reveal my order terms' }).count(), 0, 'read-only user must not see owner reveal');
      const drawerLayout = await page.locator('.order-detail-drawer').evaluate((element) => ({
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
      }));
      assert(drawerLayout.scrollWidth <= drawerLayout.clientWidth, `${viewport.name} order detail has horizontal overflow`);
      await page.screenshot({ path: `/tmp/noxswap-order-detail-${viewport.name}.png` });
      await page.getByRole('button', { name: 'Close order details' }).click();

      await page.goto(`${url}/app/wallet`);
      await page.locator('.page-heading h1').filter({ hasText: 'Wallet' }).waitFor();
      assert.equal(await page.title(), 'Wallet | NoxSwap');
      await page.getByRole('tab', { name: 'Auditor access' }).click();
      await page.waitForURL(`${url}/app/wallet?tab=access`);
      await page.getByRole('heading', { name: 'Grant an auditor access' }).waitFor();

      await page.goto(`${url}/app/activity`);
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
        publicOrderCount,
        drawerLayout,
        agentLayout,
        landingScreenshot: `/tmp/noxswap-${viewport.name}.png`,
        appScreenshot: `/tmp/noxswap-app-${viewport.name}.png`,
        agentScreenshot: `/tmp/noxswap-agent-${viewport.name}.png`,
        orderDetailScreenshot: `/tmp/noxswap-order-detail-${viewport.name}.png`,
      });
      await page.close();
    }

    const walletPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const walletErrors = [];
    walletPage.on('pageerror', (error) => walletErrors.push(error.message));
    walletPage.on('console', recordConsoleError(walletErrors));
    await installReadOnlyWallet(walletPage, testAddress, { mockRecentClaims: true });
    await walletPage.goto(`${url}/app/wallet`, { waitUntil: 'networkidle' });
    await walletPage.locator('.sidebar-account').filter({ hasText: '0xE412' }).waitFor();
    await walletPage.locator('.faucet-item .cooldown').first().waitFor({ timeout: 30_000 }).catch(async () => {
      const noticeText = await walletPage.locator('.notice').allTextContents();
      throw new Error(`Live wallet state did not load a faucet cooldown. Notices: ${noticeText.join(' | ')}. Runtime: ${walletErrors.join(' | ')}`);
    });
    assert(await walletPage.locator('.faucet-item .cooldown').count() >= 2, 'live faucet cooldowns are not visible');
    const cooldownRow = walletPage.locator('.faucet-item').filter({ has: walletPage.locator('.cooldown') }).first();
    const cooldownSymbol = await cooldownRow.locator('span').textContent();
    const cooldownButton = cooldownRow.getByRole('button');
    await walletPage.waitForFunction((button) => !button.disabled, await cooldownButton.elementHandle());
    await cooldownButton.click();
    await walletPage.getByText(new RegExp(`${cooldownSymbol} faucet is cooling down`)).waitFor();
    const cooldownNotice = await walletPage.locator('.notice.info').textContent();
    const faucetCooldowns = await walletPage.locator('.faucet-item .cooldown').allTextContents();

    const assetInput = walletPage.getByLabel('Asset amount');
    await assetInput.fill('999999999999999999999999');
    const assetSection = walletPage.locator('#assets');
    await assetSection.getByText('Amount exceeds your available balance.').waitFor();
    await walletPage.getByRole('button', { name: 'Unwrap', exact: true }).click();
    await assetSection.getByText('Reveal your private balance to validate this amount.').waitFor();
    await walletPage.getByRole('button', { name: 'Decrypt and show private balances' }).waitFor();
    const walletLayout = await walletPage.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    assert(walletLayout.scrollWidth <= walletLayout.clientWidth, 'connected wallet view has horizontal overflow');
    await walletPage.screenshot({ path: '/tmp/noxswap-wallet.png', fullPage: true });
    await walletPage.goto(`${url}/app/trade?mode=orders&order=${actionableOrderId}`, { waitUntil: 'domcontentloaded' });
    await walletPage.getByRole('dialog', { name: `Order ${actionableOrderId} details` }).waitFor({ timeout: 30_000 });
    await walletPage.getByRole('button', { name: 'Revoke OrderBook authorization' }).waitFor({ timeout: 30_000 });
    await walletPage.getByRole('button', { name: 'Reveal my order terms' }).waitFor({ timeout: 30_000 });
    await walletPage.getByRole('button', { name: 'Cancel order' }).waitFor();
    await walletPage.screenshot({ path: '/tmp/noxswap-order-owner.png' });
    assert.equal(walletErrors.length, 0, `wallet runtime errors: ${walletErrors.join('; ')}`);
    results.push({
      viewport: '1280x900-wallet',
      ...walletLayout,
      faucetCooldowns,
      cooldownNotice,
      excessAmountBlocked: true,
      privateBalanceRevealAvailable: true,
      screenshot: '/tmp/noxswap-wallet.png',
      ownerOrderScreenshot: '/tmp/noxswap-order-owner.png',
    });
    await walletPage.close();

    const executorPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const executorAddress = '0x0000000000000000000000000000000000000002';
    await installReadOnlyWallet(executorPage, executorAddress);
    await executorPage.goto(`${url}/app/trade?mode=orders&order=${actionableOrderId}`, { waitUntil: 'domcontentloaded' });
    await executorPage.getByRole('dialog', { name: `Order ${actionableOrderId} details` }).waitFor({ timeout: 30_000 });
    assert.equal(await executorPage.getByRole('button', { name: 'Cancel order' }).count(), 0, 'non-owner must not see cancel');
    assert.equal(await executorPage.getByRole('button', { name: 'Reveal my order terms' }).count(), 0, 'non-owner must not see reveal');
    await executorPage.screenshot({ path: '/tmp/noxswap-order-executor.png' });
    results.push({ viewport: '1280x900-non-owner', ownerControlsHidden: true, screenshot: '/tmp/noxswap-order-executor.png' });
    await executorPage.close();
  } finally {
    await browser.close();
  }
  console.log(JSON.stringify({ status: 'PASS', results }, null, 2));
} finally {
  server.kill('SIGTERM');
}
