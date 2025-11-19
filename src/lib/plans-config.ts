// Configuração dos planos disponíveis
export type PlanType = 'bronze' | 'prata' | 'ouro' | 'monthly' | 'quarterly' | 'annual';

// Detalhes dos planos para referência
export const PLAN_DETAILS = {
  bronze: {
    name: 'Bronze',
    price: 60,
    description: 'Ideal pra quem quer suporte básico'
  },
  monthly: {
    name: 'Bronze',
    price: 60,
    description: 'Ideal pra quem quer suporte básico'
  },
  prata: {
    name: 'Prata',
    price: 120,
    description: 'Ideal pra quem quer mais segurança'
  },
  quarterly: {
    name: 'Prata',
    price: 120,
    description: 'Ideal pra quem quer mais segurança'
  },
  ouro: {
    name: 'Ouro',
    price: 180,
    description: 'Ideal pra quem quer rodar tranquilo e protegido'
  },
  annual: {
    name: 'Ouro',
    price: 180,
    description: 'Ideal pra quem quer rodar tranquilo e protegido'
  }
} as const;
