import { formatEther } from 'ethers';

export function createHealthState({ chainId = 11155111, keeperAddress = null, minBalanceWei = 0n, errorThreshold = 3 } = {}) {
  return {
    chainId,
    keeperAddress,
    minBalanceWei,
    errorThreshold,
    keeperBalanceWei: null,
    lastCycleAt: null,
    lastSuccessfulRpcAt: null,
    lastAction: null,
    consecutiveErrors: 0,
    fatalError: '',
  };
}

export function recordKeeperCycle(state, { balanceWei = state.keeperBalanceWei, rpcSuccess = true, error = '' } = {}) {
  state.lastCycleAt = new Date().toISOString();
  state.keeperBalanceWei = balanceWei;
  if (rpcSuccess) {
    state.lastSuccessfulRpcAt = state.lastCycleAt;
    state.consecutiveErrors = 0;
  } else {
    state.consecutiveErrors += 1;
  }
  if (error) state.fatalError = error;
  return state;
}

export function recordKeeperAction(state, action) {
  state.lastAction = action;
  return state;
}

export function getHealthSnapshot(state) {
  const lowBalance = state.keeperBalanceWei !== null && state.keeperBalanceWei < state.minBalanceWei;
  const status = state.fatalError || state.consecutiveErrors >= state.errorThreshold
    ? 'error'
    : lowBalance || state.consecutiveErrors > 0 ? 'degraded' : 'ok';
  return {
    status,
    chainId: state.chainId,
    keeperAddress: state.keeperAddress,
    keeperBalanceEth: state.keeperBalanceWei === null ? null : formatEther(state.keeperBalanceWei),
    lastCycleAt: state.lastCycleAt,
    lastSuccessfulRpcAt: state.lastSuccessfulRpcAt,
    lastAction: state.lastAction,
    consecutiveErrors: state.consecutiveErrors,
  };
}
