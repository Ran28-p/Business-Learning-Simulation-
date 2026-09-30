/**
 * Formatting utilities for currency and numbers
 */
export function formatRupiah(value) {
  const num = Number(value) || 0;
  return `Rp ${num.toLocaleString('id-ID')}`;
}

export function formatNumber(value) {
  const num = Number(value) || 0;
  return num.toLocaleString('id-ID');
}

export function parseAmount(value) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}
