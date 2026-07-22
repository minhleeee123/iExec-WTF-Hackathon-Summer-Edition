import test from 'node:test';
import assert from 'node:assert/strict';
import { filterOrders, paginateOrders, selectOrders, sortOrders } from './order-filters.js';
import { parseOrderUrlState, serializeOrderUrlState, updateOrderUrlState } from './order-url-state.js';
import {
  CONTRACT_ORDER_STATUS,
  ORDER_STATE,
  deriveOrderState,
  getOrderPermissions,
  getOrderSide,
  settlementOutcome,
  shouldDecryptSettlement,
} from './orders.js';

const owner = '0x0000000000000000000000000000000000000001';
const stranger = '0x0000000000000000000000000000000000000002';
const orders = [
  { id: '1', owner, tokenIn: 'cUSDC', state: ORDER_STATE.EXECUTED, expiry: 300, triggerPrice: 3000n },
  { id: '2', owner: stranger, tokenIn: 'cETH', state: ORDER_STATE.EXECUTABLE, expiry: 200, triggerPrice: 2000n },
  { id: '3', owner, tokenIn: 'cUSDC', state: ORDER_STATE.OPEN, expiry: 100, triggerPrice: 1000n },
];

test('maps contract and operational order states without hiding terminal status behind oracle errors', () => {
  assert.equal(deriveOrderState({ contractStatus: CONTRACT_ORDER_STATUS.OPEN, blockTimestamp: 10, expiry: 20, canExecute: false }), ORDER_STATE.OPEN);
  assert.equal(deriveOrderState({ contractStatus: CONTRACT_ORDER_STATUS.OPEN, blockTimestamp: 10, expiry: 20, canExecute: true }), ORDER_STATE.EXECUTABLE);
  assert.equal(deriveOrderState({ contractStatus: CONTRACT_ORDER_STATUS.OPEN, blockTimestamp: 21, expiry: 20 }), ORDER_STATE.EXPIRED);
  assert.equal(deriveOrderState({ contractStatus: CONTRACT_ORDER_STATUS.OPEN, blockTimestamp: 10, expiry: 20, oracleAvailable: false }), ORDER_STATE.ORACLE_UNAVAILABLE);
  assert.equal(deriveOrderState({ contractStatus: CONTRACT_ORDER_STATUS.EXECUTED, blockTimestamp: 10, expiry: 20, oracleAvailable: false }), ORDER_STATE.EXECUTED);
  assert.equal(deriveOrderState({ contractStatus: CONTRACT_ORDER_STATUS.CANCELLED, blockTimestamp: 10, expiry: 20 }), ORDER_STATE.CANCELLED);
  assert.equal(deriveOrderState({ contractStatus: CONTRACT_ORDER_STATUS.EXPIRED, blockTimestamp: 10, expiry: 20 }), ORDER_STATE.EXPIRED);
});

test('derives buy and sell trigger direction from input token', () => {
  assert.equal(getOrderSide('cUSDC'), 'buy');
  assert.equal(getOrderSide('cETH'), 'sell');
});

test('filters, sorts, and paginates public orders', () => {
  assert.deepEqual(filterOrders(orders, { status: 'all', owner: 'mine', side: 'all' }, owner).map((item) => item.id), ['1', '3']);
  assert.deepEqual(filterOrders(orders, { status: 'all', owner: 'all', side: 'sell' }, '').map((item) => item.id), ['2']);
  assert.deepEqual(sortOrders(orders, 'newest').map((item) => item.id), ['3', '2', '1']);
  assert.deepEqual(sortOrders(orders, 'expiry').map((item) => item.id), ['3', '2', '1']);
  assert.deepEqual(sortOrders(orders, 'trigger').map((item) => item.id), ['3', '2', '1']);
  assert.deepEqual(paginateOrders(Array.from({ length: 12 }, (_, index) => index), 2).items, [10, 11]);
  assert.equal(selectOrders(orders, { status: 'all', owner: 'all', side: 'all', sort: 'newest', page: 99 }).page, 1);
});

test('parses and serializes shareable orderbook URL state', () => {
  const parsed = parseOrderUrlState(new URLSearchParams('mode=orders&status=executable&owner=mine&side=buy&page=2&order=12'));
  assert.deepEqual(parsed, { status: 'executable', owner: 'mine', side: 'buy', sort: 'newest', page: 2, order: 12 });
  assert.equal(serializeOrderUrlState(parsed).toString(), 'mode=orders&status=executable&owner=mine&side=buy&page=2&order=12');
  assert.equal(serializeOrderUrlState({ ...parsed, status: 'all', owner: 'all', side: 'all', page: 1, order: null }).toString(), 'mode=orders');
  assert.equal(updateOrderUrlState(parsed, { status: 'open' }).page, 1);
});

test('owner and non-owner permissions never authorize private reveal for an executor', () => {
  assert.deepEqual(getOrderPermissions({ account: owner, contractStatus: 0, owner, state: ORDER_STATE.EXECUTABLE }), {
    canCancel: true, canExecute: true, canExpire: false, canReveal: true, isOwner: true,
  });
  assert.equal(getOrderPermissions({ account: stranger, contractStatus: 0, owner, state: ORDER_STATE.EXECUTABLE }).canReveal, false);
  assert.equal(getOrderPermissions({ account: stranger, contractStatus: 0, owner, state: ORDER_STATE.EXECUTABLE }).canExecute, true);
  assert.equal(getOrderPermissions({ account: stranger, contractStatus: 0, owner, state: ORDER_STATE.EXPIRED }).canExpire, true);
  assert.equal(getOrderPermissions({ account: stranger, contractStatus: 0, owner, state: ORDER_STATE.EXPIRED }).canCancel, false);
  assert.equal(shouldDecryptSettlement({ caller: stranger, owner, transactionConfirmed: true }), false);
  assert.equal(shouldDecryptSettlement({ caller: owner, owner, transactionConfirmed: true }), true);
});

test('post-confirmation decryption errors do not negate a mined transaction', () => {
  assert.deepEqual(settlementOutcome({ transactionHash: '0xabc', decryptionError: 'ACL denied' }), {
    confirmed: true,
    transactionHash: '0xabc',
    decrypted: null,
    decryptionWarning: 'ACL denied',
  });
});
