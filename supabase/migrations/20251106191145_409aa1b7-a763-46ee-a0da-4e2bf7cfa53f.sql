-- Deletar todas as assinaturas dos outros usuários
DELETE FROM public.user_subscriptions 
WHERE user_id != 'aebf6dd8-703e-4ad6-8b67-a70175fcb628';

-- Deletar todos os perfis dos outros usuários
DELETE FROM public.profiles 
WHERE id != 'aebf6dd8-703e-4ad6-8b67-a70175fcb628';

-- Deletar todos os usuários da tabela auth.users (exceto o preservado)
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT id FROM auth.users 
    WHERE id != 'aebf6dd8-703e-4ad6-8b67-a70175fcb628'
  LOOP
    DELETE FROM auth.users WHERE id = user_record.id;
  END LOOP;
END $$;