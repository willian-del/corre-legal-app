-- Atualizar função handle_new_user com logs para debugging
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
begin
  RAISE LOG 'Creating profile for user %', new.id;
  RAISE LOG 'User metadata: %', new.raw_user_meta_data;
  
  insert into public.profiles (id, full_name, phone, service_type)
  values (
    new.id, 
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'service_type'
  );
  
  RAISE LOG 'Profile created successfully for user %', new.id;
  return new;
exception
  when others then
    RAISE LOG 'Error creating profile for user %: %', new.id, SQLERRM;
    -- Não bloquear o signup, apenas logar o erro
    return new;
end;
$$;