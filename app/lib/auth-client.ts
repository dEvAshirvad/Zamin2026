import { api, apiGet } from '@/lib/api';

export type PlatformRole = 'admin' | 'tehsildar' | 'ri';

export interface MeUser {
  id: string;
  email: string;
  name: string;
  role: PlatformRole | null;
  tehsilId: string | null;
  tehsil: { id: string; name: string; slug: string } | null;
  inviteEmailEnabled?: boolean;
}

interface ApiSuccess<T> {
  success: boolean;
  data: T;
}

export function homeForRole(role: PlatformRole | null | undefined): string {
  if (role === 'admin') return '/admin';
  if (role === 'tehsildar') return '/tehsildar';
  if (role === 'ri') return '/ri';
  return '/login';
}

export async function signInEmail(email: string, password: string) {
  const { data } = await api.post('/api/auth/sign-in/email', {
    email,
    password,
  });
  return data;
}

export async function signOut() {
  await api.post('/api/auth/sign-out', {});
}

export async function fetchMe(): Promise<MeUser | null> {
  try {
    const res = await apiGet<ApiSuccess<MeUser>>('/api/v1/me');
    return res.data;
  } catch {
    return null;
  }
}
