// Stripe Price IDs - Configure these after creating products in Stripe Dashboard
// To create products: https://dashboard.stripe.com/products
// Each product should be set as a one-time payment with the following amounts:
// - Bronze: R$ 60,00 (6000 centavos)
// - Prata: R$ 120,00 (12000 centavos)
// - Ouro: R$ 180,00 (18000 centavos)

export const STRIPE_PRICES = {
  bronze: 'price_XXXXX', // Replace with actual Stripe price ID for Bronze (R$ 60)
  prata: 'price_YYYYY',  // Replace with actual Stripe price ID for Prata (R$ 120)
  ouro: 'price_ZZZZZ'    // Replace with actual Stripe price ID for Ouro (R$ 180)
} as const;

export type PlanType = keyof typeof STRIPE_PRICES;

// Plan details for reference
export const PLAN_DETAILS = {
  bronze: {
    name: 'Bronze',
    price: 60,
    description: 'Ideal pra quem quer suporte básico'
  },
  prata: {
    name: 'Prata',
    price: 120,
    description: 'Ideal pra quem quer mais segurança'
  },
  ouro: {
    name: 'Ouro',
    price: 180,
    description: 'Ideal pra quem quer rodar tranquilo e protegido'
  }
} as const;
