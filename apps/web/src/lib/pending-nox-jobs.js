const STORAGE_NAMESPACE = 'noxswap.pending-nox-jobs.v1';
const MAX_JOBS = 20;
const ALLOWED_TYPES = new Set(['personal-swap', 'safe-swap', 'personal-unwrap', 'safe-unwrap']);

function normalizeAddress(value) {
  return typeof value === 'string' ? value.toLowerCase() : '';
}

export function sanitizePendingNoxJob(job) {
  const normalized = {
    account: normalizeAddress(job.account),
    chainId: Number(job.chainId),
    contract: job.contract,
    createdAt: Number(job.createdAt ?? Date.now()),
    handles: Array.isArray(job.handles) ? job.handles.filter((value) => typeof value === 'string').slice(0, 4) : [],
    operationType: job.operationType,
    transactionHash: job.transactionHash,
  };
  if (
    !normalized.account
    || !Number.isInteger(normalized.chainId)
    || !ALLOWED_TYPES.has(normalized.operationType)
    || typeof normalized.contract !== 'string'
    || typeof normalized.transactionHash !== 'string'
    || normalized.handles.length === 0
  ) {
    throw new Error('Invalid pending Nox job metadata.');
  }
  return normalized;
}

export function pendingNoxJobId(job) {
  return `${job.chainId}:${job.transactionHash.toLowerCase()}:${job.operationType}`;
}

export function loadPendingNoxJobs(storage, { account, chainId } = {}) {
  try {
    const parsed = JSON.parse(storage.getItem(STORAGE_NAMESPACE) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((job) => {
        try { return sanitizePendingNoxJob(job); } catch { return null; }
      })
      .filter(Boolean)
      .filter((job) => !account || job.account === normalizeAddress(account))
      .filter((job) => chainId === undefined || job.chainId === Number(chainId));
  } catch {
    return [];
  }
}

export function savePendingNoxJob(storage, job) {
  const normalized = sanitizePendingNoxJob(job);
  const jobs = loadPendingNoxJobs(storage);
  const id = pendingNoxJobId(normalized);
  const next = [
    normalized,
    ...jobs.filter((candidate) => pendingNoxJobId(candidate) !== id),
  ].slice(0, MAX_JOBS);
  try { storage.setItem(STORAGE_NAMESPACE, JSON.stringify(next)); } catch { /* Recovery cache is best-effort. */ }
  return normalized;
}

export function removePendingNoxJob(storage, job) {
  const id = pendingNoxJobId(job);
  const next = loadPendingNoxJobs(storage)
    .filter((candidate) => pendingNoxJobId(candidate) !== id);
  try { storage.setItem(STORAGE_NAMESPACE, JSON.stringify(next)); } catch { /* Recovery cache is best-effort. */ }
}
