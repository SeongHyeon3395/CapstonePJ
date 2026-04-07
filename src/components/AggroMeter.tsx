import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface AggroMeterProps {
  score: number;
}

export function AggroMeter({ score }: AggroMeterProps) {
  const clamped = Math.max(0, Math.min(100, score));
  const barColor = clamped < 40 ? '#C62828' : clamped < 70 ? '#F39C12' : '#2E7D32';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>어그로 미터</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${clamped}%`, backgroundColor: barColor }]} />
      </View>
      <Text style={styles.label}>제목과 본문의 내용 일치도가 {clamped}%입니다.</Text>
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
    marginBottom: 10,
  },
  track: {
    height: 14,
    backgroundColor: '#ECE7D8',
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 10,
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
  label: {
    fontSize: 14,
    color: '#3E3528',
    fontWeight: '500',
    lineHeight: 20,
  },
});
