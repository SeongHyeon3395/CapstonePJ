import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { signup } from '../api/authApi';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useAuthStore } from '../store/authStore';

type SignupNav = NativeStackNavigationProp<RootStackParamList, 'Signup'>;

export default function SignupScreen() {
  const navigation = useNavigation<SignupNav>();
  const setUser = useAuthStore((state) => state.setUser);

  const [university, setUniversity] = useState('');
  const [department, setDepartment] = useState('');
  const [name, setName] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSignup = async () => {
    const u = university.trim();
    const d = department.trim();
    const n = name.trim();
    const s = studentNumber.trim();

    if (!u || !d || !n || !s) {
      setErrorMessage('대학교, 학과, 이름, 학번을 모두 입력해 주세요.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const user = await signup({
        university: u,
        department: d,
        name: n,
        student_number: s,
      });
      setUser(user);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '회원가입에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>Spectrum</Text>
        <Text style={styles.heroSubtitle}>회원가입 후 사용자별 분석기록을 확인하세요</Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.title}>회원가입</Text>
        <Text style={styles.subtitle}>사용자별 분석기록을 위해 기본 정보를 입력해 주세요.</Text>

        <Text style={styles.label}>대학교</Text>
        <TextInput style={styles.input} value={university} onChangeText={setUniversity} placeholder="대학교" />

        <Text style={styles.label}>학과</Text>
        <TextInput style={styles.input} value={department} onChangeText={setDepartment} placeholder="학과" />

        <Text style={styles.label}>이름</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="이름" />

        <Text style={styles.label}>학번</Text>
        <TextInput style={styles.input} value={studentNumber} onChangeText={setStudentNumber} placeholder="학번" />

        <TouchableOpacity style={styles.primaryBtn} onPress={handleSignup} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryBtnText}>가입하고 시작하기</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.secondaryBtnText}>이미 계정이 있어요</Text>
        </TouchableOpacity>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  heroCard: {
    marginBottom: 16,
    alignItems: 'center',
  },
  heroTitle: {
    color: '#1E3A8A',
    fontSize: 36,
    fontWeight: '800',
  },
  heroSubtitle: {
    color: '#475569',
    marginTop: 4,
    fontSize: 14,
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 16,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    marginTop: 6,
    color: '#475569',
    fontSize: 13,
    lineHeight: 18,
  },
  label: {
    marginTop: 10,
    marginBottom: 6,
    color: '#111827',
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#0F172A',
  },
  primaryBtn: {
    marginTop: 16,
    backgroundColor: '#1E40AF',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 12,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 11,
  },
  secondaryBtnText: {
    color: '#1E40AF',
    fontSize: 14,
    fontWeight: '700',
  },
  errorText: {
    marginTop: 10,
    color: '#B91C1C',
    fontSize: 13,
  },
});
