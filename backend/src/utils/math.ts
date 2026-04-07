export function cosineSimilarity(a: number[], b: number[]): number {
  const length = Math.min(a.length, b.length);
  if (length === 0) {
    return 0;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function clampPercent(value: number): number {
  const clamped = Math.max(0, Math.min(100, value));
  return Math.round(clamped);
}

export function toFixedPercent(count: number, total: number): number {
  if (total === 0) {
    return 0;
  }
  return Number(((count / total) * 100).toFixed(1));
}
