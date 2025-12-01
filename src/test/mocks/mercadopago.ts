import { vi } from 'vitest';

// Mock Mercado Pago SDK
export const mockInitMercadoPago = vi.fn();

export const mockPaymentComponent = vi.fn(({ onSubmit, onReady, onError }) => {
  // Simulate ready state
  setTimeout(() => {
    if (onReady) onReady();
  }, 100);

  return null;
});

// Mock the Mercado Pago SDK module
vi.mock('@mercadopago/sdk-react', () => ({
  initMercadoPago: mockInitMercadoPago,
  Payment: mockPaymentComponent,
}));

// Mock payment responses
export const mockPaymentResponse = {
  success: {
    paymentId: 'mp-123456789',
    status: 'approved',
    paymentType: 'credit_card',
  },
  rejected: {
    paymentId: 'mp-987654321',
    status: 'rejected',
    paymentType: 'credit_card',
    statusDetail: 'cc_rejected_insufficient_amount',
  },
  pix: {
    paymentType: 'bank_transfer',
    status: 'pending',
  },
};

// Mock PIX payment data
export const mockPixResponse = {
  success: true,
  qr_code: 'PIX_QR_CODE_STRING_12345678901234567890',
  qr_code_base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  amount: 60.0,
  payment_id: 'pix-123456789',
};

// Mock preference response
export const mockPreferenceResponse = {
  preference_id: 'pref-123456789',
  init_point: 'https://mercadopago.com.br/checkout/v1/redirect?pref_id=pref-123456789',
};

export const resetMercadoPagoMocks = () => {
  mockInitMercadoPago.mockClear();
  mockPaymentComponent.mockClear();
};
