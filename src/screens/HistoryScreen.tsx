import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Article, getUserManualHistory, resetAllManualHistory } from '../api/newsApi';
import { useAuthStore } from '../store/authStore';
import { RootStackParamList } from '../navigation/RootNavigator';

type RootNavigation = NativeStackNavigationProp<RootStackParamList, 'Main'>;

export default function HistoryScreen() {
  const navigation = useNavigation<RootNavigation>();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const [history, setHistory] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    if (!user?.id) {
      setHistory([]);
      return;
    }

    setLoading(true);
    try {
      const rows = await getUserManualHistory(user.id, 100);
      setHistory(rows);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory]),
  );

  const handleClearAll = () => {
    if (!user?.id) {
      return;
    }

    Alert.alert('기록 삭제', '내 분석기록을 모두 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          const ok = await resetAllManualHistory(user.id);
          if (ok) {
            setHistory([]);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.heroWrap, { paddingTop: insets.top + 12 }]}>
        <View style={styles.heroRow}>
          <Ionicons name="time-outline" size={18} color="#FFFFFF" />
          <View style={styles.heroTextWrap}>
            <Text style={styles.heroTitle}>Spectrum</Text>
            <Text style={styles.heroSubtitle}>분석 기록</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.clearButton} onPress={handleClearAll}>
          <Text style={styles.clearButtonText}>내 기록 전체 삭제</Text>
        </TouchableOpacity>
      </View>

      {history.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>
            저장된 분석 기록이 없습니다
          </Text>
        </View>
      ) : (
        <FlatList
          data={history}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadHistory} />}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const created = item.created_at ? new Date(item.created_at).toLocaleString('ko-KR') : '';
            return (
              <TouchableOpacity
                style={styles.itemWrap}
                onPress={() => navigation.navigate('Detail', { keyword: item.keyword, articleId: item.id })}
              >
                <View style={styles.itemTopRow}>
                  <Text style={styles.stanceBadge}>{item.stance}</Text>
                  <Text style={styles.similarity}>{item.similarity_score}%</Text>
                </View>
                <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.itemMeta} numberOfLines={1}>{item.source || '출처 미상'}</Text>
                <Text style={styles.itemDate}>{created}</Text>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    fontSize: 14,
  },
  clearButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#EFF6FF',
  },
  clearButtonText: {
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 16,
    textAlign: 'center',
  },
  itemWrap: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  itemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stanceBadge: {
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '700',
  },
  similarity: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
  },
  itemTitle: {
    marginTop: 6,
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '700',
  },
  itemMeta: {
    marginTop: 4,
    color: '#64748B',
    fontSize: 12,
  },
  itemDate: {
    marginTop: 6,
    color: '#94A3B8',
    fontSize: 12,
  },
});
