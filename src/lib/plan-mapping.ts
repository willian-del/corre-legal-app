// Map between Mercado Pago plans (monthly/quarterly/annual) and Stripe plans (bronze/prata/ouro)
export type MercadoPagoPlan = 'monthly' | 'quarterly' | 'annual';
export type StripePlan = 'bronze' | 'prata' | 'ouro';

export const mapToStripePlan = (mercadoPagoPlan: string): StripePlan => {
  const mapping: Record<MercadoPagoPlan, StripePlan> = {
    monthly: 'bronze',
    quarterly: 'prata',
    annual: 'ouro',
  };

  return mapping[mercadoPagoPlan as MercadoPagoPlan] || 'bronze';
};

export const mapToMercadoPagoPlan = (stripePlan: string): MercadoPagoPlan => {
  const mapping: Record<StripePlan, MercadoPagoPlan> = {
    bronze: 'monthly',
    prata: 'quarterly',
    ouro: 'annual',
  };

  return mapping[stripePlan as StripePlan] || 'monthly';
};
