-- Fix recursive RLS policy on profiles table
-- Create SECURITY DEFINER function to verify CPF fields haven't changed

CREATE OR REPLACE FUNCTION public.verify_cpf_unchanged(_user_id uuid, _new_cpf text, _new_cpf_hash text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    _new_cpf IS NOT DISTINCT FROM cpf AND
    _new_cpf_hash IS NOT DISTINCT FROM cpf_hash
  FROM profiles
  WHERE id = _user_id
$$;

-- Drop the problematic policy with recursive queries
DROP POLICY IF EXISTS "Users can update safe profile fields" ON profiles;

-- Create new policy using the SECURITY DEFINER function (no recursion)
CREATE POLICY "Users can update safe profile fields"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND
  public.verify_cpf_unchanged(auth.uid(), cpf, cpf_hash)
);