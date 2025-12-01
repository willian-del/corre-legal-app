import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@/test/utils/render';
import PaymentSuccess from '../PaymentSuccess';
import { mockSupabase, resetSupabaseMocks } from '@/test/mocks/supabase';
import { profileFixtures } from '@/test/fixtures/payment-fixtures';

const mockNavigate = vi.fn();
const mockCelebrate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams('first_purchase=true')],
  };
});

vi.mock('@/hooks/use-confetti', () => ({
  useConfetti: () => ({
    celebrate: mockCelebrate,
  }),
}));

describe('PaymentSuccess', () => {
  beforeEach(() => {
    resetSupabaseMocks();
    mockNavigate.mockClear();
    mockCelebrate.mockClear();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should trigger confetti celebration on page load', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: profileFixtures.complete,
        error: null,
      }),
      maybeSingle: vi.fn(),
    });

    render(<PaymentSuccess />, {
      authOverrides: { user: { id: 'user-123', email: 'test@example.com' } },
    });

    // Fast-forward 500ms for confetti trigger
    vi.advanceTimersByTime(500);

    await waitFor(() => {
      expect(mockCelebrate).toHaveBeenCalled();
    });
  });

  it('should display countdown and redirect after 5 seconds for complete profile', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: profileFixtures.complete,
        error: null,
      }),
      maybeSingle: vi.fn(),
    });

    render(<PaymentSuccess />, {
      authOverrides: { user: { id: 'user-123', email: 'test@example.com' } },
    });

    await waitFor(() => {
      expect(screen.getByText(/redirecionando em/i)).toBeInTheDocument();
      expect(screen.getByText(/5/)).toBeInTheDocument();
    });

    // Fast-forward 5 seconds
    vi.advanceTimersByTime(5000);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/meu-corre');
    });
  });

  it('should redirect to onboarding for incomplete profile', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: profileFixtures.incomplete,
        error: null,
      }),
      maybeSingle: vi.fn(),
    });

    render(<PaymentSuccess />, {
      authOverrides: { user: { id: 'user-456', email: 'test@example.com' } },
    });

    await waitFor(() => {
      expect(screen.getByText(/redirecionando em/i)).toBeInTheDocument();
    });

    vi.advanceTimersByTime(5000);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/onboarding');
    });
  });

  it('should call process-payment when payment_id is present', async () => {
    vi.mock('react-router-dom', async () => {
      const actual = await vi.importActual('react-router-dom');
      return {
        ...actual,
        useNavigate: () => mockNavigate,
        useSearchParams: () => [
          new URLSearchParams('payment_id=mp-123&status=approved&external_reference=user-123_quarterly_1234567890'),
        ],
      };
    });

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: profileFixtures.complete,
        error: null,
      }),
      maybeSingle: vi.fn(),
    });

    mockSupabase.functions.invoke.mockResolvedValueOnce({
      data: { success: true },
      error: null,
    });

    render(<PaymentSuccess />, {
      authOverrides: { user: { id: 'user-123', email: 'test@example.com' } },
    });

    await waitFor(() => {
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('process-payment', {
        body: expect.objectContaining({
          paymentId: 'mp-123',
          status: 'approved',
          planType: 'quarterly',
        }),
      });
    });
  });

  it('should not redirect while verifying payment', async () => {
    vi.mock('react-router-dom', async () => {
      const actual = await vi.importActual('react-router-dom');
      return {
        ...actual,
        useNavigate: () => mockNavigate,
        useSearchParams: () => [new URLSearchParams('payment_id=mp-123&status=pending')],
      };
    });

    mockSupabase.functions.invoke.mockImplementationOnce(() => new Promise(() => {}));

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: profileFixtures.complete,
        error: null,
      }),
      maybeSingle: vi.fn(),
    });

    render(<PaymentSuccess />, {
      authOverrides: { user: { id: 'user-123', email: 'test@example.com' } },
    });

    await waitFor(() => {
      expect(screen.getByText(/confirmando sua ativação/i)).toBeInTheDocument();
    });

    // Fast-forward time - should not redirect while verifying
    vi.advanceTimersByTime(10000);

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
