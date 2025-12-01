import { vi } from 'vitest';

// Mock fetch for edge function tests
export const createMockFetch = (response: any, ok: boolean = true, status: number = 200) => {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => response,
    text: async () => JSON.stringify(response),
  });
};

// Mock HTTP Request helper
export const createMockRequest = (
  method: string,
  body?: any,
  headers?: Record<string, string>
): Request => {
  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...headers,
  };

  return new Request('http://localhost:8000/functions/v1/test', {
    method,
    headers: defaultHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });
};

// Mock Supabase client for edge functions
export const createMockSupabaseClient = (overrides: any = {}) => {
  const mockAuth = {
    getUser: vi.fn().mockResolvedValue({
      data: { user: { id: 'test-user-id', email: 'test@example.com' } },
      error: null,
    }),
    ...overrides.auth,
  };

  const mockFrom = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    ...overrides.from,
  });

  return {
    auth: mockAuth,
    from: mockFrom,
    ...overrides,
  };
};

// Helper to extract response body from Response object
export const getResponseBody = async (response: Response) => {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

// Mock CORS headers for validation
export const expectedCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
