import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/types';
import { fetchNewsStats } from '../api/newsApi';
import type { NewsStatsResponse } from '../types/news';
import { StanceChart } from '../components/StanceChart';
import { AggroMeter } from '../components/AggroMeter';
import { ChatModal } from '../components/ChatModal';

interface DetailScreenProps {
  route: RouteProp<RootStackParamList, 'Detail'>;
}

function buildSummary(stats: NewsStatsResponse) {
  return [
    `총 ${stats.total}건 기사 분석 기준으로, 현재 가장 큰 비중은 ${dominantLabel(stats)}입니다.`,
    `찬성 ${stats.agree_percent.toFixed(1)}%, 반대 ${stats.oppose_percent.toFixed(1)}%, 중립 ${stats.neutral_percent.toFixed(1)}%로 집계되었습니다.`,
    '백분율은 데이터 개수 기반으로 계산되며 추정치가 아닌 실제 집계 결과입니다.',
  ].join('\n');
}

function dominantLabel(stats: NewsStatsResponse) {
  const mapping = [
    { label: '찬성', count: stats.agree_count },
    { label: '반대', count: stats.oppose_count },
    { label: '중립', count: stats.neutral_count },
  ];
  return mapping.sort((a, b) => b.count - a.count)[0].label;
}

export function DetailScreen({ route }: DetailScreenProps) {
  const { article } = route.params;
  const [stats, setStats] = useState<NewsStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      setLoading(true);
      try {
        const response = await fetchNewsStats(article.keyword);
        if (mounted) {
          setStats(response);
        }
      } catch {
        if (mounted) {
          setStats({
            total: 0,
            agree_count: 0,
            agree_percent: 0,
            oppose_count: 0,
            oppose_percent: 0,
            neutral_count: 0,
            neutral_percent: 0,
          });
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    run();

    return () => {
      mounted = false;
    };
  }, [article.keyword]);

  const summaryText = useMemo(() => {
    if (!stats) {
      return '요약 데이터를 불러오는 중입니다.';
    }

    return stats.summary?.trim() ? stats.summary : buildSummary(stats);
  }, [stats]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.articleTitle}>{article.title}</Text>
        <Text style={styles.keywordText}>키워드: {article.keyword}</Text>

        <View style={styles.summaryBox}>
          <Text style={styles.summaryTitle}>AI 3줄 요약</Text>
          <Text style={styles.summaryText}>{summaryText}</Text>
        </View>

        {loading || !stats ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#8B2E20" />
            <Text style={styles.loadingText}>상세 지표를 계산하고 있습니다...</Text>
          </View>
        ) : (
          <>
            <StanceChart stats={stats} />
            <AggroMeter score={article.similarity_score} />
          </>
        )}

        <Pressable style={styles.linkButton} onPress={() => Linking.openURL(article.url)}>
          <Text style={styles.linkButtonText}>원본 기사 읽기</Text>
        </Pressable>
      </ScrollView>

      <Pressable style={styles.fab} onPress={() => setChatOpen(true)}>
        <Text style={styles.fabText}>Q&A</Text>
      </Pressable>

      <ChatModal
        visible={chatOpen}
        articleId={article.id}
        onClose={() => setChatOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#EFE9D8',
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 90,
  },
  articleTitle: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '900',
    color: '#21190F',
    marginBottom: 6,
  },
  keywordText: {
    fontSize: 14,
    color: '#5B5447',
    marginBottom: 14,
    fontWeight: '600',
  },
  summaryBox: {
    backgroundColor: '#F7F5EE',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#D9D5C7',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
    color: '#1D1A15',
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#2E261A',
    fontWeight: '500',
  },
  loadingWrap: {
    alignItems: 'center',
    marginVertical: 20,
  },
  loadingText: {
    marginTop: 8,
    color: '#5B5447',
    fontSize: 14,
    fontWeight: '500',
  },
  linkButton: {
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2D6A4F',
    marginTop: 2,
  },
  linkButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#8B2E20',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
