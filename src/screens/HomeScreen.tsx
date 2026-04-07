import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { analyzeNews } from '../api/newsApi';
import { NewsCard } from '../components/NewsCard';
import { useNewsStore } from '../store/useNewsStore';
import type { Article } from '../types/news';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

interface HomeScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
}

export function HomeScreen({ navigation }: HomeScreenProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const keyword = useNewsStore((state) => state.keyword);
  const articles = useNewsStore((state) => state.articles);
  const setKeyword = useNewsStore((state) => state.setKeyword);
  const setArticles = useNewsStore((state) => state.setArticles);

  const onSearch = async () => {
    const trimmed = keyword.trim();
    if (!trimmed) {
      setError('키워드를 입력해 주세요.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await analyzeNews(trimmed);
      setArticles(data.articles);
    } catch {
      setError('뉴스 분석 요청에 실패했습니다. 서버 상태를 확인해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  const onPressArticle = (article: Article) => {
    navigation.navigate('Detail', { article });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Spectrum</Text>
        <Text style={styles.subtitle}>사용자 맞춤형 AI 이슈 분석</Text>

        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="이슈 키워드를 입력하세요"
            placeholderTextColor="#7A6F5E"
            value={keyword}
            onChangeText={setKeyword}
            returnKeyType="search"
            onSubmitEditing={onSearch}
          />
          <Pressable style={styles.searchButton} onPress={onSearch}>
            <Text style={styles.searchButtonText}>분석</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#8B2E20" />
            <Text style={styles.loadingText}>뉴스를 분석하고 있습니다...</Text>
          </View>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <FlatList
          data={articles}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <NewsCard article={item} onPress={onPressArticle} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            !loading ? (
              <Text style={styles.emptyText}>
                아직 분석된 기사가 없습니다. 키워드를 검색해 시작해 보세요.
              </Text>
            ) : null
          }
        />
      </View>
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
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: '#2B2216',
    letterSpacing: 0.4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5B5447',
    marginBottom: 14,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    paddingHorizontal: 12,
    backgroundColor: '#FCFAF4',
    borderWidth: 1,
    borderColor: '#D9D5C7',
    fontSize: 14,
    color: '#1D1A15',
  },
  searchButton: {
    height: 48,
    borderRadius: 14,
    backgroundColor: '#8B2E20',
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  loadingWrap: {
    alignItems: 'center',
    marginVertical: 12,
  },
  loadingText: {
    marginTop: 8,
    color: '#5B5447',
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: 26,
  },
  emptyText: {
    fontSize: 14,
    color: '#5B5447',
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 21,
  },
  errorText: {
    fontSize: 14,
    color: '#B2291E',
    marginBottom: 8,
    fontWeight: '600',
  },
});
