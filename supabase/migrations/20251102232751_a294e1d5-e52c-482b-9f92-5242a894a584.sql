-- Permitir que campos de perfil sejam NULL inicialmente
-- Usuários completarão o cadastro no onboarding após login

-- Permitir NULL em phone, service_type
-- cpf e cpf_hash já permitem NULL

-- Não precisamos alterar nada na estrutura da tabela profiles
-- pois os campos já permitem NULL conforme verificado na estrutura atual

-- Adicionar comentários para documentar o fluxo
COMMENT ON COLUMN public.profiles.cpf IS 'Encrypted CPF - only set during onboarding, cannot be changed';
COMMENT ON COLUMN public.profiles.cpf_hash IS 'Hashed CPF for verification - only set during onboarding';
COMMENT ON COLUMN public.profiles.phone IS 'User phone - can be updated';
COMMENT ON COLUMN public.profiles.service_type IS 'Type of service - can be updated';
