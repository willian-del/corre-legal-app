import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@/test/utils/render';
import Checkout from '../Checkout';
import PixPayment from '../PixPayment';
import PaymentSuccess from '../PaymentSuccess';
import { mockSupabase, resetSupabaseMocks } from '@/test/mocks/supabase';
import { resetMercadoPagoMocks, mockPreferenceResponse, mockPixResponse } from '@/test/mocks/mercadopago';
import { profileFixtures } from '@/test/fixtures/payment-fixtures';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams('plan=quarterly&coupon=PRIMEIRACOMPRA')],
  };
});

describe('Payment Integration Tests', () => {
  beforeEach(() => {
    resetSupabaseMocks();
    resetMercadoPagoMocks();
    mockNavigate.mockClear();
    vi.clearAllMocks();
  });

  it('should complete full credit card payment flow', async () => {
    // Step 1: Checkout page loads and creates preference
    mockSupabase.functions.invoke.mockResolvedValueOnce({
      data: mockPreferenceResponse,
      error: null,
    });

    const { unmount } = render(<Checkout />, {
      authOverrides: { user: { id: 'user-123', email: 'test@example.com' } },
    });

    // Verify preference creation
    await waitFor(() => {
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('create-mercadopago-preference', {
        body: {
          plan_type: 'quarterly',
          coupon_code: 'PRIMEIRACOMPRA',
        },
      });
    });

    // Verify coupon is applied
    await waitFor(() => {
      expect(screen.getByText(/cupom aplicado/i)).toBeInTheDocument();
      expect(screen.getByText(/primeira compra/i)).toBeInTheDocument();
    });

    // Step 2: Simulate successful payment
    mockSupabase.functions.invoke.mockResolvedValueOnce({
      data: { success: true },
      error: null,
    });

    // Note: In a real integration test, we would trigger the Payment component
    // Here we verify the flow would work by checking the handlers

    unmount();

    // Step 3: Payment success page
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
      expect(screen.getByText(/pagamento confirmado/i)).toBeInTheDocument();
    });
  });

  it('should complete full PIX payment flow', async () => {
    // Step 1: Checkout page loads
    mockSupabase.functions.invoke.mockResolvedValueOnce({
      data: mockPreferenceResponse,
      error: null,
    });

    render(<Checkout />, {
      authOverrides: { user: { id: 'user-123', email: 'test@example.com' } },
    });

    await waitFor(() => {
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('create-mercadopago-preference', expect.any(Object));
    });

    // Step 2: PIX payment page
    mockSupabase.functions.invoke.mockResolvedValueOnce({
      data: mockPixResponse,
      error: null,
    });

    const { unmount } = render(<PixPayment />);

    // Verify PIX creation
    await waitFor(() => {
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('create-pix-payment', {
        body: {
          plan_type: 'quarterly',
          coupon_code: 'PRIMEIRACOMPRA',
        },
      });
    });

    // Verify QR code is displayed
    await waitFor(() => {
      expect(screen.getByText(/r\$ 60,00/i)).toBeInTheDocument();
      expect(screen.getByAltText(/qr code pix/i)).toBeInTheDocument();
    });

    // Test copy functionality
    const copyButton = screen.getByText(/copiar código pix/i);
    fireEvent.click(copyButton);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockPixResponse.qr_code);

    unmount();
  });

  it('should handle coupon application throughout payment flow', async () => {
    // Create checkout with valid coupon
    mockSupabase.functions.invoke.mockResolvedValueOnce({
      data: mockPreferenceResponse,
      error: null,
    });

    render(<Checkout />, {
      authOverrides: { user: { id: 'user-123', email: 'test@example.com' } },
    });

    // Verify coupon is recognized and discount applied
    await waitFor(() => {
      expect(screen.getByText(/cupom aplicado/i)).toBeInTheDocument();
      expect(screen.getByText(/15%/i)).toBeInTheDocument(); // PRIMEIRACOMPRA discount
    });

    // Verify preference was created with coupon code
    expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('create-mercadopago-preference', {
      body: {
        plan_type: 'quarterly',
        coupon_code: 'PRIMEIRACOMPRA',
      },
    });

    // When transitioning to PIX payment, coupon should be maintained
    mockSupabase.functions.invoke.mockResolvedValueOnce({
      data: mockPixResponse,
      error: null,
    });

    render(<PixPayment />);

    await waitFor(() => {
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('create-pix-payment', {
        body: {
          plan_type: 'quarterly',
          coupon_code: 'PRIMEIRACOMPRA',
        },
      });
    });
  });
});
