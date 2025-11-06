export const getAuthErrorMessage = (error: any): string => {
  const errorMessage = error?.message?.toLowerCase() || '';
  
  // Erros de login
  if (errorMessage.includes('invalid login credentials') || 
      errorMessage.includes('invalid email or password')) {
    return 'Email ou senha incorretos. Verifique seus dados e tente novamente.';
  }
  
  // Erros de senha fraca
  if (errorMessage.includes('password is too weak') || 
      errorMessage.includes('password should be at least')) {
    return 'A senha precisa ter no mínimo 6 caracteres e ser mais forte. Tente usar letras maiúsculas, números e caracteres especiais.';
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
