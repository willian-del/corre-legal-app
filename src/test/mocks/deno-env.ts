import { vi } from 'vitest';

// Mock environment variables for Deno edge functions
export const mockDenoEnv = {
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
  MERCADOPAGO_ACCESS_TOKEN: 'TEST-MP-ACCESS-TOKEN-123456',
  CRON_API_KEY: 'test-cron-key',
};

export const createMockDenoEnv = (overrides: Partial<typeof mockDenoEnv> = {}) => {
  return { ...mockDenoEnv, ...overrides };
};

export const mockDenoEnvGet = vi.fn((key: string) => {
  return mockDenoEnv[key as keyof typeof mockDenoEnv] || '';
});
