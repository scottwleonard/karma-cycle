const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc'];

export function formatNumber(n: number): string {
  if (n < 0) return '-' + formatNumber(-n);
  if (n < 10) return n.toFixed(1);
  if (n < 1000) return Math.floor(n).toString();
  const tier = Math.min(
    Math.floor(Math.log10(n) / 3),
    SUFFIXES.length - 1,
  );
  const suffix = SUFFIXES[tier];
  const scaled = n / Math.pow(10, tier * 3);
  return scaled.toFixed(1) + suffix;
}

export function formatRate(n: number): string {
  return formatNumber(n) + '/s';
}
