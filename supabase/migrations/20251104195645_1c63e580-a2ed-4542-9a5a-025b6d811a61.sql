-- Drop existing policy that allows unrestricted updates
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Create new policy that excludes sensitive CPF fields from user updates
CREATE POLICY "Users can update safe profile fields"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND
  -- Prevent modification of CPF fields - they must remain unchanged
  (cpf IS NOT DISTINCT FROM (SELECT cpf FROM profiles WHERE id = auth.uid())) AND
  (cpf_hash IS NOT DISTINCT FROM (SELECT cpf_hash FROM profiles WHERE id = auth.uid()))
);