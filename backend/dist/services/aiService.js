"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEmbedding = createEmbedding;
exports.analyzeArticle = analyzeArticle;
exports.summarizeStats = summarizeStats;
exports.answerFromArticle = answerFromArticle;
const env_1 = require("../config/env");
const openai_1 = require("../config/openai");
const math_1 = require("../utils/math");
const STANCE_VALUES = ['찬성', '반대', '중립', '분류불가'];
async function createEmbedding(text) {
    const input = text.slice(0, 6000);
    const response = await openai_1.openai.embeddings.create({
        model: env_1.env.openaiEmbedModel,
        input,
        dimensions: env_1.env.openaiEmbedDimensions,
    });
    return response.data[0].embedding;
}
async function analyzeArticle(keyword, title, content) {
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
    try {
        const response = await openai_1.openai.chat.completions.create({
            model: env_1.env.openaiChatModel,
            temperature: 0,
            response_format: { type: 'json_object' },
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
        });
        const raw = response.choices[0]?.message?.content ?? '{}';
        const parsed = JSON.parse(raw);
        const stance = STANCE_VALUES.includes(parsed.stance) && parsed.stance !== '분류불가'
            ? parsed.stance
            : '중립';
        const aggroIndex = (0, math_1.clampPercent)(Number(parsed.aggro_index ?? 0));
        const evidence = String(parsed.evidence ?? '본문에서 명확한 근거 문장을 추출하지 못했습니다.').trim();
        const summary = String(parsed.summary ?? '요약 생성 실패\n요약 생성 실패').trim();
        return {
            stance,
            evidence,
            summary,
            aggroIndex,
        };
    }
    catch {
        return {
            stance: '중립',
            evidence: 'AI 분석 중 오류가 발생해 근거 문장을 생성하지 못했습니다.',
            summary: '요약 생성 실패\n요약 생성 실패',
            aggroIndex: 0,
        };
    }
}
async function summarizeStats(keyword, stats) {
    const fallback = [
        `'${keyword}' 이슈 기사 ${stats.total_analyzed}건 중 찬성 ${stats.statistics.agree.count}건, 반대 ${stats.statistics.oppose.count}건, 중립 ${stats.statistics.neutral.count}건입니다.`,
        '각 기사의 분류 근거(evidence)와 원문 URL을 함께 제공해 수치의 출처를 투명하게 확인할 수 있습니다.',
    ].join('\n');
    if (stats.total_analyzed === 0) {
        return fallback;
    }
    try {
        const response = await openai_1.openai.chat.completions.create({
            model: env_1.env.openaiChatModel,
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
    }
    catch {
        return fallback;
    }
}
async function answerFromArticle(content, question) {
    const response = await openai_1.openai.chat.completions.create({
        model: env_1.env.openaiChatModel,
        temperature: 0,
        messages: [
            {
                role: 'system',
                content: '주어진 기사 본문에서만 근거를 찾아 답하라. 본문 근거가 없으면 반드시 "알 수 없습니다"라고 답하라. 4문장 이내로 간결하게 답하라.',
            },
            {
                role: 'user',
                content: `질문: ${question}\n\n기사 본문:\n${content.slice(0, 12000)}`,
            },
        ],
    });
    return response.choices[0]?.message?.content?.trim() || '알 수 없습니다';
}
