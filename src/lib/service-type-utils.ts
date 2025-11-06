// Normaliza valores legados de service_type para os valores padronizados
export const normalizeServiceType = (value: string | null | undefined): string => {
  if (!value) return '';
  
  const legacyMap: Record<string, string> = {
    'motorista_uber': 'uber',
    'motorista_99': '99',
    'entregador_ifood': 'ifood',
    'entregador_rappi': 'rappi',
    'motoboy': 'outros',
    'outro': 'outros',
  };
  
  return legacyMap[value] || value;
};

// Lista padronizada de tipos de serviço
export const SERVICE_TYPES = [
  { value: 'uber', label: 'Uber' },
  { value: '99', label: '99' },
  { value: 'indrive', label: 'inDrive' },
  { value: 'ifood', label: 'iFood' },
  { value: 'rappi', label: 'Rappi' },
  { value: 'loggi', label: 'Loggi' },
  { value: 'lalamove', label: 'Lalamove' },
  { value: 'delivery-much', label: 'Delivery Much' },
  { value: 'aiqfome', label: 'Aiqfome' },
  { value: 'borzo', label: 'Borzo' },
  { value: 'total-express', label: 'Total Express' },
  { value: 'mercado-livre', label: 'Mercado Livre / Mercado Envios' },
  { value: 'uello', label: 'Uello' },
  { value: 'outros', label: 'Outros' },
] as const;
