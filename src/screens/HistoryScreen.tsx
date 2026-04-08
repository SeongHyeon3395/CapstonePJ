import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useNewsStore } from '../store/newsStore';

export default function HistoryScreen() {
  const { searchHistory } = useNewsStore();

  return (
    <View style={styles.container}>
      <View style={styles.heroWrap}>
        <View style={styles.heroRow}>
          <Ionicons name="time-outline" size={18} color="#FFFFFF" />
          <View style={styles.heroTextWrap}>
            <Text style={styles.heroTitle}>Spectrum</Text>
            <Text style={styles.heroSubtitle}>분석 기록</Text>
          </View>
        </View>
      </View>

      {searchHistory.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>
            아직 분석한 이슈가 없습니다
          </Text>
        </View>
      ) : (
        <FlatList
          data={searchHistory}
          keyExtractor={(item, index) => `${item}-${index}`}
          renderItem={({ item }) => (
            <View style={styles.itemWrap}>
              <Text style={styles.itemText}>{item}</Text>
            </View>
          )}
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
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 18,
    textAlign: 'center',
  },
  itemWrap: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  itemText: {
    fontSize: 16,
    color: '#1F2937',
  },
});
