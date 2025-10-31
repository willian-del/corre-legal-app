-- Adicionar coluna para CPF hasheado (para indexação e busca)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS cpf_hash text;

-- Criar índice para busca por hash
CREATE INDEX IF NOT EXISTS idx_profiles_cpf_hash ON profiles(cpf_hash);

-- Função para gerar hash do CPF
CREATE OR REPLACE FUNCTION hash_cpf(cpf_plain text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN encode(
    digest(cpf_plain || 'lovable-salt-2024', 'sha256'),
    'hex'
  );
END;
$$;

-- Atualizar trigger para NÃO inserir CPF automaticamente do raw_user_meta_data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
begin
  insert into public.profiles (id, full_name, phone, service_type)
  values (
    new.id, 
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'service_type'
  );
  -- CPF será inserido separadamente do frontend, já criptografado
  return new;
end;
$$;