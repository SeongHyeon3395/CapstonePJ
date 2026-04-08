export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').trim();
}

export function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, ' ').trim();
}

export function chunkText(text: string, chunkSize = 900): string[] {
  if (!text.trim()) {
    return [];
  }

  const chunks: string[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    chunks.push(text.slice(cursor, cursor + chunkSize));
    cursor += chunkSize;
  }
  return chunks;
}
