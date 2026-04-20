import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/RootNavigator';
import {
  analyzeManualNews,
  Article,
  ManualAnalyzeResponse,
  SimilarArticle,
} from '../api/newsApi';
import NewsCard from '../components/NewsCard';
import { useAuthStore } from '../store/authStore';

type RootNavigation = NativeStackNavigationProp<RootStackParamList, 'Main'>;

export default function AnalyzeScreen() {
  const navigation = useNavigation<RootNavigation>();
  const user = useAuthStore((state) => state.user);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [result, setResult] = useState<ManualAnalyzeResponse | null>(null);

  const hasInput = useMemo(() => {
    return input.trim().length > 0;
  }, [input]);

  const handleAnalyze = async () => {
    if (!user?.id) {
      setErrorMessage('로그인 정보를 확인할 수 없습니다. 다시 로그인해 주세요.');
      return;
    }

    const payloadInput = input.trim();
    if (!payloadInput) {
      setErrorMessage('뉴스 링크 또는 본문을 입력해 주세요.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const analyzed = await analyzeManualNews({
        user_id: user.id,
        input: payloadInput,
      });

      setResult(analyzed);
    } catch (error) {
      const message = error instanceof Error ? error.message : '분석 중 오류가 발생했습니다.';
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  const openDetail = (article: Article | SimilarArticle) => {
    navigation.navigate('Detail', {
      keyword: article.keyword,
      articleId: article.id,
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.heroWrap}>
          <View style={styles.heroRow}>
            <Ionicons name="flash-outline" size={18} color="#FFFFFF" />
            <View style={styles.heroTextWrap}>
              <Text style={styles.heroTitle}>분석하기</Text>
              <Text style={styles.heroSubtitle}>링크 또는 본문을 직접 넣어 즉시 분석</Text>
            </View>
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.label}>뉴스 링크 또는 본문</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            placeholder="링크를 붙여 넣거나, 기사 본문을 그대로 입력해 주세요"
            value={input}
            onChangeText={setInput}
            placeholderTextColor="#9CA3AF"
            multiline
            textAlignVertical="top"
          />

          <Text style={styles.helperText}>
            한 칸 입력만 지원합니다. 링크 추출이 차단된 경우 본문 입력을 안내합니다.
          </Text>

          <TouchableOpacity
            style={[styles.analyzeButton, (!hasInput || loading) && styles.analyzeButtonDisabled]}
            onPress={handleAnalyze}
            disabled={!hasInput || loading}
          >
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.analyzeButtonText}>분석 중...</Text>
              </View>
            ) : (
              <Text style={styles.analyzeButtonText}>분석하기</Text>
            )}
          </TouchableOpacity>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}
        </View>

        {result ? (
          <View style={styles.resultSection}>
            <Text style={styles.sectionTitle}>분석 결과</Text>
            <NewsCard article={result.article} onPress={() => openDetail(result.article)} />

            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>분석 요약</Text>
              <Text style={styles.summaryText}>
                {result.article.reason || result.article.evidence || result.article.content.slice(0, 200)}
              </Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>유사 기사</Text>
              {result.similar_articles.length === 0 ? (
                <Text style={styles.emptyText}>유사 기사를 찾지 못했습니다.</Text>
              ) : (
                <View style={styles.similarListWrap}>
                  {result.similar_articles.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.similarRow}
                      onPress={() => openDetail(item)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.similarTopRow}>
                        <Text style={styles.similarTitle} numberOfLines={2}>{item.title}</Text>
                        <Text style={styles.matchText}>{item.match_percent}%</Text>
                      </View>
                      <Text style={styles.similarMeta}>
                        {item.stance}  {item.source || '출처 미상'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  contentContainer: {
    paddingBottom: 24,
  },
  heroWrap: {
    backgroundColor: '#2F55E7',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroTextWrap: {
    marginLeft: 8,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '700',
  },
  heroSubtitle: {
    color: '#DBEAFE',
    fontSize: 13,
  },
  formCard: {
    margin: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
  },
  label: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  multilineInput: {
    minHeight: 120,
  },
  helperText: {
    marginTop: 10,
    color: '#6B7280',
    fontSize: 12,
    lineHeight: 18,
  },
  analyzeButton: {
    marginTop: 12,
    backgroundColor: '#2563EB',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  analyzeButtonDisabled: {
    opacity: 0.55,
  },
  analyzeButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorBox: {
    marginTop: 12,
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 13,
    lineHeight: 18,
  },
  resultSection: {
    paddingHorizontal: 14,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  summaryText: {
    color: '#374151',
    fontSize: 14,
    lineHeight: 20,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 13,
  },
  similarListWrap: {
    gap: 8,
  },
  similarRow: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#F9FAFB',
  },
  similarTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  similarTitle: {
    flex: 1,
    color: '#111827',
    fontSize: 14,
    fontWeight: '600',
  },
  matchText: {
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '700',
  },
  similarMeta: {
    marginTop: 6,
    color: '#6B7280',
    fontSize: 12,
  },
});
