import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AggroBadge } from './AggroBadge';
import type { Article } from '../types/news';

interface NewsCardProps {
  article: Article;
  onPress: (article: Article) => void;
}

export function NewsCard({ article, onPress }: NewsCardProps) {
  return (
    <Pressable style={styles.card} onPress={() => onPress(article)}>
      <AggroBadge score={article.similarity_score} />
      <Text style={styles.title}>{article.title}</Text>
      <View style={styles.metaRow}>
        <Text style={styles.metaText}>{article.press ?? '출처 미상'}</Text>
        <Text style={styles.metaText}>유사도 {article.similarity_score}%</Text>
      </View>
      <Text style={styles.stance}>입장: {article.stance}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#F7F5EE',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#D9D5C7',
  },
  title: {
    color: '#1D1A15',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: 8,
    marginTop: 24,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metaText: {
    fontSize: 14,
    color: '#5B5447',
    fontWeight: '500',
  },
  stance: {
    fontSize: 14,
    color: '#3E3528',
    fontWeight: '600',
  },
});
