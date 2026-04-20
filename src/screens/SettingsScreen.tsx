import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { CollectLogEntry, CollectStatus, getCollectLogs, getCollectStatus } from '../api/newsApi';
import { updateProfile } from '../api/authApi';
import { useAuthStore } from '../store/authStore';

export default function SettingsScreen() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [logs, setLogs] = useState<CollectLogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [collectStatus, setCollectStatus] = useState<CollectStatus | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [editUniversity, setEditUniversity] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editName, setEditName] = useState('');
  const [editStudentNumber, setEditStudentNumber] = useState('');

  useEffect(() => {
    if (!user || editingProfile) {
      return;
    }

    setEditUniversity(user.university ?? '');
    setEditDepartment(user.department ?? '');
    setEditName(user.name ?? '');
    setEditStudentNumber(user.student_number ?? '');
  }, [editingProfile, user]);

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
      const [nextLogs, nextStatus] = await Promise.all([
        getCollectLogs(7),
        getCollectStatus(),
      ]);
      setLogs(nextLogs);
      setCollectStatus(nextStatus);
    } finally {
      setLoadingLogs(false);
    }
  };

  const openLogModal = async () => {
    setLogModalVisible(true);
    await loadLogs();
  };

  const startProfileEdit = () => {
    if (!user) {
      return;
    }

    setEditUniversity(user.university ?? '');
    setEditDepartment(user.department ?? '');
    setEditName(user.name ?? '');
    setEditStudentNumber(user.student_number ?? '');
    setProfileError('');
    setEditingProfile(true);
  };

  const cancelProfileEdit = () => {
    setProfileError('');
    setEditingProfile(false);
  };

  const saveProfileEdit = async () => {
    if (!user?.id || savingProfile) {
      return;
    }

    const university = editUniversity.trim();
    const department = editDepartment.trim();
    const name = editName.trim();
    const studentNumber = editStudentNumber.trim();

    if (!university || !department || !name || !studentNumber) {
      setProfileError('대학교, 학과, 학번, 이름을 모두 입력해 주세요.');
      return;
    }

    setSavingProfile(true);
    setProfileError('');
    try {
      const updated = await updateProfile({
        user_id: user.id,
        university,
        department,
        name,
        student_number: studentNumber,
      });
      setUser(updated);
      setEditingProfile(false);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : '프로필 저장에 실패했습니다.');
    } finally {
      setSavingProfile(false);
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
        <View style={styles.headerTopRow}>
          {editingProfile ? (
            <View style={styles.profileActionRow}>
              <TouchableOpacity
                style={[styles.profileActionButton, styles.profileCancelButton]}
                onPress={cancelProfileEdit}
                disabled={savingProfile}
              >
                <Ionicons name="close-outline" size={18} color="#DBEAFE" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.profileActionButton, styles.profileSaveButton]}
                onPress={saveProfileEdit}
                disabled={savingProfile}
              >
                {savingProfile ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="checkmark-outline" size={18} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.editButton} onPress={startProfileEdit}>
              <Ionicons name="pencil-outline" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>

        {editingProfile ? (
          <TextInput
            style={[styles.universityText, styles.headerInput, styles.universityInput]}
            value={editUniversity}
            onChangeText={setEditUniversity}
            placeholder="대학교"
            placeholderTextColor="#BFDBFE"
          />
        ) : (
          <Text style={styles.universityText}>{user?.university || '학교 정보 없음'}</Text>
        )}

        <View style={styles.identityRow}>
          {editingProfile ? (
            <>
              <TextInput
                style={[styles.identityText, styles.headerInput, styles.identityInput]}
                value={editStudentNumber}
                onChangeText={setEditStudentNumber}
                placeholder="학번"
                placeholderTextColor="#BFDBFE"
                keyboardType="number-pad"
              />
              <Text style={styles.identityDivider}>/</Text>
              <TextInput
                style={[styles.identityText, styles.headerInput, styles.identityInput]}
                value={editDepartment}
                onChangeText={setEditDepartment}
                placeholder="학과"
                placeholderTextColor="#BFDBFE"
              />
            </>
          ) : (
            <>
              <Text style={styles.identityText}>학번 {user?.student_number || '-'}</Text>
              <Text style={styles.identityDivider}>/</Text>
              <Text style={styles.identityText}>{user?.department || '학과 정보 없음'}</Text>
            </>
          )}
        </View>

        <View style={styles.nameRow}>
          {editingProfile ? (
            <TextInput
              style={[styles.nameText, styles.headerInput, styles.nameInput]}
              value={editName}
              onChangeText={setEditName}
              placeholder="이름"
              placeholderTextColor="#BFDBFE"
            />
          ) : (
            <Text style={styles.nameText}>{user?.name || '이름 정보 없음'}</Text>
          )}
        </View>

        {profileError ? <Text style={styles.profileErrorText}>{profileError}</Text> : null}
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
        </View>

        <View style={styles.sectionTitleRow}>
          <Ionicons name="log-out-outline" size={18} color="#DC2626" />
          <Text style={styles.sectionTitle}>계정</Text>
        </View>
        <View style={styles.card}>
          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <Text style={styles.logoutButtonText}>로그아웃</Text>
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
              <>
                <View style={styles.statusCard}>
                  <Text style={styles.statusTitle}>자동 수집 상태</Text>
                  <Text style={styles.statusText}>주기: {collectStatus?.intervalMinutes ?? 360}분마다 1건 수집</Text>
                  <Text style={styles.statusText}>동작: {collectStatus?.enabled ? '활성화' : '비활성화'} / {collectStatus?.started ? '실행중' : '중지됨'}</Text>
                  <Text style={styles.statusText}>마지막 실행: {collectStatus?.lastRunAt ? new Date(collectStatus.lastRunAt).toLocaleString('ko-KR') : '-'}</Text>
                  <Text style={styles.statusText}>다음 실행: {collectStatus?.nextRunAt ? new Date(collectStatus.nextRunAt).toLocaleString('ko-KR') : '-'}</Text>
                  {collectStatus?.lastError ? <Text style={styles.statusError}>최근 오류: {collectStatus.lastError}</Text> : null}
                </View>

                <FlatList
                  data={logs}
                  keyExtractor={(item, index) => `${item.timestamp}-${index}`}
                  renderItem={renderLogItem}
                  ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                  ListEmptyComponent={<Text style={styles.emptyLogText}>표시할 로그가 없습니다.</Text>}
                />
              </>
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
    paddingTop: 24,
    paddingBottom: 18,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 2,
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  profileActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  profileActionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  profileCancelButton: {
    backgroundColor: 'rgba(148, 163, 184, 0.3)',
    borderColor: 'rgba(191, 219, 254, 0.45)',
  },
  profileSaveButton: {
    backgroundColor: 'rgba(37, 99, 235, 0.9)',
    borderColor: 'rgba(255,255,255,0.35)',
  },
  universityText: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
  },
  headerInput: {
    borderWidth: 1,
    borderColor: 'rgba(191, 219, 254, 0.5)',
    backgroundColor: 'rgba(30, 58, 138, 0.35)',
    borderRadius: 10,
    color: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  universityInput: {
    marginTop: 2,
  },
  identityRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  identityText: {
    color: '#DBEAFE',
    fontSize: 15,
    fontWeight: '700',
  },
  identityInput: {
    minWidth: 110,
    fontSize: 15,
    fontWeight: '700',
    color: '#DBEAFE',
    paddingVertical: 4,
  },
  identityDivider: {
    color: '#BFDBFE',
    marginHorizontal: 8,
    fontSize: 15,
    fontWeight: '700',
  },
  nameRow: {
    marginTop: 8,
    alignItems: 'flex-end',
  },
  nameText: {
    color: '#EFF6FF',
    fontSize: 20,
    fontWeight: '700',
  },
  nameInput: {
    minWidth: 120,
    textAlign: 'right',
    color: '#EFF6FF',
    fontSize: 20,
    fontWeight: '700',
    paddingVertical: 5,
  },
  profileErrorText: {
    marginTop: 8,
    color: '#FECACA',
    fontSize: 12,
    fontWeight: '600',
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
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  logoutButton: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#B91C1C',
    fontSize: 14,
    fontWeight: '700',
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
  statusCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  statusTitle: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  statusText: {
    color: '#475569',
    fontSize: 12,
    marginBottom: 2,
  },
  statusError: {
    color: '#B91C1C',
    fontSize: 12,
    marginTop: 4,
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
