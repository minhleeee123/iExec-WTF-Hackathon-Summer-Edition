import { ORDER_STATE, getOrderSide, isOrderOwner } from './orders.js';

export const ORDER_PAGE_SIZE = 10;

export function filterOrders(orders, filters, account = '') {
  return orders.filter((order) => {
    if (filters.status !== 'all' && order.state !== filters.status) return false;
    if (filters.owner === 'mine' && !isOrderOwner(account, order.owner)) return false;
    if (filters.side !== 'all' && getOrderSide(order.tokenIn) !== filters.side) return false;
    return true;
  });
}

export function sortOrders(orders, sort) {
  const next = [...orders];
  if (sort === 'oldest') return next.sort((a, b) => Number(a.id) - Number(b.id));
  if (sort === 'expiry') {
    return next.sort((a, b) => {
      const aTerminal = [ORDER_STATE.EXECUTED, ORDER_STATE.CANCELLED].includes(a.state);
      const bTerminal = [ORDER_STATE.EXECUTED, ORDER_STATE.CANCELLED].includes(b.state);
      if (aTerminal !== bTerminal) return aTerminal ? 1 : -1;
      return a.expiry - b.expiry;
    });
  }
  if (sort === 'trigger') return next.sort((a, b) => a.triggerPrice < b.triggerPrice ? -1 : a.triggerPrice > b.triggerPrice ? 1 : 0);
  return next.sort((a, b) => Number(b.id) - Number(a.id));
}

export function paginateOrders(orders, requestedPage, pageSize = ORDER_PAGE_SIZE) {
  const pageCount = Math.max(1, Math.ceil(orders.length / pageSize));
  const page = Math.min(Math.max(1, Number(requestedPage) || 1), pageCount);
  const start = (page - 1) * pageSize;
  return { items: orders.slice(start, start + pageSize), page, pageCount, total: orders.length };
}

export function selectOrders(orders, filters, account = '', pageSize = ORDER_PAGE_SIZE) {
  return paginateOrders(sortOrders(filterOrders(orders, filters, account), filters.sort), filters.page, pageSize);
}
