import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface AggroMeterProps {
  score: number; // 0-100
}

export default function AggroMeter({ score }: AggroMeterProps) {
  const getColor = () => {
    if (score >= 70) return '#10B981';
    if (score >= 40) return '#F59E0B';
    return '#EF4444';
  };

  const getLabel = () => {
    if (score >= 70) return '신뢰도 높음';
    if (score >= 40) return '보통';
    return '어그로 의심';
  };

  return (
    <View>
      {/* Progress Bar Background */}
      <View style={styles.track}>
        {/* Progress Bar Fill */}
        <View
          style={[styles.fill, { width: `${score}%`, backgroundColor: getColor() }]}
        >
          {score >= 20 && (
            <Text style={styles.fillText}>{score}%</Text>
          )}
        </View>
      </View>

      {/* Score Display if too small */}
      {score < 20 && (
        <Text style={styles.lowScoreText}>{score}%</Text>
      )}

      {/* Label and Explanation */}
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>
          {getLabel()}
        </Text>
        <Text style={styles.infoText}>
          제목과 본문의 내용 일치도가 {score}%입니다.
          {score < 40 && ' 제목이 본문 내용을 과장했을 가능성이 있습니다.'}
          {score >= 70 && ' 제목이 본문 내용을 잘 반영하고 있습니다.'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 32,
    backgroundColor: '#E5E7EB',
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  lowScoreText: {
    marginTop: 4,
    fontSize: 12,
    color: '#374151',
  },
  infoBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
});
