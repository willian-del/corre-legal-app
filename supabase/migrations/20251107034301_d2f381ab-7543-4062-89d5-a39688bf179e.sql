-- FASE 1: Corrigir função handle_new_user para criar perfil básico
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
begin
  -- Criar perfil básico apenas com ID e full_name
  -- phone, service_type e cpf_hash serão preenchidos no onboarding
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name'
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN new;
exception
  when others then
    RAISE LOG 'Error creating profile for user %: %', new.id, SQLERRM;
    -- Não bloquear o signup
    RETURN new;
end;
$$;

-- FASE 2: Criar perfis ausentes para usuários existentes
INSERT INTO public.profiles (id, full_name)
SELECT 
  u.id,
  u.raw_user_meta_data->>'full_name'
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;