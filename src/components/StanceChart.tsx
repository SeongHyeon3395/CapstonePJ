import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StanceStats {
  total_analyzed?: number;
  total: number;
  agree_count: number;
  agree_percent: number;
  oppose_count: number;
  oppose_percent: number;
  neutral_count: number;
  neutral_percent: number;
  summary?: string;
  sentiment?: {
    positive: { count: number; percent: number; reason: string };
    negative: { count: number; percent: number; reason: string };
  };
}

interface StanceChartProps {
  stats: StanceStats;
}

export default function StanceChart({ stats }: StanceChartProps) {
  const fallbackPositive = Math.round((stats.agree_percent + stats.neutral_percent * 0.5) * 10) / 10;
  const fallbackNegative = Math.max(0, Math.round((100 - fallbackPositive) * 10) / 10);

  const positive = {
    count: stats.sentiment?.positive.count ?? stats.agree_count,
    percent: stats.sentiment?.positive.percent ?? fallbackPositive,
    reason: stats.sentiment?.positive.reason ?? '긍정 관점의 통합 근거가 아직 생성되지 않았습니다.',
  };

  const negative = {
    count: stats.sentiment?.negative.count ?? stats.oppose_count,
    percent: stats.sentiment?.negative.percent ?? fallbackNegative,
    reason: stats.sentiment?.negative.reason ?? '부정 관점의 통합 근거가 아직 생성되지 않았습니다.',
  };

  const rows = [
    { key: '긍정적', count: positive.count, percent: positive.percent, color: '#2563EB' },
    { key: '부정적', count: negative.count, percent: negative.percent, color: '#EF4444' },
  ];

  return (
    <View style={styles.wrap}>
      {rows.map((row) => (
        <View key={row.key} style={styles.rowWrap}>
          <View style={styles.rowHeader}>
            <Text style={styles.rowLabel}>{row.key}</Text>
            <Text style={styles.rowValue}>{row.count}건  {row.percent.toFixed(1)}%</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.max(0, Math.min(100, row.percent))}%`, backgroundColor: row.color }]} />
          </View>
        </View>
      ))}

      <View style={styles.summaryBox}>
        <Text style={styles.summaryTitle}>총 {stats.total_analyzed ?? stats.total}건 분석</Text>
        <Text style={styles.summaryText}>
          긍정 {positive.count}건 / 부정 {negative.count}건
        </Text>
        <View style={styles.reasonCard}>
          <Text style={styles.reasonLabel}>긍정적 핵심 이유</Text>
          <Text style={styles.reasonText}>{positive.reason}</Text>
        </View>
        <View style={styles.reasonCard}>
          <Text style={[styles.reasonLabel, { color: '#B91C1C' }]}>부정적 핵심 이유</Text>
          <Text style={styles.reasonText}>{negative.reason}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 14,
  },
  rowWrap: {
    gap: 8,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  rowValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  track: {
    height: 18,
    backgroundColor: '#E5E7EB',
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
  summaryBox: {
    padding: 16,
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
  },
  summaryTitle: {
    fontSize: 20,
    color: '#1F2937',
    fontWeight: '700',
  },
  summaryText: {
    marginTop: 8,
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 20,
  },
  reasonCard: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  reasonLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1D4ED8',
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
});
