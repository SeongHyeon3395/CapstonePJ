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
import { login } from '../api/authApi';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useAuthStore } from '../store/authStore';

type LoginNav = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export default function LoginScreen() {
  const navigation = useNavigation<LoginNav>();
  const setUser = useAuthStore((state) => state.setUser);

  const [university, setUniversity] = useState('');
  const [name, setName] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async () => {
    const u = university.trim();
    const n = name.trim();
    const s = studentNumber.trim();

    if (!u || !n || !s) {
      setErrorMessage('학교, 이름, 학번을 모두 입력해 주세요.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const user = await login({
        university: u,
        name: n,
        student_number: s,
      });
      setUser(user);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>Spectrum</Text>
        <Text style={styles.heroSubtitle}>로그인 후 사용자별 분석기록을 확인하세요</Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.label}>대학교</Text>
        <TextInput style={styles.input} value={university} onChangeText={setUniversity} placeholder="예: OO대학교" />

        <Text style={styles.label}>이름</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="이름" />

        <Text style={styles.label}>학번</Text>
        <TextInput
          style={styles.input}
          value={studentNumber}
          onChangeText={setStudentNumber}
          placeholder="학번"
          autoCapitalize="none"
        />

        <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.loginBtnText}>로그인</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.signupBtn} onPress={() => navigation.navigate('Signup')}>
          <Text style={styles.signupBtnText}>회원가입 하기</Text>
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
  label: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    color: '#111827',
  },
  loginBtn: {
    marginTop: 14,
    backgroundColor: '#1E40AF',
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 12,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  signupBtn: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 11,
  },
  signupBtnText: {
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
