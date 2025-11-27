// Configuração dos planos disponíveis
export type PlanType = 'quarterly';

// Detalhes dos planos para referência
export const PLAN_DETAILS = {
  quarterly: {
    name: 'Plano Trimestral',
    price: 60,
    durationDays: 90,
    description: 'Cobertura completa por 90 dias'
  }
} as const;
