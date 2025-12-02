export const getAuthErrorMessage = (error: any): string => {
  const errorMessage = error?.message?.toLowerCase() || '';
  
  // Erros de login
  if (errorMessage.includes('invalid login credentials') || 
      errorMessage.includes('invalid email or password')) {
    return 'Email ou senha incorretos. Verifique seus dados e tente novamente.';
  }
  
  // Erros de senha fraca - cobrir todas variações do Supabase
  if (errorMessage.includes('password is too weak') || 
      errorMessage.includes('password should be at least') ||
      errorMessage.includes('weak_password') ||
      errorMessage.includes('weak and easy to guess') ||
      errorMessage.includes('does not meet the security requirements') ||
      errorMessage.includes('pwned') ||
      errorMessage.includes('password') && errorMessage.includes('weak')) {
    return 'A senha é muito fraca. Use pelo menos 8 caracteres com letras maiúsculas, minúsculas, números e caracteres especiais (!@#$%).';
  }
  
  // Email já cadastrado
  if (errorMessage.includes('user already registered') || 
      errorMessage.includes('email already exists')) {
    return 'Este email já está cadastrado. Tente fazer login ou use a opção "Esqueci minha senha".';
  }
  
  // Email não confirmado
  if (errorMessage.includes('email not confirmed')) {
    return 'Por favor, confirme seu email antes de fazer login. Verifique sua caixa de entrada.';
  }
  
  // Erro de rate limit (muitas tentativas)
  if (errorMessage.includes('email rate limit exceeded') || 
      errorMessage.includes('too many requests')) {
    return 'Muitas tentativas seguidas. Por favor, aguarde alguns minutos antes de tentar novamente.';
  }
  
  // Erro genérico
  return 'Ocorreu um erro. Por favor, tente novamente em alguns instantes.';
};
