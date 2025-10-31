-- Add service_type column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN service_type text;

-- Update the handle_new_user function to include service_type
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
begin
  insert into public.profiles (id, full_name, cpf, phone, service_type)
  values (
    new.id, 
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'cpf',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'service_type'
  );
  return new;
end;
$$;