/**
 * Valida CPF brasileiro usando algoritmo de dígitos verificadores
 * @param cpf - CPF formatado (000.000.000-00) ou apenas números
 * @returns true se o CPF é válido, false caso contrário
 */
export const isValidCPF = (cpf: string): boolean => {
  // Remove caracteres não numéricos
  const numbers = cpf.replace(/\D/g, '');
  
  // Verifica se tem 11 dígitos
  if (numbers.length !== 11) return false;
  
  // Rejeita CPFs com todos os dígitos iguais (111.111.111-11, etc)
  if (/^(\d)\1+$/.test(numbers)) return false;
  
  // Calcula o primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(numbers.charAt(i)) * (10 - i);
  }
  let digit1 = 11 - (sum % 11);
  if (digit1 >= 10) digit1 = 0;
  
  // Valida o primeiro dígito
  if (digit1 !== parseInt(numbers.charAt(9))) return false;
  
  // Calcula o segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(numbers.charAt(i)) * (11 - i);
  }
  let digit2 = 11 - (sum % 11);
  if (digit2 >= 10) digit2 = 0;
  
  // Valida o segundo dígito
  return digit2 === parseInt(numbers.charAt(10));
};

/**
 * Formata string de CPF adicionando pontos e traço
 * @param value - CPF sem formatação ou parcialmente formatado
 * @returns CPF formatado como 000.000.000-00
 */
export const formatCPF = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 11) {
    return numbers
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return value;
};
