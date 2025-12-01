// Edge function test fixtures

// PIX Payment Request Payloads
export const validPixRequest = {
  plan_type: 'quarterly',
  coupon_code: null,
};

export const pixRequestWithCoupon = {
  plan_type: 'quarterly',
  coupon_code: 'PRIMEIRACOMPRA',
};

export const invalidPixRequest = {
  plan_type: 'monthly', // Invalid - only quarterly accepted
  coupon_code: null,
};

// Mercado Pago Preference Request Payloads
export const validPreferenceRequest = {
  plan_type: 'quarterly',
  coupon_code: null,
};

export const preferenceRequestWithExpiredCoupon = {
  plan_type: 'quarterly',
  coupon_code: 'BLACK50', // Expired on 2025-11-30
};

// Process Payment Request Payloads
export const validProcessPaymentRequest = {
  planType: 'quarterly',
  amount: 60.0,
  couponCode: null,
  paymentMethod: 'credit_card',
};

export const rejectedPaymentRequest = {
  planType: 'quarterly',
  amount: 60.0,
  couponCode: null,
  paymentMethod: 'credit_card',
  statusDetail: 'cc_rejected_insufficient_amount',
};

// Mercado Pago API Responses

export const mpPixSuccessResponse = {
  id: 12345678,
  status: 'pending',
  transaction_amount: 60.0,
  date_of_expiration: '2025-12-02T10:00:00.000-04:00',
  point_of_interaction: {
    transaction_data: {
      qr_code: '00020126360014br.gov.bcb.pix0114+5511999999999520400005303986540560.005802BR5925CORRE LEGAL LTDA6009SAO PAULO62070503***6304ABCD',
      qr_code_base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    },
  },
  metadata: {
    user_id: 'test-user-id',
    plan_type: 'quarterly',
    amount: 60.0,
    coupon_code: null,
  },
};

export const mpPixWithCouponResponse = {
  ...mpPixSuccessResponse,
  transaction_amount: 51.0,
  metadata: {
    user_id: 'test-user-id',
    plan_type: 'quarterly',
    amount: 51.0,
    coupon_code: 'PRIMEIRACOMPRA',
  },
};

export const mpPreferenceSuccessResponse = {
  id: 'pref-123456789',
  init_point: 'https://mercadopago.com.br/checkout/v1/redirect?pref_id=pref-123456789',
  sandbox_init_point: 'https://sandbox.mercadopago.com.br/checkout/v1/redirect?pref_id=pref-123456789',
};

export const mpPaymentApprovedResponse = {
  id: 98765432,
  status: 'approved',
  status_detail: 'accredited',
  transaction_amount: 60.0,
  currency_id: 'BRL',
  payment_method_id: 'visa',
  payment_type_id: 'credit_card',
  metadata: {
    user_id: 'test-user-id',
    plan_type: 'quarterly',
    amount: 60.0,
    coupon_code: null,
  },
};

export const mpPaymentRejectedInsufficientAmount = {
  id: 11111111,
  status: 'rejected',
  status_detail: 'cc_rejected_insufficient_amount',
  transaction_amount: 60.0,
  currency_id: 'BRL',
  payment_method_id: 'visa',
  metadata: {
    user_id: 'test-user-id',
    plan_type: 'quarterly',
    amount: 60.0,
  },
};

export const mpPaymentRejectedBadCVV = {
  id: 22222222,
  status: 'rejected',
  status_detail: 'cc_rejected_bad_filled_security_code',
  transaction_amount: 60.0,
  currency_id: 'BRL',
  payment_method_id: 'visa',
};

export const mpPaymentRejectedBadDate = {
  id: 33333333,
  status: 'rejected',
  status_detail: 'cc_rejected_bad_filled_date',
  transaction_amount: 60.0,
  currency_id: 'BRL',
  payment_method_id: 'visa',
};

// Webhook Payloads

export const webhookPaymentApproved = {
  action: 'payment.created',
  type: 'payment',
  data: { id: '98765432' },
};

export const webhookPaymentPending = {
  action: 'payment.updated',
  type: 'payment',
  data: { id: '55555555' },
};

export const webhookPaymentRejected = {
  action: 'payment.updated',
  type: 'payment',
  data: { id: '66666666' },
};

export const webhookNonPaymentEvent = {
  action: 'subscription.created',
  type: 'subscription',
  data: { id: '77777777' },
};

// Supabase plan_prices response
export const planPricesQuarterly = {
  plan_type: 'quarterly',
  amount_cents: 6000, // R$60.00
  currency: 'BRL',
  active: true,
};

// Supabase user_subscriptions response
export const existingSubscription = {
  id: 'sub-123',
  user_id: 'test-user-id',
  plan_type: 'quarterly',
  status: 'active',
  mercadopago_payment_id: '98765432',
  amount_paid: 60.0,
  expires_at: '2025-03-01T00:00:00Z',
  created_at: '2024-12-01T00:00:00Z',
};

// Authentication tokens
export const validAuthToken = 'Bearer valid-jwt-token-12345';
export const testUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  aud: 'authenticated',
};
