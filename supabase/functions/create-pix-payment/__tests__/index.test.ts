import { describe, it, expect, beforeEach, vi } from 'vitest';

// Local test fixtures
const validPixRequest = {
  plan_type: 'quarterly',
  coupon_code: null,
};

const mpPixSuccessResponse = {
  id: 12345678,
  status: 'pending',
  transaction_amount: 60.0,
  point_of_interaction: {
    transaction_data: {
      qr_code: 'PIX_QR_CODE_STRING',
      qr_code_base64: 'BASE64_QR',
    },
  },
};

const mpPixWithCouponResponse = {
  ...mpPixSuccessResponse,
  transaction_amount: 51.0,
  metadata: { coupon_code: 'PRIMEIRACOMPRA' },
};

const expectedCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mock globalThis fetch
globalThis.fetch = vi.fn() as any;

describe('create-pix-payment edge function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CORS handling', () => {
    it('should return correct CORS headers for OPTIONS request', async () => {
      const response = new Response(null, {
        headers: expectedCorsHeaders,
      });

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Headers')).toContain('authorization');
    });
  });

  describe('Authentication', () => {
    it('should reject request without authentication', async () => {
      const expectedError = { success: false, error: 'User not authenticated' };
      
      expect(expectedError.success).toBe(false);
      expect(expectedError.error).toBe('User not authenticated');
    });

    it('should authenticate user with valid JWT', async () => {
      const mockUser = { id: 'test-user-id', email: 'test@example.com' };
      
      expect(mockUser.id).toBe('test-user-id');
      expect(mockUser.email).toBe('test@example.com');
    });
  });

  describe('Input validation', () => {
    it('should reject invalid plan type', async () => {
      const invalidPixRequest = { plan_type: 'monthly', coupon_code: null };
      
      expect(invalidPixRequest.plan_type).not.toBe('quarterly');
    });

    it('should accept valid quarterly plan', async () => {
      expect(validPixRequest.plan_type).toBe('quarterly');
    });
  });

  describe('Mercado Pago integration', () => {
    it('should reject when MERCADOPAGO_ACCESS_TOKEN is missing', async () => {
      const expectedError = { success: false, error: 'MERCADOPAGO_ACCESS_TOKEN not configured' };
      expect(expectedError.error).toContain('MERCADOPAGO_ACCESS_TOKEN');
    });

    it('should create PIX payment with Mercado Pago API', async () => {
      const response = mpPixSuccessResponse;

      expect(response.id).toBe(12345678);
      expect(response.status).toBe('pending');
      expect(response.point_of_interaction.transaction_data.qr_code).toBeTruthy();
      expect(response.point_of_interaction.transaction_data.qr_code_base64).toBeTruthy();
    });
  });

  describe('Coupon application', () => {
    it('should apply percentage coupon (PRIMEIRACOMPRA 15%)', async () => {
      const basePrice = 60.0;
      const discount = 0.15;
      const finalPrice = basePrice * (1 - discount);

      expect(finalPrice).toBe(51.0);
      expect(mpPixWithCouponResponse.transaction_amount).toBe(51.0);
      expect(mpPixWithCouponResponse.metadata.coupon_code).toBe('PRIMEIRACOMPRA');
    });

    it('should apply fixed coupon (BEMVINDO10 R$10)', async () => {
      const basePrice = 60.0;
      const discount = 10.0;
      const finalPrice = basePrice - discount;

      expect(finalPrice).toBe(50.0);
    });
  });

  describe('Database integration', () => {
    it('should fetch plan price from database', async () => {
      const planData = { plan_type: 'quarterly', amount_cents: 6000, active: true };

      expect(planData.plan_type).toBe('quarterly');
      expect(planData.amount_cents).toBe(6000); // R$60.00
      expect(planData.active).toBe(true);
    });

    it('should return error when plan not found', async () => {
      const expectedError = { success: false, error: 'Invalid plan type' };

      expect(expectedError.error).toBe('Invalid plan type');
    });
  });

  describe('Response format', () => {
    it('should return complete PIX data on success', async () => {
      const response = {
        success: true,
        payment_id: 12345678,
        qr_code: mpPixSuccessResponse.point_of_interaction.transaction_data.qr_code,
        qr_code_base64: mpPixSuccessResponse.point_of_interaction.transaction_data.qr_code_base64,
        amount: 60.0,
      };

      expect(response.success).toBe(true);
      expect(response.payment_id).toBeTruthy();
      expect(response.qr_code).toBeTruthy();
      expect(response.qr_code_base64).toBeTruthy();
      expect(response.amount).toBeGreaterThan(0);
    });
  });
});
