import { env } from '../config/env';
import { openai } from '../config/openai';
import type { NewsStats, Stance } from '../types/news';
import { clampPercent } from '../utils/math';

const STANCE_VALUES: Stance[] = ['찬성', '반대', '중립', '분류불가'];

interface AnalyzeArticleResult {
  stance: Stance;
  evidence: string;
  summary: string;
  aggroIndex: number;
}

type EvidenceForSentiment = {
  title: string;
  stance: Stance;
  evidence: string;
};

const POSITIVE_STANCE_HINTS = ['찬성', '긍정', '호의', '지지', '우호', 'positive', 'pro'];
const NEGATIVE_STANCE_HINTS = ['반대', '부정', '비판', '우려', '논란', 'negative', 'anti', 'con'];
const NEUTRAL_STANCE_HINTS = ['중립', '보류', '혼재', 'neutral'];

const POSITIVE_CUES = [
  '개선', '효과', '지원', '확대', '증가', '강화', '회복', '성장', '해소', '기대', '긍정', '호평', '찬성',
];

const NEGATIVE_CUES = [
  '우려', '논란', '비판', '반발', '갈등', '피해', '감소', '악화', '위험', '부작용', '부정', '반대', '문제',
];

function ensureOpenAiConfigured(): void {
  if (!env.hasOpenAiKey) {
    throw new Error('OPENAI_API_KEY가 설정되지 않아 AI 분석 기능을 사용할 수 없습니다. backend/.env를 확인해 주세요.');
  }
}

function normalizeStance(raw?: string): Stance | null {
  const value = String(raw ?? '').trim();
  if (!value) {
    return null;
  }

  if (STANCE_VALUES.includes(value as Stance)) {
    return value as Stance;
  }

  const compact = value.toLowerCase().replace(/\s+/g, '');

  if (POSITIVE_STANCE_HINTS.some((hint) => compact.includes(hint))) {
    return '찬성';
  }

  if (NEGATIVE_STANCE_HINTS.some((hint) => compact.includes(hint))) {
    return '반대';
  }

  if (NEUTRAL_STANCE_HINTS.some((hint) => compact.includes(hint))) {
    return '중립';
  }

  if (compact.includes('분류불가') || compact.includes('불명') || compact.includes('unknown')) {
    return '분류불가';
  }

  return null;
}

function countCueMatches(text: string, cues: string[]): number {
  const normalized = text.toLowerCase();
  let score = 0;
  for (const cue of cues) {
    if (normalized.includes(cue.toLowerCase())) {
      score += 1;
    }
  }
  return score;
}

function inferStanceFromText(title: string, content: string): Stance {
  const text = `${title} ${content.slice(0, 2500)}`;
  const positiveScore = countCueMatches(text, POSITIVE_CUES);
  const negativeScore = countCueMatches(text, NEGATIVE_CUES);

  if (positiveScore === 0 && negativeScore === 0) {
    return '중립';
  }

  if (negativeScore > positiveScore) {
    return '반대';
  }

  if (positiveScore > negativeScore) {
    return '찬성';
  }

  return '중립';
}

function tokenizeForOverlap(text: string): string[] {
  return (text.match(/[0-9A-Za-z가-힣]{2,}/g) ?? []).map((token) => token.toLowerCase());
}

function estimateAggroIndex(title: string, content: string): number {
  const titleTokens = Array.from(new Set(tokenizeForOverlap(title))).filter((token) => token.length >= 2);
  const contentTokens = new Set(tokenizeForOverlap(content.slice(0, 6000)));

  if (titleTokens.length === 0) {
    return 0;
  }

  let overlap = 0;
  for (const token of titleTokens) {
    if (contentTokens.has(token)) {
      overlap += 1;
    }
  }

  const ratio = overlap / titleTokens.length;

  if (content.trim().length === 0) {
    return 0;
  }

  const scaled = 15 + ratio * 80;
  return clampPercent(scaled);
}

function tryParseJsonObject(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
      } catch {
        return {};
      }
    }
    return {};
  }
}

function pickNumeric(parsed: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const candidate = Number(parsed[key]);
    if (Number.isFinite(candidate)) {
      return candidate;
    }
  }
  return null;
}

export async function createEmbedding(text: string): Promise<number[]> {
  ensureOpenAiConfigured();
  const input = text.slice(0, 6000);
  const response = await openai.embeddings.create({
    model: env.openaiEmbedModel,
    input,
    dimensions: env.openaiEmbedDimensions,
  });

  return response.data[0].embedding;
}

export async function analyzeArticle(keyword: string, title: string, content: string): Promise<AnalyzeArticleResult> {
  ensureOpenAiConfigured();
  const systemPrompt = [
    '# System Prompt (Role: Senior News Analyst)',
    '당신은 뉴스 데이터에서 객관적인 지표를 추출하는 전문가입니다.',
    '주어진 기사 본문을 분석하여 반드시 JSON 형식으로만 응답하세요.',
    '# Analysis Tasks',
    `1. stance: [${keyword}]에 대해 기사가 취하는 명확한 입장 ("찬성", "반대", "중립" 중 택1)`,
    '2. evidence: 해당 입장을 취하는 결정적 근거 문장을 본문에서 찾아 1문장으로 요약',
    '3. aggro_index: 제목과 본문 일치도(0~100)',
    '4. summary: 기사 내용을 2줄로 요약(문자열)',
    '# Constraints',
    '- 본문에 근거가 부족하면 중립으로 분류',
    '- 오직 제공된 본문만 근거로 사용',
    '# Response Format (JSON)',
    '{"stance":"String","evidence":"String","aggro_index":Number,"summary":"String"}',
  ].join('\n');

  const userPrompt = `키워드: ${keyword}\n제목: ${title}\n본문: ${content.slice(0, 1500)}`;
  const heuristicAggro = estimateAggroIndex(title, content);
  const heuristicStance = inferStanceFromText(title, content);

  try {
    const response = await openai.chat.completions.create({
      model: env.openaiChatModel,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? '{}';
    const parsed = tryParseJsonObject(raw);

    const normalizedStance = normalizeStance(String(parsed.stance ?? parsed.sentiment ?? ''));
    const stance = normalizedStance && normalizedStance !== '분류불가'
      ? normalizedStance
      : heuristicStance;

    const modelAggro = pickNumeric(parsed, ['aggro_index', 'aggroIndex', 'similarity_score', 'similarityScore']);
    const aggroIndex = clampPercent(modelAggro !== null && modelAggro > 0 ? modelAggro : heuristicAggro);

    const evidenceRaw = String(parsed.evidence ?? parsed.reason ?? '').trim();
    const evidence = evidenceRaw || '본문에서 명확한 근거 문장을 추출하지 못했습니다.';

    const summaryRaw = String(parsed.summary ?? parsed.short_summary ?? '').trim();
    const summary = summaryRaw || '요약 생성 실패\n요약 생성 실패';

    return {
      stance,
      evidence,
      summary,
      aggroIndex,
    };
  } catch {
    return {
      stance: heuristicStance,
      evidence: 'AI 분석 중 오류가 발생해 근거 문장을 생성하지 못했습니다.',
      summary: '요약 생성 실패\n요약 생성 실패',
      aggroIndex: heuristicAggro,
    };
  }
}

export async function summarizeStats(keyword: string, stats: NewsStats): Promise<string> {
  ensureOpenAiConfigured();
  const fallback = [
    `'${keyword}' 이슈 기사 ${stats.total_analyzed}건 중 찬성 ${stats.statistics.agree.count}건, 반대 ${stats.statistics.oppose.count}건, 중립 ${stats.statistics.neutral.count}건입니다.`,
    '각 기사의 분류 근거(evidence)와 원문 URL을 함께 제공해 수치의 출처를 투명하게 확인할 수 있습니다.',
  ].join('\n');

  if (stats.total_analyzed === 0) {
    return fallback;
  }

  try {
    const response = await openai.chat.completions.create({
      model: env.openaiChatModel,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: '너는 뉴스 통계 보고서 작성 도우미다. 숫자를 바꾸지 말고 2~3문장으로 핵심 쟁점을 요약하라.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            keyword,
            total_analyzed: stats.total_analyzed,
            statistics: stats.statistics,
            evidence_sample: stats.evidence_list.slice(0, 10).map((item) => ({
              title: item.title,
              stance: item.stance,
              evidence: item.evidence,
            })),
          }),
        },
      ],
    });

    return response.choices[0]?.message?.content?.trim() || fallback;
  } catch {
    return fallback;
  }
}

export async function summarizeSentimentReasons(
  keyword: string,
  evidences: EvidenceForSentiment[],
): Promise<{ positive: string; negative: string }> {
  ensureOpenAiConfigured();
  const fallback = {
    positive:
      evidences.find((item) => item.stance === '찬성')?.evidence ||
      '긍정적 관점의 근거가 충분하지 않아 추가 수집이 필요합니다.',
    negative:
      evidences.find((item) => item.stance === '반대')?.evidence ||
      '부정적 관점의 근거가 충분하지 않아 추가 수집이 필요합니다.',
  };

  if (evidences.length === 0) {
    return fallback;
  }

  try {
    const response = await openai.chat.completions.create({
      model: env.openaiChatModel,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            '너는 뉴스 근거를 2분류(긍정/부정)로 요약하는 분석가다. 제공된 evidence를 바탕으로 긍정 이유 1문장, 부정 이유 1문장을 JSON으로만 반환하라. 추측 금지.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            keyword,
            evidences: evidences.slice(0, 40),
            format: {
              positive_reason: 'string',
              negative_reason: 'string',
            },
          }),
        },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(raw) as {
      positive_reason?: string;
      negative_reason?: string;
    };

    return {
      positive: String(parsed.positive_reason ?? fallback.positive).trim(),
      negative: String(parsed.negative_reason ?? fallback.negative).trim(),
    };
  } catch {
    return fallback;
  }
}

export async function answerFromArticle(content: string, question: string): Promise<string> {
  const refusal = '해당 질문은 현재 보고 있는 기사와 관련이 없어 답변할 수 없습니다.';

  const response = await openai.chat.completions.create({
    model: env.openaiChatModel,
    temperature: 0,
    messages: [
      {
        role: 'system',
        content:
          [
            '너는 기사 전용 Q&A 도우미다.',
            '반드시 제공된 기사 본문에서만 근거를 찾아 답하라.',
            `질문이 기사와 무관하거나 기사 본문으로 답할 수 없으면 정확히 "${refusal}" 라고만 답하라.`,
            '외부 지식, 추측, 일반 상식 보충 설명은 금지한다.',
            '답변은 최대 4문장으로 간결하게 작성한다.',
          ].join(' '),
      },
      {
        role: 'user',
        content: `질문: ${question}\n\n기사 본문:\n${content.slice(0, 12000)}`,
      },
    ],
  });

  const answer = response.choices[0]?.message?.content?.trim() || refusal;
  if (!answer) {
    return refusal;
  }

  return answer;
}
