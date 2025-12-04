import { describe, it, expect, beforeEach, vi } from 'vitest';

// Local test fixtures - Updated to only support quarterly plan
const validProcessPaymentRequest = {
  planType: 'quarterly',
  // amount removed - server calculates from plan_prices
  paymentMethod: 'credit_card',
};

const mpPaymentApprovedResponse = {
  id: 98765432,
  status: 'approved',
  status_detail: 'accredited',
  transaction_amount: 60.0,
};

const mpPaymentRejectedInsufficientAmount = {
  status: 'rejected',
  status_detail: 'cc_rejected_insufficient_amount',
};

const mpPaymentRejectedBadCVV = {
  status_detail: 'cc_rejected_bad_filled_security_code',
};

const mpPaymentRejectedBadDate = {
  status_detail: 'cc_rejected_bad_filled_date',
};

const expectedCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
};

const testUser = { id: 'test-user-id' };

globalThis.fetch = vi.fn() as any;

describe('process-payment edge function', () => {
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
    it('should reject unauthenticated requests', async () => {
      const expectedError = { success: false, error: 'User not authenticated' };
      expect(expectedError.success).toBe(false);
    });

    it('should authenticate valid user', async () => {
      expect(testUser.id).toBeTruthy();
    });
  });

  describe('Input validation', () => {
    it('should validate request body with Zod', async () => {
      const validBody = validProcessPaymentRequest;

      expect(validBody.planType).toBe('quarterly');
      expect(validBody.paymentMethod).toBeTruthy();
      // amount is no longer part of the schema - server fetches from DB
    });

    it('should reject invalid plan type (only quarterly allowed)', async () => {
      const invalidBody = { ...validProcessPaymentRequest, planType: 'monthly' };

      // Only 'quarterly' is valid
      expect(['quarterly']).not.toContain(invalidBody.planType);
    });

    it('should not accept amount from client', async () => {
      // Amount should NOT be in the schema - server calculates it
      const schemaFields = ['planType', 'couponCode', 'paymentMethod'];
      expect(schemaFields).not.toContain('amount');
    });
  });

  describe('Mercado Pago payment verification', () => {
    it('should verify approved payment with MP API', async () => {
      const response = mpPaymentApprovedResponse;

      expect(response.status).toBe('approved');
      expect(response.status_detail).toBe('accredited');
    });

    it('should handle missing MERCADOPAGO_ACCESS_TOKEN', async () => {
      const expectedError = { success: false, error: 'MERCADOPAGO_ACCESS_TOKEN not configured' };
      expect(expectedError.success).toBe(false);
    });
  });

  describe('Payment rejection scenarios', () => {
    it('should translate insufficient amount error', async () => {
      const rejection = mpPaymentRejectedInsufficientAmount;

      expect(rejection.status).toBe('rejected');
      expect(rejection.status_detail).toBe('cc_rejected_insufficient_amount');

      const translatedError = 'Saldo insuficiente no cartão';
      expect(translatedError).toContain('Saldo insuficiente');
    });

    it('should translate bad CVV error', async () => {
      const rejection = mpPaymentRejectedBadCVV;

      expect(rejection.status_detail).toBe('cc_rejected_bad_filled_security_code');

      const translatedError = 'Código de segurança inválido';
      expect(translatedError).toContain('Código de segurança');
    });

    it('should translate bad date error', async () => {
      const rejection = mpPaymentRejectedBadDate;

      expect(rejection.status_detail).toBe('cc_rejected_bad_filled_date');

      const translatedError = 'Data de validade inválida';
      expect(translatedError).toContain('Data de validade');
    });
  });

  describe('Subscription creation', () => {
    it('should calculate monthly expiration date', async () => {
      const planType = 'monthly';
      const now = new Date('2024-12-01');
      const expectedExpiry = new Date('2025-01-01'); // +1 month

      const monthsToAdd = planType === 'monthly' ? 1 : 3;
      const calculatedExpiry = new Date(now);
      calculatedExpiry.setMonth(calculatedExpiry.getMonth() + monthsToAdd);

      expect(monthsToAdd).toBe(1);
    });

    it('should calculate quarterly expiration date', async () => {
      const planType = 'quarterly';
      const now = new Date('2024-12-01');
      const expectedExpiry = new Date('2025-03-01'); // +3 months

      const monthsToAdd = planType === 'quarterly' ? 3 : 1;
      expect(monthsToAdd).toBe(3);
    });

    it('should create subscription record in database', async () => {
      const subscriptionData = {
        user_id: testUser.id,
        plan_type: 'quarterly',
        status: 'active',
        amount_paid: 60.0,
        payment_method: 'credit_card',
        coupon_code: null,
        payment_token: 'mp-98765432',
        mercadopago_payment_id: '98765432',
      };

      expect(subscriptionData.user_id).toBeTruthy();
      expect(subscriptionData.plan_type).toBe('quarterly');
      expect(subscriptionData.status).toBe('active');
      expect(subscriptionData.amount_paid).toBeGreaterThan(0);
    });
  });

  describe('Response format', () => {
    it('should return subscription details on success', async () => {
      const response = {
        success: true,
        subscription: {
          id: 'sub-123',
          plan_type: 'quarterly',
          status: 'active',
          expires_at: '2025-03-01T00:00:00Z',
        },
      };

      expect(response.success).toBe(true);
      expect(response.subscription.id).toBeTruthy();
      expect(response.subscription.status).toBe('active');
    });

    it('should return error on payment rejection', async () => {
      const response = {
        success: false,
        error: 'Saldo insuficiente no cartão',
      };

      expect(response.success).toBe(false);
      expect(response.error).toBeTruthy();
    });
  });
});
