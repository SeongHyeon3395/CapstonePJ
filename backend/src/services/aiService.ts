import { env } from '../config/env';
import { openai } from '../config/openai';
import type { NewsStats, Stance } from '../types/news';
import { clampPercent, cosineSimilarity } from '../utils/math';

const STANCE_VALUES: Stance[] = ['찬성', '반대', '중립'];

export async function createEmbedding(text: string): Promise<number[]> {
  const input = text.slice(0, 6000);
  const response = await openai.embeddings.create({
    model: env.openaiEmbedModel,
    input,
  });

  return response.data[0].embedding;
}

export async function calculateSimilarityScore(title: string, content: string): Promise<number> {
  const [titleVec, contentVec] = await Promise.all([
    createEmbedding(title),
    createEmbedding(content.slice(0, 6000)),
  ]);

  const similarity = cosineSimilarity(titleVec, contentVec);
  return clampPercent(similarity * 100);
}

export async function classifyStance(content: string, keyword: string): Promise<Stance> {
  const prompt = [
    '너는 뉴스 본문 입장 분류기다.',
    `이슈 키워드: ${keyword}`,
    '반드시 찬성, 반대, 중립 중 하나만 답하라.',
    '응답 형식은 JSON 한 줄: {"stance":"찬성"}',
  ].join('\n');

  try {
    const response = await openai.chat.completions.create({
      model: env.openaiChatModel,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: content.slice(0, 5000) },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(raw) as { stance?: string };
    if (parsed.stance && STANCE_VALUES.includes(parsed.stance as Stance)) {
      return parsed.stance as Stance;
    }

    return '중립';
  } catch {
    return '중립';
  }
}

export async function summarizeStats(stats: NewsStats): Promise<string> {
  const fallback = [
    `총 ${stats.total}건 기사 기준 최다 입장은 ${findDominant(stats)}입니다.`,
    `찬성 ${stats.agree_percent}%, 반대 ${stats.oppose_percent}%, 중립 ${stats.neutral_percent}%로 집계되었습니다.`,
    '모든 비율은 기사 실제 건수(Count)에서 계산되었습니다.',
  ].join('\n');

  if (stats.total === 0) {
    return fallback;
  }

  try {
    const response = await openai.chat.completions.create({
      model: env.openaiChatModel,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            '너는 뉴스 통계 설명 도우미다. 반드시 숫자를 바꾸지 말고, 입력된 수치만 사용해 3줄 한국어 요약을 작성하라.',
        },
        {
          role: 'user',
          content: JSON.stringify(stats),
        },
      ],
    });

    return response.choices[0]?.message?.content?.trim() || fallback;
  } catch {
    return fallback;
  }
}

function findDominant(stats: NewsStats): Stance {
  const candidates: Array<{ label: Stance; count: number }> = [
    { label: '찬성', count: stats.agree_count },
    { label: '반대', count: stats.oppose_count },
    { label: '중립', count: stats.neutral_count },
  ];

  candidates.sort((a, b) => b.count - a.count);
  return candidates[0].label;
}

export async function answerFromArticle(content: string, question: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: env.openaiChatModel,
    temperature: 0,
    messages: [
      {
        role: 'system',
        content:
          '주어진 기사 본문에서만 근거를 찾아 답하라. 본문 근거가 없으면 반드시 "알 수 없습니다"라고 답하라. 4문장 이내로 간결하게 답하라.',
      },
      {
        role: 'user',
        content: `질문: ${question}\n\n기사 본문:\n${content.slice(0, 12000)}`,
      },
    ],
  });

  return response.choices[0]?.message?.content?.trim() || '알 수 없습니다';
}
