import { load } from 'cheerio';

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

export function extractMainContent(html: string): string {
  const $ = load(html);

  const selectorCandidates = [
    '#dic_area',
    '#newsct_article',
    '#articeBody',
    'article',
    '.news_end',
    '#articleBodyContents',
  ];

  for (const selector of selectorCandidates) {
    const node = $(selector).first();
    if (node.length) {
      const text = normalizeWhitespace(node.text());
      if (text.length > 120) {
        return text;
      }
    }
  }

  const bodyText = normalizeWhitespace($('body').text());
  return bodyText;
}
