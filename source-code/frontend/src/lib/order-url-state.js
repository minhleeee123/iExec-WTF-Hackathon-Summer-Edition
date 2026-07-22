import { ORDER_STATE } from './orders.js';

export const DEFAULT_ORDER_URL_STATE = Object.freeze({
  status: 'all',
  owner: 'all',
  side: 'all',
  sort: 'newest',
  page: 1,
  order: null,
});

const VALID_STATUS = new Set(['all', ...Object.values(ORDER_STATE)]);
const VALID_OWNER = new Set(['all', 'mine']);
const VALID_SIDE = new Set(['all', 'buy', 'sell']);
const VALID_SORT = new Set(['newest', 'oldest', 'expiry', 'trigger']);

function positiveInteger(value, fallback) {
  return /^\d+$/.test(value ?? '') && Number(value) > 0 ? Number(value) : fallback;
}

export function parseOrderUrlState(searchParams) {
  return {
    status: VALID_STATUS.has(searchParams.get('status')) ? searchParams.get('status') : DEFAULT_ORDER_URL_STATE.status,
    owner: VALID_OWNER.has(searchParams.get('owner')) ? searchParams.get('owner') : DEFAULT_ORDER_URL_STATE.owner,
    side: VALID_SIDE.has(searchParams.get('side')) ? searchParams.get('side') : DEFAULT_ORDER_URL_STATE.side,
    sort: VALID_SORT.has(searchParams.get('sort')) ? searchParams.get('sort') : DEFAULT_ORDER_URL_STATE.sort,
    page: positiveInteger(searchParams.get('page'), DEFAULT_ORDER_URL_STATE.page),
    order: positiveInteger(searchParams.get('order'), DEFAULT_ORDER_URL_STATE.order),
  };
}

export function serializeOrderUrlState(state) {
  const params = new URLSearchParams({ mode: 'orders' });
  if (state.status !== DEFAULT_ORDER_URL_STATE.status) params.set('status', state.status);
  if (state.owner !== DEFAULT_ORDER_URL_STATE.owner) params.set('owner', state.owner);
  if (state.side !== DEFAULT_ORDER_URL_STATE.side) params.set('side', state.side);
  if (state.sort !== DEFAULT_ORDER_URL_STATE.sort) params.set('sort', state.sort);
  if (state.page > 1) params.set('page', String(state.page));
  if (state.order) params.set('order', String(state.order));
  return params;
}

export function updateOrderUrlState(current, patch) {
  const next = { ...current, ...patch };
  if ('status' in patch || 'owner' in patch || 'side' in patch || 'sort' in patch) next.page = 1;
  return next;
}
