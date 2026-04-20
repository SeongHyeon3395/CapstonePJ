import { supabase } from '../config/supabase';

export interface AppUser {
  id: string;
  university: string;
  department: string;
  name: string;
  student_number: string;
  created_at?: string;
}

export interface SignupInput {
  university: string;
  department: string;
  name: string;
  studentNumber: string;
}

export interface LoginInput {
  university: string;
  name: string;
  studentNumber: string;
}

export interface UpdateProfileInput {
  userId: string;
  university: string;
  department: string;
  name: string;
  studentNumber: string;
}

function normalize(value: string): string {
  return value.trim();
}

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const rand = Math.floor(Math.random() * 16);
    const value = char === 'x' ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
}

export async function signupUser(input: SignupInput): Promise<AppUser> {
  const university = normalize(input.university);
  const department = normalize(input.department);
  const name = normalize(input.name);
  const studentNumber = normalize(input.studentNumber);

  if (!university || !department || !name || !studentNumber) {
    throw new Error('대학교, 학과, 이름, 학번은 모두 필수입니다.');
  }

  const { data: existing, error: existingError } = await supabase
    .from('app_users')
    .select('id,university,department,name,student_number,created_at')
    .eq('university', university)
    .eq('name', name)
    .eq('student_number', studentNumber)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing) {
    return existing as AppUser;
  }

  const payload = {
    id: generateId(),
    university,
    department,
    name,
    student_number: studentNumber,
  };

  const { data, error } = await supabase
    .from('app_users')
    .insert(payload)
    .select('id,university,department,name,student_number,created_at')
    .single();

  if (error) {
    throw error;
  }

  return data as AppUser;
}

export async function loginUser(input: LoginInput): Promise<AppUser | null> {
  const university = normalize(input.university);
  const name = normalize(input.name);
  const studentNumber = normalize(input.studentNumber);

  if (!university || !name || !studentNumber) {
    throw new Error('대학교, 이름, 학번은 모두 필수입니다.');
  }

  const { data, error } = await supabase
    .from('app_users')
    .select('id,university,department,name,student_number,created_at')
    .eq('university', university)
    .eq('name', name)
    .eq('student_number', studentNumber)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as AppUser | null) ?? null;
}

export async function updateUserProfile(input: UpdateProfileInput): Promise<AppUser> {
  const userId = normalize(input.userId);
  const university = normalize(input.university);
  const department = normalize(input.department);
  const name = normalize(input.name);
  const studentNumber = normalize(input.studentNumber);

  if (!userId) {
    throw new Error('user_id는 필수입니다.');
  }

  if (!university || !department || !name || !studentNumber) {
    throw new Error('대학교, 학과, 이름, 학번은 모두 필수입니다.');
  }

  const { data, error } = await supabase
    .from('app_users')
    .update({
      university,
      department,
      name,
      student_number: studentNumber,
    })
    .eq('id', userId)
    .select('id,university,department,name,student_number,created_at')
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('수정할 사용자를 찾지 못했습니다. 다시 로그인해 주세요.');
  }

  return data as AppUser;
}
