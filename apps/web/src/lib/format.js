import { ethers } from 'ethers';
import { ZERO_HANDLE } from '../config';

export const shorten = (value, head = 6, tail = 4) =>
  value ? `${value.slice(0, head)}...${value.slice(-tail)}` : '--';

export const isHandle = (value) => Boolean(value && value !== ZERO_HANDLE);

export const formatToken = (value, decimals, maximumFractionDigits = 6) =>
  Number(ethers.formatUnits(value, decimals)).toLocaleString(undefined, { maximumFractionDigits });

export const formatInputAmount = (value, decimals) => ethers.formatUnits(value, decimals);

export const formatDuration = (seconds) => {
  const safeSeconds = Math.max(0, Math.ceil(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainder = safeSeconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
    : `${minutes}:${String(remainder).padStart(2, '0')}`;
};

export const decodeReceiptImage = (tokenUri) => {
  if (!tokenUri?.startsWith('data:application/json;base64,')) return '';
  const json = JSON.parse(atob(tokenUri.split(',')[1]));
  return json.image ?? '';
};
