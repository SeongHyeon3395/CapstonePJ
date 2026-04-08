import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Modal,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import NewsCard from '../components/NewsCard';
import { useNewsStore } from '../store/newsStore';
import { getRecentNews, searchRecentNews } from '../api/newsApi';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;

export default function HomeScreen() {
  const PAGE_SIZE = 100;
  const ALL_CATEGORY = '전체';
  const INLINE_CATEGORY_LIMIT = 5;
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState('뉴스를 가져오는 중...');
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORY);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [cursorCreatedAt, setCursorCreatedAt] = useState<string | undefined>(undefined);
  const [cursorId, setCursorId] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  const [currentQuery, setCurrentQuery] = useState('');
  const { articles, setArticles, addToHistory } = useNewsStore();
  const feed = articles;
  const feedRef = useRef(feed);
  const endReachedAtRef = useRef(0);
  const endReachedLockRef = useRef(false);

  useEffect(() => {
    feedRef.current = feed;
  }, [feed]);

  useEffect(() => {
    loadRecentArticles();
  }, []);

  const mergeArticles = (prev: typeof feed, next: typeof feed) => {
    const map = new Map<string, (typeof feed)[number]>();
    [...prev, ...next].forEach((item) => {
      map.set(item.id, item);
    });
    return Array.from(map.values());
  };

  const categoryOptions = useMemo(() => {
    const keywords = new Set<string>();
    feed.forEach((item) => {
      const category = (item.keyword || '').trim();
      if (category) {
        keywords.add(category);
      }
    });

    return [ALL_CATEGORY, ...Array.from(keywords).sort((a, b) => a.localeCompare(b, 'ko-KR'))];
  }, [ALL_CATEGORY, feed]);

  const filteredFeed = useMemo(() => {
    if (selectedCategory === ALL_CATEGORY) {
      return feed;
    }
    return feed.filter((item) => item.keyword === selectedCategory);
  }, [ALL_CATEGORY, feed, selectedCategory]);

  const inlineCategoryOptions = useMemo(() => {
    if (categoryOptions.length <= INLINE_CATEGORY_LIMIT) {
      return categoryOptions;
    }

    const sliced = categoryOptions.slice(0, INLINE_CATEGORY_LIMIT);
    if (selectedCategory !== ALL_CATEGORY && !sliced.includes(selectedCategory)) {
      sliced[INLINE_CATEGORY_LIMIT - 1] = selectedCategory;
    }
    return sliced;
  }, [ALL_CATEGORY, INLINE_CATEGORY_LIMIT, categoryOptions, selectedCategory]);

  useEffect(() => {
    if (selectedCategory === ALL_CATEGORY) return;
    if (!categoryOptions.includes(selectedCategory)) {
      setSelectedCategory(ALL_CATEGORY);
    }
  }, [ALL_CATEGORY, categoryOptions, selectedCategory]);

  const loadRecentArticles = async () => {
    setLoadingLabel('데이터베이스의 전체 기사를 가져오는 중...');
    setLoading(true);
    try {
      let all: typeof feed = [];
      let nextCreatedAt: string | undefined = undefined;
      let nextId: string | undefined = undefined;
      let more = true;

      while (more) {
        const page = await getRecentNews(PAGE_SIZE, nextCreatedAt, nextId);
        all = mergeArticles(all, page.articles);
        more = page.has_more;
        nextCreatedAt = page.next_cursor_created_at ?? undefined;
        nextId = page.next_cursor_id ?? undefined;

        // Safety cap to avoid endless loops from malformed cursors.
        if (all.length >= 5000) {
          more = false;
        }
      }

      setArticles(all);
      setCursorCreatedAt(nextCreatedAt);
      setCursorId(nextId);
      setHasMore(false);
      setCurrentQuery('');
    } catch (error) {
      console.error('Failed to load recent news:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreArticles = async () => {
    if (loading || loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const page = currentQuery
        ? await searchRecentNews(currentQuery, PAGE_SIZE, cursorCreatedAt, cursorId)
        : await getRecentNews(PAGE_SIZE, cursorCreatedAt, cursorId);

      const merged = mergeArticles(feedRef.current, page.articles);
      setArticles(merged);
      setCursorCreatedAt(page.next_cursor_created_at ?? undefined);
      setCursorId(page.next_cursor_id ?? undefined);
      setHasMore(page.has_more);
    } catch (error) {
      console.error('Failed to load more news:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSearch = async () => {
    const trimmed = keyword.trim();
    if (!trimmed) return;

    setLoadingLabel('키워드 뉴스를 가져오는 중...');
    setLoading(true);
    try {
      const page = await searchRecentNews(trimmed, PAGE_SIZE);
      setArticles(page.articles);
      setCursorCreatedAt(page.next_cursor_created_at ?? undefined);
      setCursorId(page.next_cursor_id ?? undefined);
      setHasMore(page.has_more);
      setCurrentQuery(trimmed);
      addToHistory(trimmed);
    } catch (error) {
      console.error('Failed to analyze news:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleArticlePress = (articleId: string, articleKeyword: string) => {
    navigation.navigate('Detail', { keyword: articleKeyword, articleId });
  };

  const handleEndReached = () => {
    const now = Date.now();
    if (endReachedLockRef.current) return;
    if (now - endReachedAtRef.current < 900) return;
    endReachedAtRef.current = now;
    endReachedLockRef.current = true;
    void loadMoreArticles().finally(() => {
      endReachedLockRef.current = false;
    });
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.heroWrap}>
        <View style={styles.brandRow}>
          <Ionicons name="sparkles-outline" size={18} color="#FFFFFF" />
          <View style={styles.brandTextWrap}>
            <Text style={styles.brandTitle}>Spectrum</Text>
            <Text style={styles.brandSubtitle}>AI 뉴스 분석</Text>
          </View>
        </View>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="이슈 키워드를 검색하세요..."
            placeholderTextColor="#6B7280"
            value={keyword}
            onChangeText={setKeyword}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch} disabled={loading}>
            <Text style={styles.searchButtonText}>검색</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <View style={styles.sectionLeft}>
          <Ionicons name="trending-up-outline" size={16} color="#4B5563" />
          <Text style={styles.sectionTitle}>뉴스 기사</Text>
        </View>
        <TouchableOpacity onPress={loadRecentArticles}>
          <Text style={styles.resetText}>새로고침</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.categoryWrap}>
        <View style={styles.categoryHeaderRow}>
          <Text style={styles.categoryLabel}>카테고리</Text>
          <View style={styles.categoryActionsRow}>
            {selectedCategory !== ALL_CATEGORY && (
              <TouchableOpacity
                style={styles.categoryActionBtn}
                onPress={() => setSelectedCategory(ALL_CATEGORY)}
                activeOpacity={0.85}
              >
                <Text style={styles.categoryActionBtnText}>초기화</Text>
              </TouchableOpacity>
            )}
            {categoryOptions.length > INLINE_CATEGORY_LIMIT && (
              <TouchableOpacity
                style={styles.categoryActionBtn}
                onPress={() => setCategoryModalVisible(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.categoryActionBtnText}>+ 더보기</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.categoryCompactRow}>
          {inlineCategoryOptions.map((item) => {
            const active = item === selectedCategory;
            return (
              <TouchableOpacity
                key={item}
                style={[styles.categoryChip, active && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(item)}
                activeOpacity={0.8}
              >
                <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]} numberOfLines={1}>{item}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {loading && (
        <View style={styles.topLoadingRow}>
          <ActivityIndicator size="small" color="#4F46E5" />
          <Text style={styles.topLoadingText}>{loadingLabel}</Text>
        </View>
      )}

      <FlatList
        data={filteredFeed}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NewsCard
            article={item}
            onPress={() => handleArticlePress(item.id, item.keyword)}
          />
        )}
        contentContainerStyle={{ padding: 16 }}
        ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>
              {selectedCategory === ALL_CATEGORY
                ? '아직 분석된 뉴스가 없습니다. 키워드를 검색해 분석을 시작해보세요.'
                : `${selectedCategory} 카테고리 뉴스가 없습니다. 다른 카테고리를 선택해보세요.`}
            </Text>
          </View>
        }
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.35}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoading}>
              <ActivityIndicator size="small" color="#4F46E5" />
              <Text style={styles.footerLoadingText}>추가 뉴스를 가져오는 중...</Text>
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadRecentArticles} />
        }
      />

      <Modal
        visible={categoryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>카테고리 선택</Text>
              <TouchableOpacity onPress={() => setCategoryModalVisible(false)}>
                <Text style={styles.modalClose}>닫기</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={categoryOptions}
              keyExtractor={(item) => item}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={styles.modalItemSeparator} />}
              renderItem={({ item }) => {
                const active = item === selectedCategory;
                return (
                  <TouchableOpacity
                    style={[styles.modalItem, active && styles.modalItemActive]}
                    onPress={() => {
                      setSelectedCategory(item);
                      setCategoryModalVisible(false);
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.modalItemText, active && styles.modalItemTextActive]}>{item}</Text>
                    {active && <Ionicons name="checkmark-circle" size={18} color="#2563EB" />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  heroWrap: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#2F55E7',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  brandTextWrap: {
    marginLeft: 8,
  },
  brandTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
  },
  brandSubtitle: {
    color: '#DBEAFE',
    fontSize: 14,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
    borderRadius: 10,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  searchButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    marginLeft: 6,
    marginRight: 8,
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
  },
  resetText: {
    color: '#2563EB',
    fontWeight: '600',
    fontSize: 14,
  },
  topLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#EEF2FF',
    borderBottomWidth: 1,
    borderBottomColor: '#DBEAFE',
  },
  topLoadingText: {
    color: '#4338CA',
    fontSize: 13,
    fontWeight: '600',
  },
  categoryWrap: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  categoryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  categoryActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryActionBtn: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#FFFFFF',
  },
  categoryActionBtnText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '600',
  },
  categoryCompactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
  },
  categoryChip: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    backgroundColor: '#FFFFFF',
    maxWidth: 92,
  },
  categoryChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17,24,39,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    maxHeight: '72%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '700',
  },
  modalClose: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '600',
  },
  modalItemSeparator: {
    height: 8,
  },
  modalItem: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalItemActive: {
    borderColor: '#93C5FD',
    backgroundColor: '#EFF6FF',
  },
  modalItemText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  modalItemTextActive: {
    color: '#1D4ED8',
  },
  itemSeparator: {
    height: 12,
  },
  emptyWrap: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  footerLoading: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  footerLoadingText: {
    fontSize: 13,
    color: '#6B7280',
  },
});
