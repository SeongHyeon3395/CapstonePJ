import type { Request, Response } from 'express';
import { loginUser, signupUser, updateUserProfile } from '../services/authService';

export async function signupController(req: Request, res: Response): Promise<void> {
  const university = String(req.body?.university ?? '').trim();
  const department = String(req.body?.department ?? '').trim();
  const name = String(req.body?.name ?? '').trim();
  const studentNumber = String(req.body?.student_number ?? req.body?.studentNumber ?? '').trim();

  if (!university || !department || !name || !studentNumber) {
    res.status(400).json({ message: '대학교, 학과, 이름, 학번은 모두 필수입니다.' });
    return;
  }

  try {
    const user = await signupUser({
      university,
      department,
      name,
      studentNumber,
    });
    res.json({ user });
  } catch (error) {
    res.status(500).json({
      message: '회원가입 중 오류가 발생했습니다.',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function loginController(req: Request, res: Response): Promise<void> {
  const university = String(req.body?.university ?? '').trim();
  const name = String(req.body?.name ?? '').trim();
  const studentNumber = String(req.body?.student_number ?? req.body?.studentNumber ?? '').trim();

  if (!university || !name || !studentNumber) {
    res.status(400).json({ message: '대학교, 이름, 학번은 모두 필수입니다.' });
    return;
  }

  try {
    const user = await loginUser({ university, name, studentNumber });
    if (!user) {
      res.status(401).json({ message: '일치하는 사용자를 찾지 못했습니다. 회원가입을 먼저 진행해 주세요.' });
      return;
    }
    res.json({ user });
  } catch (error) {
    res.status(500).json({
      message: '로그인 중 오류가 발생했습니다.',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function updateProfileController(req: Request, res: Response): Promise<void> {
  const userId = String(req.body?.user_id ?? req.body?.userId ?? '').trim();
  const university = String(req.body?.university ?? '').trim();
  const department = String(req.body?.department ?? '').trim();
  const name = String(req.body?.name ?? '').trim();
  const studentNumber = String(req.body?.student_number ?? req.body?.studentNumber ?? '').trim();

  if (!userId || !university || !department || !name || !studentNumber) {
    res.status(400).json({ message: 'user_id, 대학교, 학과, 이름, 학번은 모두 필수입니다.' });
    return;
  }

  try {
    const user = await updateUserProfile({
      userId,
      university,
      department,
      name,
      studentNumber,
    });
    res.json({ user });
  } catch (error) {
    const code = String((error as { code?: string } | undefined)?.code ?? '');
    if (code === '23505') {
      res.status(409).json({ message: '동일한 학교/이름/학번 조합의 사용자가 이미 존재합니다.' });
      return;
    }

    res.status(500).json({
      message: '프로필 수정 중 오류가 발생했습니다.',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}
