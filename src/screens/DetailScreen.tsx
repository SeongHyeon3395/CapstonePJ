import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Animated,
  Modal,
  StyleSheet,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { RouteProp, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/RootNavigator';
import StanceChart from '../components/StanceChart';
import AggroMeter from '../components/AggroMeter';
import ChatModal from '../components/ChatModal';
import { getArticleById, getNewsStats } from '../api/newsApi';
import { useNewsStore } from '../store/newsStore';

type DetailScreenRouteProp = RouteProp<RootStackParamList, 'Detail'>;

type EvidenceItem = {
  id: string;
  title: string;
  source: string;
  stance: '찬성' | '반대' | '중립' | '분류불가';
  evidence: string;
  aggro_index: number;
  published_at?: string;
  url: string;
};

function toSentimentLabel(stance?: string): '긍정적' | '부정적' | '중립적' {
  if (stance === '찬성') return '긍정적';
  if (stance === '반대') return '부정적';
  return '중립적';
}

function sentimentPillStyle(stance?: string) {
  if (stance === '찬성') {
    return { backgroundColor: '#DBEAFE', color: '#1D4ED8' };
  }
  if (stance === '반대') {
    return { backgroundColor: '#FEE2E2', color: '#B91C1C' };
  }
  return { backgroundColor: '#F3F4F6', color: '#374151' };
}

export default function DetailScreen() {
  const route = useRoute<DetailScreenRouteProp>();
  const { keyword, articleId } = route.params;
  const { articles } = useNewsStore();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [articleDetail, setArticleDetail] = useState<any>(null);
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [guideVisible, setGuideVisible] = useState(false);
  const [loadingTitle, setLoadingTitle] = useState('뉴스를 가져오는 중입니다');
  const [analysisMessage, setAnalysisMessage] = useState('AI가 기사를 분석 중입니다...');
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const articleInList = articles.find((a) => a.id === articleId);
  const articleFromEvidence = stats?.evidence_list?.find((item: any) => item.id === articleId);
  const article = articleDetail || articleInList || articleFromEvidence;
  const normalizedSimilarity = Math.max(0, Math.min(100, Number(article?.similarity_score ?? 0)));

  const evidenceRows = useMemo<EvidenceItem[]>(() => {
    const statsEvidence = (stats?.evidence_list ?? []) as EvidenceItem[];
    const fromKeyword = articles
      .filter((item) => item.keyword === keyword)
      .map((item) => ({
        id: item.id,
        title: item.title,
        source: item.source ?? '출처 미상',
        stance: item.stance,
        evidence: item.evidence ?? item.reason ?? '근거 정보 없음',
        aggro_index: Number(item.similarity_score ?? 0),
        published_at: item.published_at,
        url: item.url,
      }));

    const base = statsEvidence.length > 0 ? statsEvidence : fromKeyword;

    if (base.length >= 6) {
      return base;
    }

    // If same-keyword evidence is too small, add recent references for context.
    const supplements = articles
      .filter((item) => item.id !== articleId)
      .slice(0, 12)
      .map((item) => ({
        id: item.id,
        title: `[참고] ${item.title}`,
        source: item.source ?? '출처 미상',
        stance: item.stance,
        evidence: item.evidence ?? item.reason ?? '근거 정보 없음',
        aggro_index: Number(item.similarity_score ?? 0),
        published_at: item.published_at,
        url: item.url,
      }));

    const merged = [...base, ...supplements];
    const unique = new Map<string, EvidenceItem>();
    merged.forEach((item) => {
      if (!unique.has(item.id)) {
        unique.set(item.id, item);
      }
    });

    return Array.from(unique.values()).slice(0, 12);
  }, [articles, keyword, stats?.evidence_list]);

  const evidenceAvg = useMemo(() => {
    if (evidenceRows.length === 0) return 0;
    const total = evidenceRows.reduce((sum, row) => sum + Number(row.aggro_index ?? 0), 0);
    return Math.round(total / evidenceRows.length);
  }, [evidenceRows]);

  const articleBodyParagraphs = useMemo(() => {
    const raw = String(article?.content ?? '').trim();
    if (!raw) {
      return [] as string[];
    }

    // Normalize repeated whitespace and rebuild readable paragraphs.
    const normalized = raw.replace(/\s+/g, ' ').trim();
    const sentences = normalized
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (sentences.length === 0) {
      return [normalized];
    }

    const chunks: string[] = [];
    for (let i = 0; i < sentences.length; i += 3) {
      chunks.push(sentences.slice(i, i + 3).join(' '));
    }

    return chunks;
  }, [article?.content]);

  const sourceDistribution = useMemo(() => {
    const bucket = new Map<string, number>();
    evidenceRows.forEach((item) => {
      const key = (item.source || '출처 미상').trim() || '출처 미상';
      bucket.set(key, (bucket.get(key) ?? 0) + 1);
    });

    return Array.from(bucket.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [evidenceRows]);

  const hourlyDistribution = useMemo(() => {
    const rows = Array.from({ length: 8 }, (_, i) => ({
      label: `${String(i * 3).padStart(2, '0')}-${String(i * 3 + 2).padStart(2, '0')}시`,
      count: 0,
    }));

    evidenceRows.forEach((item) => {
      if (!item.published_at) return;
      const d = new Date(item.published_at);
      if (Number.isNaN(d.getTime())) return;
      const idx = Math.floor(d.getHours() / 3);
      if (rows[idx]) rows[idx].count += 1;
    });

    return rows;
  }, [evidenceRows]);

  const sentimentTrend = useMemo(() => {
    const bucket = new Map<string, { positive: number; negative: number; neutral: number }>();

    evidenceRows.forEach((item) => {
      if (!item.published_at) return;
      const dateKey = item.published_at.slice(0, 10);
      if (!bucket.has(dateKey)) {
        bucket.set(dateKey, { positive: 0, negative: 0, neutral: 0 });
      }
      const row = bucket.get(dateKey)!;
      if (item.stance === '찬성') row.positive += 1;
      else if (item.stance === '반대') row.negative += 1;
      else row.neutral += 1;
    });

    return Array.from(bucket.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-7)
      .map(([date, counts]) => {
        const positive = counts.positive + Math.round(counts.neutral / 2);
        const negative = counts.negative + (counts.neutral - Math.round(counts.neutral / 2));
        return {
          date,
          positive,
          negative,
          total: positive + negative,
        };
      });
  }, [evidenceRows]);

  const sourceMax = Math.max(1, ...sourceDistribution.map((item) => item.count));
  const hourlyMax = Math.max(1, ...hourlyDistribution.map((item) => item.count));
  const topPill = sentimentPillStyle(article?.stance);

  useEffect(() => {
    initializeDetail();
  }, [articleId, keyword]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: analysisProgress,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [analysisProgress, progressAnim]);

  const loadStats = async () => {
    const data = await getNewsStats(keyword);
    setStats(data);
  };

  const runProgressTask = async (
    title: string,
    message: string,
    task: () => Promise<void>,
    options?: { resetProgress?: boolean },
  ) => {
    setLoadingTitle(title);
    setAnalysisMessage(message);
    setLoading(true);
    if (options?.resetProgress !== false) {
      setAnalysisProgress(2);
    }

    const startedAt = Date.now();
    let progress = options?.resetProgress === false ? analysisProgress : 2;
    const timer = setInterval(() => {
      progress = Math.min(94, progress + (Math.random() * 10 + 3));
      setAnalysisProgress((prev) => Math.max(prev, Math.floor(progress)));
    }, 200);

    try {
      await task();
      const elapsed = Date.now() - startedAt;
      if (elapsed < 1200) {
        await new Promise((resolve) => setTimeout(resolve, 1200 - elapsed));
      }
      setAnalysisProgress((prev) => Math.max(prev, 100));
      await new Promise((resolve) => setTimeout(resolve, 220));
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      clearInterval(timer);
      setLoading(false);
    }
  };

  const initializeDetail = async () => {
    await runProgressTask(
      '뉴스를 가져오는 중입니다',
      '기사 본문과 메타데이터를 불러오는 중입니다...',
      async () => {
        if (articleId) {
          const detail = await getArticleById(articleId);
          if (detail) {
            setArticleDetail(detail);
          }
        }

        // Keep one continuous progress session while moving to analysis phase.
        setLoadingTitle('AI가 기사를 분석 중입니다');
        setAnalysisMessage('이슈 통계와 요약을 불러오는 중입니다...');
        await loadStats();
      },
    );
  };

  const runAnalysis = async (message: string) => {
    await runProgressTask('AI가 기사를 분석 중입니다', message, async () => {
      await loadStats();
    });
  };

  const handleOpenArticle = () => {
    if (article?.url) {
      Linking.openURL(article.url);
    }
  };

  const similarityLevel = (score: number) => {
    if (score >= 75) return '높음';
    if (score >= 45) return '보통';
    return '낮음';
  };

  const formatDate = (value?: string) => {
    if (!value) return '날짜 정보 없음';
    return value.slice(0, 10).replace(/-/g, '. ') + '.';
  };

  return (
    <View style={styles.root}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.guideRowWrap}>
          <TouchableOpacity style={styles.guideButton} onPress={() => setGuideVisible(true)}>
            <Ionicons name="help-circle-outline" size={16} color="#1D4ED8" />
            <Text style={styles.guideButtonText}>지표 가이드</Text>
          </TouchableOpacity>
        </View>

        {article && (
          <View style={styles.articleWrap}>
            <View style={styles.articleTopRow}>
              <View style={[styles.stancePill, { backgroundColor: topPill.backgroundColor }]}>
                <Text style={[styles.stancePillText, { color: topPill.color }]}>{toSentimentLabel(article.stance)}</Text>
              </View>
            </View>

            <Text style={styles.articleTitle}>{article.title}</Text>
            <Text style={styles.articleMeta}>{article.source || '출처 미상'}  •  {formatDate(article.published_at || article.created_at)}</Text>

            <TouchableOpacity style={styles.linkButton} onPress={handleOpenArticle}>
              <Ionicons name="open-outline" size={20} color="#111827" />
              <Text style={styles.linkButtonText}>원본 기사 읽기</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.summarySection}>
          <Text style={styles.summaryLabel}>AI 요약</Text>
          <Text style={styles.summaryText}>
            {article?.reason || article?.evidence || stats?.analysis_report || stats?.ai_final_summary || stats?.summary || '분석 요약이 아직 생성되지 않았습니다.'}
          </Text>
        </View>

        {article && (
          <View style={styles.sectionWrap}>
            <View style={styles.similarityTopRow}>
              <Text style={styles.sectionTitle}>제목-본문 일치도</Text>
              <View style={styles.levelPill}>
                <Text style={styles.levelPillText}>{similarityLevel(normalizedSimilarity)}</Text>
              </View>
            </View>
            <Text style={styles.similarityValue}>{normalizedSimilarity}%</Text>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${normalizedSimilarity}%` }]} />
            </View>
            <Text style={styles.similarityDescription}>
              {normalizedSimilarity >= 70
                ? '제목과 본문이 비교적 잘 일치합니다.'
                : '제목 대비 본문 일치도가 낮아 낚시성 가능성을 확인해보세요.'}
            </Text>
          </View>
        )}

        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>'{keyword}' 이슈 통계</Text>
          {stats && <StanceChart stats={stats} />}
        </View>

        {article && (
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionTitle}>어그로 판별</Text>
            <AggroMeter score={normalizedSimilarity} />
          </View>
        )}

        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>근거 기사 목록</Text>

          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>근거 수</Text>
              <Text style={styles.metricValue}>{evidenceRows.length}건</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>평균 일치도</Text>
              <Text style={styles.metricValue}>{evidenceAvg}%</Text>
            </View>
          </View>

          <View style={styles.visualWrap}>
            <Text style={styles.visualTitle}>출처별 분포</Text>
            {sourceDistribution.length === 0 && <Text style={styles.visualEmpty}>출처 데이터가 부족합니다.</Text>}
            {sourceDistribution.map((item) => {
              const width = `${Math.round((item.count / sourceMax) * 100)}%` as `${number}%`;
              return (
                <View key={item.source} style={styles.visualRow}>
                  <Text style={styles.visualLabel} numberOfLines={1}>{item.source}</Text>
                  <View style={styles.visualTrack}>
                    <View style={[styles.visualFillBlue, { width }]} />
                  </View>
                  <Text style={styles.visualCount}>{item.count}</Text>
                </View>
              );
            })}
          </View>

          <View style={styles.visualWrap}>
            <Text style={styles.visualTitle}>시간대별 기사량</Text>
            {hourlyDistribution.map((item) => {
              const width = `${Math.round((item.count / hourlyMax) * 100)}%` as `${number}%`;
              return (
                <View key={item.label} style={styles.visualRow}>
                  <Text style={styles.visualLabel}>{item.label}</Text>
                  <View style={styles.visualTrack}>
                    <View style={[styles.visualFillPurple, { width }]} />
                  </View>
                  <Text style={styles.visualCount}>{item.count}</Text>
                </View>
              );
            })}
          </View>

          <View style={styles.visualWrap}>
            <Text style={styles.visualTitle}>긍정/부정 추이 (최근 7일)</Text>
            {sentimentTrend.length === 0 && <Text style={styles.visualEmpty}>날짜 데이터가 부족합니다.</Text>}
            {sentimentTrend.map((item) => {
              const positiveWidth = (item.total > 0 ? `${Math.round((item.positive / item.total) * 100)}%` : '0%') as `${number}%`;
              const negativeWidth = (item.total > 0 ? `${Math.round((item.negative / item.total) * 100)}%` : '0%') as `${number}%`;
              return (
                <View key={item.date} style={styles.trendItem}>
                  <Text style={styles.trendDate}>{item.date.replace(/-/g, '. ')}</Text>
                  <View style={styles.trendStackTrack}>
                    <View style={[styles.trendAgree, { width: positiveWidth }]} />
                    <View style={[styles.trendOppose, { width: negativeWidth }]} />
                  </View>
                  <Text style={styles.trendValue}>긍정 {item.positive} / 부정 {item.negative}</Text>
                </View>
              );
            })}
          </View>

          {evidenceRows.slice(0, 12).map((item) => (
            <TouchableOpacity key={item.id} style={styles.evidenceItem} onPress={() => Linking.openURL(item.url)}>
              <Text style={styles.evidenceTitle} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.evidenceMeta}>{item.source}  •  {formatDate(item.published_at)}</Text>
              <Text style={styles.evidenceBadge}>{toSentimentLabel(item.stance)} · 일치도 {Math.max(0, Math.min(100, Number(item.aggro_index ?? 0)))}%</Text>
              <Text style={styles.evidenceReason} numberOfLines={2}>{item.evidence || '근거 정보 없음'}</Text>
            </TouchableOpacity>
          ))}
          {evidenceRows.length === 0 && (
            <Text style={styles.emptyEvidence}>근거 목록이 아직 없습니다.</Text>
          )}
        </View>

        {article && (
          <TouchableOpacity
            style={styles.articleBodyWrap}
            activeOpacity={0.86}
            onPress={() => runAnalysis('AI가 기사 본문을 다시 분석 중입니다...')}
          >
            <Text style={styles.articleBodyTitle}>기사 본문</Text>
            <Text style={styles.bodyTapHint}>본문을 탭하면 AI가 다시 분석합니다.</Text>
            {articleBodyParagraphs.length > 0 ? (
              articleBodyParagraphs.slice(0, 8).map((paragraph, index) => (
                <Text key={`${index}-${paragraph.slice(0, 10)}`} style={styles.articleParagraph}>
                  {paragraph}
                </Text>
              ))
            ) : (
              <Text style={styles.articlePreview}>본문을 불러오는 중이거나 본문 데이터가 없습니다.</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>

      {article && (
        <TouchableOpacity style={styles.fab} onPress={() => setChatModalVisible(true)}>
          <Ionicons name="chatbubble-ellipses-outline" size={18} color="#FFFFFF" />
          <Text style={styles.fabText}>기사에 대해 질문하기</Text>
        </TouchableOpacity>
      )}

      {article && (
        <ChatModal
          visible={chatModalVisible}
          onClose={() => setChatModalVisible(false)}
          articleId={article.id}
        />
      )}

      {loading && (
        <View style={styles.analysisOverlay}>
          <View style={styles.analysisCard}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={styles.analysisTitle}>{loadingTitle}</Text>
            <Text style={styles.analysisSubtitle}>{analysisMessage}</Text>

            <View style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 100],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>{analysisProgress}%</Text>
          </View>
        </View>
      )}

      <Modal visible={guideVisible} transparent animationType="fade" onRequestClose={() => setGuideVisible(false)}>
        <View style={styles.guideModalBackdrop}>
          <View style={styles.guideModalCard}>
            <Text style={styles.guideModalTitle}>분석 지표 가이드</Text>

            <Text style={styles.guideItemTitle}>일치도</Text>
            <Text style={styles.guideItemBody}>기사 제목과 본문 내용이 얼마나 잘 맞는지 나타내는 값입니다.</Text>

            <Text style={styles.guideItemTitle}>어그로 주의</Text>
            <Text style={styles.guideItemBody}>일치도가 낮아 제목이 과장되었을 가능성이 높은 기사에 표시됩니다.</Text>

            <Text style={styles.guideItemTitle}>중립</Text>
            <Text style={styles.guideItemBody}>찬반 한쪽으로 치우친 근거가 부족해 중립으로 분류된 상태입니다.</Text>

            <Text style={styles.guideItemTitle}>긍정적 / 부정적</Text>
            <Text style={styles.guideItemBody}>키워드 전체 기사 흐름을 2축으로 요약한 결과이며, 각 항목 아래의 이유 문장은 근거들을 통합해 생성됩니다.</Text>

            <TouchableOpacity style={styles.guideCloseButton} onPress={() => setGuideVisible(false)}>
              <Text style={styles.guideCloseButtonText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  guideRowWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  guideButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#DBEAFE',
  },
  guideButtonText: {
    color: '#1D4ED8',
    fontWeight: '700',
    fontSize: 13,
  },
  summarySection: {
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 18,
    backgroundColor: '#F5F3FF',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '600',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 16,
    color: '#1F2937',
    lineHeight: 24,
  },
  sectionWrap: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  metricLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 18,
    color: '#111827',
    fontWeight: '700',
  },
  visualWrap: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#FAFAFF',
  },
  visualTitle: {
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '700',
    marginBottom: 8,
  },
  visualEmpty: {
    fontSize: 13,
    color: '#6B7280',
  },
  visualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  visualLabel: {
    width: 92,
    fontSize: 12,
    color: '#374151',
    marginRight: 6,
  },
  visualTrack: {
    flex: 1,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  visualFillBlue: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#2563EB',
  },
  visualFillPurple: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#7C3AED',
  },
  visualCount: {
    width: 20,
    textAlign: 'right',
    marginLeft: 8,
    fontSize: 12,
    color: '#111827',
    fontWeight: '700',
  },
  trendItem: {
    marginBottom: 10,
  },
  trendDate: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 6,
  },
  trendStackTrack: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  trendAgree: {
    height: '100%',
    backgroundColor: '#2563EB',
  },
  trendOppose: {
    height: '100%',
    backgroundColor: '#EF4444',
  },
  trendNeutral: {
    height: '100%',
    backgroundColor: '#9CA3AF',
  },
  trendValue: {
    marginTop: 5,
    fontSize: 12,
    color: '#4B5563',
  },
  articleWrap: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  articleTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stancePill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  stancePillText: {
    fontWeight: '700',
    fontSize: 13,
  },
  articleTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  articleMeta: {
    color: '#4B5563',
    fontSize: 14,
    marginBottom: 14,
  },
  articlePreview: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
  },
  articleParagraph: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 24,
    marginBottom: 12,
  },
  linkButton: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkButtonText: {
    marginLeft: 8,
    color: '#111827',
    fontSize: 16,
    fontWeight: '600',
  },
  similarityTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  levelPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#EEF2FF',
  },
  levelPillText: {
    color: '#4F46E5',
    fontWeight: '700',
  },
  similarityValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  track: {
    height: 16,
    borderRadius: 999,
    backgroundColor: '#D1D5DB',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: '#55B95A',
  },
  similarityDescription: {
    marginTop: 10,
    color: '#4B5563',
    lineHeight: 20,
  },
  evidenceItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  evidenceTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  evidenceMeta: {
    marginTop: 4,
    fontSize: 12,
    color: '#6B7280',
  },
  evidenceBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    color: '#4338CA',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
    marginBottom: 6,
  },
  evidenceReason: {
    marginTop: 2,
    fontSize: 13,
    color: '#374151',
  },
  emptyEvidence: {
    color: '#6B7280',
    fontSize: 14,
  },
  articleBodyWrap: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 96,
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  articleBodyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  bodyTapHint: {
    marginBottom: 10,
    fontSize: 13,
    color: '#4F46E5',
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    minHeight: 52,
    borderRadius: 999,
    paddingHorizontal: 16,
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  fabText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  analysisOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(17, 24, 39, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  analysisCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  analysisTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  analysisSubtitle: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  progressTrack: {
    width: '100%',
    height: 12,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
    marginTop: 16,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4F46E5',
  },
  progressText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '700',
    color: '#4F46E5',
  },
  guideModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    justifyContent: 'center',
    padding: 22,
  },
  guideModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
  },
  guideModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  guideItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 8,
  },
  guideItemBody: {
    marginTop: 4,
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 19,
  },
  guideCloseButton: {
    marginTop: 16,
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#2563EB',
  },
  guideCloseButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
