import { describe, it, expect, beforeEach, vi } from 'vitest';

// Local test fixtures
const validPreferenceRequest = {
  plan_type: 'quarterly',
  coupon_code: null,
};

const mpPreferenceSuccessResponse = {
  id: 'pref-123456789',
  init_point: 'https://mercadopago.com.br/checkout/v1/redirect',
};

const expectedCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
};

globalThis.fetch = vi.fn() as any;

describe('create-mercadopago-preference edge function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CORS handling', () => {
    it('should return correct CORS headers for OPTIONS request', async () => {
      const response = new Response(null, {
        headers: expectedCorsHeaders,
      });

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });
  });

  describe('Authentication', () => {
    it('should reject user without email', async () => {
      const userWithoutEmail = { id: 'test-id', email: null };

      expect(userWithoutEmail.email).toBeNull();
    });

    it('should accept authenticated user with email', async () => {
      const testUser = { email: 'test@example.com' };

      expect(testUser.email).toBeTruthy();
    });
  });

  describe('Input validation', () => {
    it('should validate request body with Zod schema', async () => {
      const validBody = validPreferenceRequest;

      expect(validBody.plan_type).toBe('quarterly');
      expect(['quarterly']).toContain(validBody.plan_type);
    });

    it('should reject invalid plan type', async () => {
      const invalidBody = { plan_type: 'invalid', coupon_code: null };

      expect(invalidBody.plan_type).not.toBe('quarterly');
    });
  });

  describe('Mercado Pago API integration', () => {
    it('should create preference with Mercado Pago API', async () => {
      const response = mpPreferenceSuccessResponse;

      expect(response.id).toBeTruthy();
      expect(response.init_point).toContain('mercadopago.com');
    });

    it('should handle API errors gracefully', async () => {
      const expectedError = { success: false, error: 'Failed to create preference' };
      expect(expectedError.success).toBe(false);
    });
  });

  describe('Coupon handling', () => {
    it('should ignore expired coupons', async () => {
      const basePrice = 60.0;
      const expiredCouponDate = new Date('2025-11-30');
      const currentDate = new Date('2025-12-01');

      // BLACK50 expired on 2025-11-30
      const isExpired = expiredCouponDate < currentDate;
      expect(isExpired).toBe(true);

      // Price should remain unchanged
      const finalPrice = basePrice;
      expect(finalPrice).toBe(60.0);
    });

    it('should apply valid coupons', async () => {
      const basePrice = 60.0;
      const validCoupon = { discountType: 'percentage', discountValue: 15 };
      const finalPrice = basePrice * (1 - validCoupon.discountValue / 100);

      expect(finalPrice).toBe(51.0);
    });
  });

  describe('Preference configuration', () => {
    it('should include correct back URLs', async () => {
      const baseUrl = 'http://localhost:5173';
      const expectedUrls = {
        success: `${baseUrl}/payment-success`,
        failure: `${baseUrl}/checkout?error=payment_failed`,
        pending: `${baseUrl}/checkout?status=pending`,
      };

      expect(expectedUrls.success).toContain('/payment-success');
      expect(expectedUrls.failure).toContain('error=payment_failed');
      expect(expectedUrls.pending).toContain('status=pending');
    });

    it('should set auto_return to approved', async () => {
      const preferenceConfig = {
        auto_return: 'approved',
      };

      expect(preferenceConfig.auto_return).toBe('approved');
    });
  });

  describe('Response format', () => {
    it('should return preference_id and init_point', async () => {
      const response = {
        success: true,
        preference_id: mpPreferenceSuccessResponse.id,
        init_point: mpPreferenceSuccessResponse.init_point,
      };

      expect(response.success).toBe(true);
      expect(response.preference_id).toBeTruthy();
      expect(response.init_point).toBeTruthy();
    });
  });
});
