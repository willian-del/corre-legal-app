// Stripe Price IDs are now stored as environment variables (secrets)
// STRIPE_PRICE_BRONZE, STRIPE_PRICE_PRATA, STRIPE_PRICE_OURO
// The backend (Edge Functions) will retrieve them securely

export type PlanType = 'bronze' | 'prata' | 'ouro';

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
