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
import { analyzeNews, getRecentNews, searchRecentNews } from '../api/newsApi';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;

export default function HomeScreen() {
  const PAGE_SIZE = 100;
  const VISIBLE_CHIP_LIMIT = 4;
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState('뉴스를 가져오는 중...');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showAllSelectedCategories, setShowAllSelectedCategories] = useState(false);
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

    return Array.from(keywords).sort((a, b) => a.localeCompare(b, 'ko-KR'));
  }, [feed]);

  const filteredFeed = useMemo(() => {
    if (selectedCategories.length === 0) {
      return feed;
    }
    return feed.filter((item) => selectedCategories.includes(item.keyword));
  }, [feed, selectedCategories]);

  const visibleSelectedCategories = useMemo(() => {
    if (showAllSelectedCategories) {
      return selectedCategories;
    }
    return selectedCategories.slice(0, VISIBLE_CHIP_LIMIT);
  }, [VISIBLE_CHIP_LIMIT, selectedCategories, showAllSelectedCategories]);

  const hiddenSelectedCount = Math.max(0, selectedCategories.length - VISIBLE_CHIP_LIMIT);

  useEffect(() => {
    setSelectedCategories((prev) => prev.filter((category) => categoryOptions.includes(category)));
  }, [categoryOptions]);

  useEffect(() => {
    if (selectedCategories.length <= VISIBLE_CHIP_LIMIT && showAllSelectedCategories) {
      setShowAllSelectedCategories(false);
    }
  }, [VISIBLE_CHIP_LIMIT, selectedCategories.length, showAllSelectedCategories]);

  const toggleCategorySelection = (category: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(category)) {
        return prev.filter((item) => item !== category);
      }
      return [...prev, category];
    });
  };

  const removeCategory = (category: string) => {
    setSelectedCategories((prev) => prev.filter((item) => item !== category));
  };

  const loadRecentArticles = async () => {
    setLoadingLabel('데이터베이스의 전체 기사를 가져오는 중...');
    setLoading(true);
    try {
      // Initial screen should load fast: fetch only the first page and rely on infinite scroll.
      const page = await getRecentNews(PAGE_SIZE);
      setArticles(page.articles);
      setCursorCreatedAt(page.next_cursor_created_at ?? undefined);
      setCursorId(page.next_cursor_id ?? undefined);
      setHasMore(page.has_more && page.articles.length > 0);
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

      const nextCreatedAt = page.next_cursor_created_at ?? undefined;
      const nextId = page.next_cursor_id ?? undefined;
      const sameCursor = cursorCreatedAt === nextCreatedAt && cursorId === nextId;
      const merged = mergeArticles(feedRef.current, page.articles);
      setArticles(merged);
      setCursorCreatedAt(nextCreatedAt);
      setCursorId(nextId);
      setHasMore(page.has_more && page.articles.length > 0 && !sameCursor);

      if (sameCursor && page.has_more) {
        console.warn('Pagination cursor did not advance. Stopping infinite scroll to avoid loop.');
      }
    } catch (error) {
      console.error('Failed to load more news:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSearch = async () => {
    const trimmed = keyword.trim();
    if (!trimmed) return;

    setLoadingLabel('키워드 뉴스를 분석하는 중...');
    setLoading(true);
    try {
      // First trigger fresh collection/analysis so search reflects up-to-date articles.
      await analyzeNews(trimmed);

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

  const handleShowAll = async () => {
    setKeyword('');
    await loadRecentArticles();
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
        <View style={styles.sectionRight}>
          {currentQuery.trim().length > 0 && (
            <TouchableOpacity style={styles.showAllBtn} onPress={handleShowAll}>
              <Text style={styles.showAllBtnText}>전체 보기</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={loadRecentArticles}>
            <Text style={styles.resetText}>새로고침</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.categoryWrap}>
        <View style={styles.categoryHeaderRow}>
          <Text style={styles.categoryLabel}>카테고리</Text>
          <View style={styles.categoryActionsRow}>
            {selectedCategories.length > 0 && (
              <TouchableOpacity
                style={styles.categoryActionBtn}
                onPress={() => setSelectedCategories([])}
                activeOpacity={0.85}
              >
                <Text style={styles.categoryActionBtnText}>초기화</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.categoryActionBtn}
              onPress={() => setCategoryModalVisible(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.categoryActionBtnText}>+ 카테고리 추가</Text>
            </TouchableOpacity>
            {hiddenSelectedCount > 0 && (
              <TouchableOpacity
                style={styles.categoryActionBtn}
                onPress={() => setShowAllSelectedCategories((prev) => !prev)}
                activeOpacity={0.85}
              >
                <Text style={styles.categoryActionBtnText}>
                  {showAllSelectedCategories ? '접기' : `더보기 +${hiddenSelectedCount}`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {selectedCategories.length > 0 ? (
          <View style={styles.categoryCompactRow}>
            {visibleSelectedCategories.map((item) => (
              <View key={item} style={styles.selectedCategoryChipWrap}>
                <TouchableOpacity
                  style={styles.selectedCategoryChip}
                  activeOpacity={0.9}
                >
                  <Text style={styles.selectedCategoryChipText} numberOfLines={1}>{item}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.selectedChipRemoveBtn}
                  onPress={() => removeCategory(item)}
                  hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                >
                  <Text style={styles.selectedChipRemoveBtnText}>x</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.noCategoryText}>추가된 카테고리가 없습니다. + 카테고리 추가로 선택해 주세요.</Text>
        )}
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
              {selectedCategories.length === 0
                ? '아직 분석된 뉴스가 없습니다. 키워드를 검색해 분석을 시작해보세요.'
                : `선택한 카테고리(${selectedCategories.join(', ')})에 해당하는 뉴스가 없습니다.`}
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
                const active = selectedCategories.includes(item);
                return (
                  <TouchableOpacity
                    style={[styles.modalItem, active && styles.modalItemActive]}
                    onPress={() => {
                      toggleCategorySelection(item);
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.modalItemText, active && styles.modalItemTextActive]}>{item}</Text>
                    {active ? (
                      <Ionicons name="checkmark-circle" size={18} color="#2563EB" />
                    ) : (
                      <Ionicons name="add-circle-outline" size={18} color="#9CA3AF" />
                    )}
                  </TouchableOpacity>
                );
              }}
            />

            <TouchableOpacity
              style={styles.modalDoneBtn}
              onPress={() => setCategoryModalVisible(false)}
            >
              <Text style={styles.modalDoneBtnText}>완료</Text>
            </TouchableOpacity>
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
  sectionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  showAllBtn: {
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  showAllBtnText: {
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '700',
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
    flexWrap: 'wrap',
    rowGap: 8,
  },
  noCategoryText: {
    fontSize: 12,
    color: '#6B7280',
  },
  selectedCategoryChipWrap: {
    marginRight: 8,
    marginBottom: 8,
    position: 'relative',
  },
  selectedCategoryChip: {
    borderWidth: 1,
    borderColor: '#60A5FA',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EFF6FF',
    maxWidth: 120,
  },
  selectedCategoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1D4ED8',
  },
  selectedChipRemoveBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedChipRemoveBtnText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 10,
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
  modalDoneBtn: {
    marginTop: 10,
    backgroundColor: '#2563EB',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 10,
  },
  modalDoneBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
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
