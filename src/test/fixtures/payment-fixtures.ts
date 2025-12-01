// Test fixtures for payment flows

export const planFixtures = {
  quarterly: {
    id: 'quarterly',
    name: 'Plano trimestral',
    price: 60.0,
    displayPrice: 'R$ 60,00',
    description: 'Cobertura completa por 90 dias',
    duration: '90 dias',
    benefits: [
      'Canal de Atendimento Jurídico Especializado',
      'Suporte para Reativação de Conta em caso de Bloqueio',
      'Proteção Contra Multas e Taxas Indevidas',
    ],
    installments: 'ou 3x no cartão',
    featured: true,
    badge: 'Melhor Escolha',
  },
};

export const couponFixtures = {
  valid: {
    code: 'PRIMEIRACOMPRA',
    name: 'Primeira Compra',
    description: '15% de desconto na primeira compra',
    discountType: 'percentage' as const,
    discountValue: 15,
    active: true,
    validUntil: '2025-12-31',
  },
  fixed: {
    code: 'BEMVINDO10',
    name: 'Bem-vindo',
    description: 'R$ 10,00 de desconto',
    discountType: 'fixed' as const,
    discountValue: 10,
    active: true,
    validUntil: '2025-12-31',
  },
  expired: {
    code: 'BLACK50',
    name: 'Black Friday',
    description: '50% de desconto',
    discountType: 'percentage' as const,
    discountValue: 50,
    active: true,
    validUntil: '2024-11-30',
  },
  inactive: {
    code: 'INACTIVE',
    name: 'Cupom Inativo',
    description: 'Cupom desativado',
    discountType: 'percentage' as const,
    discountValue: 10,
    active: false,
    validUntil: '2025-12-31',
  },
};

export const profileFixtures = {
  complete: {
    id: 'user-123',
    cpf_hash: 'hashed-cpf-value',
    full_name: 'Test User',
    phone: '11987654321',
    service_type: 'delivery',
    has_seen_welcome: true,
  },
  incomplete: {
    id: 'user-456',
    cpf_hash: null,
    full_name: 'Incomplete User',
    phone: null,
    service_type: null,
    has_seen_welcome: false,
  },
};

export const subscriptionFixtures = {
  active: {
    id: 'sub-123',
    user_id: 'user-123',
    plan_type: 'quarterly',
    status: 'active',
    amount_paid: 60.0,
    payment_method: 'credit_card',
    mercadopago_payment_id: 'mp-123456789',
    expires_at: '2025-03-01T00:00:00Z',
    created_at: '2024-12-01T00:00:00Z',
    coupon_code: null,
  },
  expired: {
    id: 'sub-456',
    user_id: 'user-123',
    plan_type: 'quarterly',
    status: 'expired',
    amount_paid: 60.0,
    payment_method: 'credit_card',
    mercadopago_payment_id: 'mp-987654321',
    expires_at: '2024-09-01T00:00:00Z',
    created_at: '2024-06-01T00:00:00Z',
    coupon_code: null,
  },
};

export const paymentFixtures = {
  creditCard: {
    paymentId: 'mp-credit-123',
    status: 'approved',
    paymentType: 'credit_card',
    amount: 60.0,
  },
  pix: {
    paymentId: 'mp-pix-123',
    status: 'pending',
    paymentType: 'bank_transfer',
    qr_code: 'PIX_CODE_STRING',
    qr_code_base64: 'BASE64_QR_CODE',
    amount: 60.0,
  },
  rejected: {
    paymentId: 'mp-rejected-123',
    status: 'rejected',
    paymentType: 'credit_card',
    statusDetail: 'cc_rejected_insufficient_amount',
  },
};

type CouponType = typeof couponFixtures.valid | typeof couponFixtures.fixed | null;

export const calculateDiscount = (
  planPrice: number,
  coupon: CouponType
): number => {
  if (!coupon) return 0;

  if (coupon.discountType === 'percentage') {
    return (planPrice * coupon.discountValue) / 100;
  }
  return coupon.discountValue;
};

export const calculateFinalPrice = (
  planPrice: number,
  coupon: CouponType
): number => {
  const discount = calculateDiscount(planPrice, coupon);
  return Math.max(0, planPrice - discount);
};
