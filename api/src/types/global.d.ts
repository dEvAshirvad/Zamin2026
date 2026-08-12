import type { PlatformRole } from '@/lib/auth/roles';

export interface QueryOptions {
  page: number;
  limit: number;
  sort?: string;
}

export interface PaginatedResult<T> {
  docs: T[];
  totalDocs: number;
  limit: number;
  totalPages: number;
  page: number;
  nextPage: boolean;
  prevPage: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
  role?: PlatformRole | null;
  tehsilId?: string | null;
}

export interface AuthSession {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      id?: string;
      user?: AuthUser;
      session?: AuthSession;
    }
  }
}

export {};
