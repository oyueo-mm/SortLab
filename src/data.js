export const patterns = [
  { id: 'random', name: '무작위', icon: 'shuffle' },
  { id: 'ascending', name: '정렬됨', icon: 'arrow-up-wide-narrow' },
  { id: 'descending', name: '역순', icon: 'arrow-down-wide-narrow' },
  { id: 'nearly', name: '거의 정렬됨', icon: 'list-filter' },
  { id: 'duplicates', name: '중복 많음', icon: 'copy' },
  { id: 'mountain', name: '산 모양', icon: 'mountain' },
  { id: 'wave', name: '파형', icon: 'waves' }
];

export function generateData(count = 100, pattern = 'random', seed = Math.random()) {
  const n = Math.max(2, Math.trunc(count));
  let state = (Math.floor(seed * 0xffffffff) >>> 0) || 0x9e3779b9;
  const random = () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 4294967296; };
  const ordered = Array.from({ length: n }, (_, i) => i + 1);
  if (pattern === 'ascending') return ordered;
  if (pattern === 'descending') return ordered.reverse();
  if (pattern === 'nearly') { for (let i = 0; i < Math.max(1, Math.floor(n * 0.055)); i++) { const a = Math.floor(random() * n), b = Math.floor(random() * n); [ordered[a], ordered[b]] = [ordered[b], ordered[a]]; } return ordered; }
  if (pattern === 'duplicates') return ordered.map(() => 1 + Math.floor(random() * Math.max(2, Math.ceil(n / 9))));
  if (pattern === 'mountain') return ordered.map((_, i) => Math.max(1, Math.round(n * (1 - Math.abs((2 * i) / Math.max(1, n - 1) - 1)))));
  if (pattern === 'wave') return ordered.map((_, i) => Math.max(1, Math.round(n * (0.12 + 0.88 * (0.5 + 0.5 * Math.sin((i / n) * Math.PI * 6))))));
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [ordered[i], ordered[j]] = [ordered[j], ordered[i]]; }
  return ordered;
}
