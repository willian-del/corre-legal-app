export const getAuthErrorMessage = (error: any): string => {
  // Verificar múltiplos campos onde a mensagem pode estar
  const errorMessage = (error?.message || error?.msg || '').toLowerCase();
  const errorCode = (error?.code || '').toString().toLowerCase();
  
  // Verificar razões específicas de senha fraca (formato novo do Supabase)
  const weakPasswordReasons: string[] = error?.weak_password?.reasons || [];
  const isPwned = weakPasswordReasons.includes('pwned');
  const isMissingCharacters = weakPasswordReasons.includes('characters');
  
  // DEBUG: Log para diagnóstico (remover após resolver)
  if (import.meta.env.DEV) {
    console.log('[AUTH ERROR DEBUG] Erro completo:', JSON.stringify(error, null, 2));
    console.log('[AUTH ERROR DEBUG] errorMessage:', errorMessage);
    console.log('[AUTH ERROR DEBUG] errorCode:', errorCode);
    console.log('[AUTH ERROR DEBUG] weakPasswordReasons:', weakPasswordReasons);
  }
  
  // Erros de login
  if (errorMessage.includes('invalid login credentials') || 
      errorMessage.includes('invalid email or password')) {
    return 'Email ou senha incorretos. Verifique seus dados e tente novamente.';
  }
  
  // Erro de senha vazada/breached (verificação HIBP do Supabase) - verificar PRIMEIRO
  if (isPwned ||
      errorMessage.includes('breached') || 
      errorMessage.includes('hibp') ||
      errorMessage.includes('commonly used') ||
      errorMessage.includes('leaked') ||
      errorMessage.includes('compromised') ||
      errorMessage.includes('data breach') ||
      errorMessage.includes('exposed') ||
      errorMessage.includes('weak and easy to guess') ||
      errorMessage.includes('pwned')) {
    return 'Esta senha foi encontrada em vazamentos de dados. Por segurança, escolha uma senha diferente e única.';
  }
  
  // Erros de senha fraca - cobrir todas variações do Supabase
  if (isMissingCharacters ||
      errorCode === 'weak_password' ||
      errorMessage.includes('password is too weak') || 
      errorMessage.includes('password should be at least') ||
      errorMessage.includes('password should contain') ||
      errorMessage.includes('weak_password') ||
      errorMessage.includes('does not meet the security requirements') ||
      (errorMessage.includes('password') && errorMessage.includes('weak'))) {
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
