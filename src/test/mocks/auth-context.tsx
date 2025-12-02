import { ReactNode } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { User, Session } from '@supabase/supabase-js';
import { vi } from 'vitest';

interface MockAuthProviderProps {
  children: ReactNode;
  overrides?: Partial<{
    user: User | null;
    session: Session | null;
    loading: boolean;
    profileComplete: boolean | null;
    signUp: any;
    signIn: (email: string, password: string, isPostSignUp?: boolean) => Promise<{ error: any }>;
    signOut: any;
    checkProfile: any;
  }>;
}

const defaultMockUser: User = {
  id: 'test-user-id',
  email: 'test@example.com',
  aud: 'authenticated',
  role: 'authenticated',
  created_at: new Date().toISOString(),
  app_metadata: {},
  user_metadata: {},
} as User;

const defaultMockSession: Session = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: defaultMockUser,
} as Session;

export const MockAuthProvider = ({ children, overrides = {} }: MockAuthProviderProps) => {
  const defaultValue = {
    user: null,
    session: null,
    loading: false,
    profileComplete: null,
    signUp: vi.fn().mockResolvedValue({ error: null }),
    signIn: vi.fn().mockResolvedValue({ error: null }),
    signOut: vi.fn().mockResolvedValue(undefined),
    checkProfile: vi.fn().mockResolvedValue(undefined),
  };

  const value = { ...defaultValue, ...overrides };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export { defaultMockUser, defaultMockSession };
