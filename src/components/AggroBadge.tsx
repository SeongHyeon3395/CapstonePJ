import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface AggroBadgeProps {
  score: number;
}

export function AggroBadge({ score }: AggroBadgeProps) {
  if (score >= 40) {
    return null;
  }

  return (
    <View style={styles.badge}>
      <Text style={styles.text}>
        🚨 어그로 주의
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#C62828',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    zIndex: 1,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
