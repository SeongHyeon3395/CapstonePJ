import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="settings-outline" size={20} color="#FFFFFF" />
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>설정</Text>
          <Text style={styles.headerSubtitle}>앱 설정 및 정보</Text>
        </View>
      </View>

      <View style={styles.contentWrap}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="information-circle-outline" size={18} color="#2563EB" />
          <Text style={styles.sectionTitle}>앱 정보</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.bodyText}>버전: 1.0.0</Text>
          <Text style={styles.bodyText}>
            Spectrum Project - AI 기반 뉴스 분석
          </Text>
        </View>

        <View style={styles.sectionTitleRow}>
          <Ionicons name="help-circle-outline" size={18} color="#2563EB" />
          <Text style={styles.sectionTitle}>기능 소개</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.featureText}>
            • 데이터 기반 여론 분포 분석{'\n'}
            • 어그로 제목 판별 (제목-본문 유사도){'\n'}
            • AI 기반 기사 Q&A (RAG)
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    backgroundColor: '#2F55E7',
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTextWrap: {
    marginLeft: 10,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#DBEAFE',
    fontSize: 14,
  },
  contentWrap: {
    padding: 14,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    marginLeft: 6,
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  bodyText: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
  },
});
