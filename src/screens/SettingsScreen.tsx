import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { CollectLogEntry, getCollectLogs, runCollectTestRun } from '../api/newsApi';

export default function SettingsScreen() {
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [logs, setLogs] = useState<CollectLogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [runningTest, setRunningTest] = useState(false);

  const statusLabelMap = useMemo<Record<CollectLogEntry['status'], string>>(
    () => ({
      success: '성공',
      failed: '실패',
      skipped: '건너뜀',
    }),
    [],
  );

  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      const next = await getCollectLogs(7);
      setLogs(next);
    } finally {
      setLoadingLogs(false);
    }
  };

  const openLogModal = async () => {
    setLogModalVisible(true);
    await loadLogs();
  };

  const runTestCollect = async () => {
    if (runningTest) return;
    setRunningTest(true);
    try {
      await runCollectTestRun(7);
      await loadLogs();
    } finally {
      setRunningTest(false);
    }
  };

  const renderLogItem = ({ item }: { item: CollectLogEntry }) => {
    const timestamp = new Date(item.timestamp).toLocaleString('ko-KR');
    const statusColor =
      item.status === 'success' ? '#16A34A' : item.status === 'failed' ? '#DC2626' : '#6B7280';

    return (
      <View style={styles.logItemCard}>
        <View style={styles.logItemHeader}>
          <Text style={styles.logTime}>{timestamp}</Text>
          <Text style={[styles.logStatus, { color: statusColor }]}>{statusLabelMap[item.status]}</Text>
        </View>
        <Text style={styles.logMainText}>
          [{item.source}] {item.keyword} | 요청 {item.requestedCount}건 / 추가 {item.addedCount}건
        </Text>
        <Text style={styles.logSubText}>{item.message}</Text>
      </View>
    );
  };

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

        <View style={styles.sectionTitleRow}>
          <Ionicons name="pulse-outline" size={18} color="#2563EB" />
          <Text style={styles.sectionTitle}>뉴스 데이터 수집 로그</Text>
        </View>
        <View style={styles.card}>
          <TouchableOpacity style={styles.actionButton} onPress={openLogModal}>
            <Text style={styles.actionButtonText}>수집 로그 보기</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonSecondary]}
            onPress={runTestCollect}
            disabled={runningTest}
          >
            {runningTest ? (
              <View style={styles.inlineLoadingRow}>
                <ActivityIndicator size="small" color="#1D4ED8" />
                <Text style={styles.actionButtonTextSecondary}>7회 테스트 수집 실행 중...</Text>
              </View>
            ) : (
              <Text style={styles.actionButtonTextSecondary}>7회 테스트 수집 실행</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={logModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLogModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>최근 수집 로그 7건</Text>
              <TouchableOpacity onPress={() => setLogModalVisible(false)}>
                <Text style={styles.modalClose}>닫기</Text>
              </TouchableOpacity>
            </View>

            {loadingLogs ? (
              <View style={styles.modalLoadingWrap}>
                <ActivityIndicator size="small" color="#2563EB" />
                <Text style={styles.modalLoadingText}>로그를 불러오는 중...</Text>
              </View>
            ) : (
              <FlatList
                data={logs}
                keyExtractor={(item, index) => `${item.timestamp}-${index}`}
                renderItem={renderLogItem}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                ListEmptyComponent={<Text style={styles.emptyLogText}>표시할 로그가 없습니다.</Text>}
              />
            )}

            <TouchableOpacity style={styles.refreshBtn} onPress={loadLogs} disabled={loadingLogs}>
              <Text style={styles.refreshBtnText}>새로고침</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  actionButton: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  actionButtonSecondary: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 0,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  actionButtonTextSecondary: {
    color: '#1D4ED8',
    fontSize: 14,
    fontWeight: '700',
  },
  inlineLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17,24,39,0.5)',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  modalCard: {
    maxHeight: '78%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  modalClose: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
  modalLoadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 24,
  },
  modalLoadingText: {
    color: '#4B5563',
    fontSize: 13,
  },
  logItemCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#F9FAFB',
  },
  logItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  logTime: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
  },
  logStatus: {
    fontSize: 12,
    fontWeight: '700',
  },
  logMainText: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  logSubText: {
    color: '#4B5563',
    fontSize: 12,
  },
  emptyLogText: {
    textAlign: 'center',
    color: '#6B7280',
    paddingVertical: 18,
  },
  refreshBtn: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 10,
  },
  refreshBtnText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '700',
  },
});
