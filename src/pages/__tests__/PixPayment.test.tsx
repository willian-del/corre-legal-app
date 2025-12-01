import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@/test/utils/render';
import PixPayment from '../PixPayment';
import { mockSupabase, resetSupabaseMocks } from '@/test/mocks/supabase';
import { mockPixResponse } from '@/test/mocks/mercadopago';
import { toast } from 'sonner';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams('plan=quarterly&coupon=')],
  };
});

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
});

describe('PixPayment', () => {
  beforeEach(() => {
    resetSupabaseMocks();
    mockNavigate.mockClear();
    vi.clearAllMocks();
  });

  it('should display loading state while creating PIX payment', () => {
    mockSupabase.functions.invoke.mockImplementationOnce(() => new Promise(() => {}));

    render(<PixPayment />);

    expect(screen.getByText(/gerando código pix/i)).toBeInTheDocument();
  });

  it('should display QR code and amount after successful PIX creation', async () => {
    mockSupabase.functions.invoke.mockResolvedValueOnce({
      data: mockPixResponse,
      error: null,
    });

    render(<PixPayment />);

    await waitFor(() => {
      expect(screen.getByText(/r\$ 60,00/i)).toBeInTheDocument();
      expect(screen.getByAltText(/qr code pix/i)).toBeInTheDocument();
    });
  });

  it('should copy PIX code to clipboard when copy button is clicked', async () => {
    mockSupabase.functions.invoke.mockResolvedValueOnce({
      data: mockPixResponse,
      error: null,
    });

    render(<PixPayment />);

    await waitFor(() => {
      expect(screen.getByText(/copiar código pix/i)).toBeInTheDocument();
    });

    const copyButton = screen.getByText(/copiar código pix/i);
    fireEvent.click(copyButton);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockPixResponse.qr_code);
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Código copiado!',
      })
    );

    await waitFor(() => {
      expect(screen.getByText(/copiado!/i)).toBeInTheDocument();
    });
  });

  it('should redirect to checkout when plan parameter is missing', async () => {
    vi.mock('react-router-dom', async () => {
      const actual = await vi.importActual('react-router-dom');
      return {
        ...actual,
        useNavigate: () => mockNavigate,
        useSearchParams: () => [new URLSearchParams('')],
      };
    });

    render(<PixPayment />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/checkout');
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Erro',
          variant: 'destructive',
        })
      );
    });
  });

  it('should show error and redirect when PIX creation fails', async () => {
    mockSupabase.functions.invoke.mockResolvedValueOnce({
      data: null,
      error: { message: 'Failed to create PIX' },
    });

    render(<PixPayment />);

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Erro ao gerar PIX',
          variant: 'destructive',
        })
      );
      expect(mockNavigate).toHaveBeenCalledWith('/checkout');
    });
  });

  it('should display payment instructions', async () => {
    mockSupabase.functions.invoke.mockResolvedValueOnce({
      data: mockPixResponse,
      error: null,
    });

    render(<PixPayment />);

    await waitFor(() => {
      expect(screen.getByText(/como pagar com pix:/i)).toBeInTheDocument();
      expect(screen.getByText(/abra o app do seu banco/i)).toBeInTheDocument();
      expect(screen.getByText(/escolha pagar com pix/i)).toBeInTheDocument();
      expect(screen.getByText(/escaneie o qr code/i)).toBeInTheDocument();
      expect(screen.getByText(/confirme o pagamento/i)).toBeInTheDocument();
    });
  });
});
