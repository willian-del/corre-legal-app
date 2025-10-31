-- Update the handle_new_user function to include cpf and phone
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
begin
  insert into public.profiles (id, full_name, cpf, phone)
  values (
    new.id, 
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'cpf',
    new.raw_user_meta_data->>'phone'
  );
  return new;
end;
$$;