import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Article {
  id: string;
  title: string;
  content: string;
  url: string;
  source?: string;
  stance: '찬성' | '반대' | '중립' | '분류불가';
  reason?: string;
  evidence?: string;
  similarity_score: number;
  published_at?: string;
  created_at: string;
}

interface NewsCardProps {
  article: Article;
  onPress: () => void;
}

export default function NewsCard({ article, onPress }: NewsCardProps) {
  const isAggro = article.similarity_score < 40;
  const dateText = (article.published_at ?? article.created_at ?? '').slice(0, 10).replace(/-/g, '. ');

  const getStanceColor = (stance: string) => {
    switch (stance) {
      case '찬성':
        return styles.stanceAgree;
      case '반대':
        return styles.stanceOppose;
      case '분류불가':
        return styles.stanceUnknown;
      default:
        return styles.stanceNeutral;
    }
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.topRow}>
        <View style={[styles.stancePill, getStanceColor(article.stance)]}>
          <Text style={styles.stanceText}>{article.stance}</Text>
        </View>

        {isAggro && (
          <View style={styles.badge}>
            <Text style={styles.badgeIcon}>🚨</Text>
            <Text style={styles.badgeText}>어그로 주의</Text>
          </View>
        )}
      </View>

      {/* Title */}
      <Text style={styles.title}>
        {article.title}
      </Text>

      {/* Evidence / Content Preview */}
      <Text style={styles.preview} numberOfLines={2}>
        {article.reason || article.evidence || article.content}
      </Text>

      {/* Footer */}
      <View style={styles.footerRow}>
        <Text style={styles.metaText}>{dateText}  {article.source || '출처 미상'}</Text>
        
        <Text style={styles.similarityText}>
          일치도 {article.similarity_score}%
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#B91C1C',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 8,
  },
  badgeIcon: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  badgeText: {
    marginLeft: 4,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    lineHeight: 24,
  },
  preview: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 12,
    lineHeight: 20,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaText: {
    fontSize: 12,
    color: '#6B7280',
    flex: 1,
    marginRight: 8,
  },
  stancePill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  stanceAgree: {
    backgroundColor: '#DCFCE7',
  },
  stanceOppose: {
    backgroundColor: '#FEE2E2',
  },
  stanceNeutral: {
    backgroundColor: '#F3F4F6',
  },
  stanceUnknown: {
    backgroundColor: '#EDE9FE',
  },
  stanceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  similarityText: {
    fontSize: 12,
    color: '#6B7280',
  },
});
