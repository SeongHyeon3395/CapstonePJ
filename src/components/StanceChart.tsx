import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import type { NewsStatsResponse } from '../types/news';

interface StanceChartProps {
  stats: NewsStatsResponse;
}

const SIZE = 180;
const STROKE_WIDTH = 26;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function segmentLength(percent: number) {
  return (Math.max(0, Math.min(100, percent)) / 100) * CIRCUMFERENCE;
}

export function StanceChart({ stats }: StanceChartProps) {
  const agreeLen = segmentLength(stats.agree_percent);
  const opposeLen = segmentLength(stats.oppose_percent);
  const neutralLen = segmentLength(stats.neutral_percent);

  const agreeOffset = 0;
  const opposeOffset = agreeLen;
  const neutralOffset = agreeLen + opposeLen;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>입장 분포</Text>
      <View style={styles.chartWrapper}>
        <Svg width={SIZE} height={SIZE}>
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke="#E7E2D3"
            strokeWidth={STROKE_WIDTH}
            fill="transparent"
          />
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke="#1E824C"
            strokeWidth={STROKE_WIDTH}
            fill="transparent"
            strokeDasharray={`${agreeLen} ${CIRCUMFERENCE}`}
            strokeDashoffset={-agreeOffset}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke="#C0392B"
            strokeWidth={STROKE_WIDTH}
            fill="transparent"
            strokeDasharray={`${opposeLen} ${CIRCUMFERENCE}`}
            strokeDashoffset={-opposeOffset}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke="#5F6D7A"
            strokeWidth={STROKE_WIDTH}
            fill="transparent"
            strokeDasharray={`${neutralLen} ${CIRCUMFERENCE}`}
            strokeDashoffset={-neutralOffset}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        </Svg>
        <View style={styles.centerLabel}>
          <Text style={styles.centerTotal}>{stats.total}</Text>
          <Text style={styles.centerText}>총 기사</Text>
        </View>
      </View>

      <View style={styles.legendRow}>
        <Text style={styles.legend}>찬성 {stats.agree_percent.toFixed(1)}%</Text>
        <Text style={styles.legend}>반대 {stats.oppose_percent.toFixed(1)}%</Text>
        <Text style={styles.legend}>중립 {stats.neutral_percent.toFixed(1)}%</Text>
      </View>

      <Text style={styles.countText}>
        총 {stats.total}건 분석 (찬성 {stats.agree_count}건 / 반대 {stats.oppose_count}건 / 중립 {stats.neutral_count}건)
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F7F5EE',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D9D5C7',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1D1A15',
    marginBottom: 12,
  },
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  centerLabel: {
    position: 'absolute',
    alignItems: 'center',
  },
  centerTotal: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1D1A15',
  },
  centerText: {
    fontSize: 14,
    color: '#5B5447',
    fontWeight: '600',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  legend: {
    fontSize: 14,
    color: '#3E3528',
    fontWeight: '600',
  },
  countText: {
    fontSize: 14,
    color: '#3E3528',
    lineHeight: 20,
    fontWeight: '500',
  },
});
