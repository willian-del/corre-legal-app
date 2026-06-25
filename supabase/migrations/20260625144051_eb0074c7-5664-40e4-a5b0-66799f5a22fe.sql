
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- 1) profiles_cpf_unchanged_bypass: recompute hash server-side
CREATE OR REPLACE FUNCTION public.verify_cpf_unchanged(_user_id uuid, _new_cpf text, _new_cpf_hash text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_cpf text;
  current_cpf_hash text;
  expected_hash text;
BEGIN
  SELECT cpf, cpf_hash INTO current_cpf, current_cpf_hash
  FROM profiles WHERE id = _user_id;

  IF current_cpf IS DISTINCT FROM _new_cpf THEN
    RETURN false;
  END IF;

  IF _new_cpf_hash IS NOT NULL THEN
    IF current_cpf IS NULL THEN
      RETURN false;
    END IF;
    expected_hash := encode(public.digest(current_cpf, 'sha256'), 'hex');
    IF _new_cpf_hash IS DISTINCT FROM expected_hash THEN
      RETURN false;
    END IF;
  ELSE
    IF current_cpf_hash IS DISTINCT FROM _new_cpf_hash THEN
      RETURN false;
    END IF;
  END IF;

  RETURN true;
END;
$function$;

-- 2) referral_history_referred_exposure: hide referred user UUID from authenticated clients
REVOKE SELECT (referred_id) ON public.referral_history FROM authenticated;
REVOKE SELECT (referred_id) ON public.referral_history FROM anon;

-- 3) tickets_update_field_restriction: restrict updatable columns for authenticated users
REVOKE UPDATE ON public.tickets FROM authenticated;
GRANT UPDATE (subject, description, category, updated_at) ON public.tickets TO authenticated;

-- 4) user_roles_self_grant: explicit restrictive policies blocking non-admins from mutating roles
DROP POLICY IF EXISTS "Only admins can insert roles" ON public.user_roles;
CREATE POLICY "Only admins can insert roles"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Only admins can update roles" ON public.user_roles;
CREATE POLICY "Only admins can update roles"
ON public.user_roles
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Only admins can delete roles" ON public.user_roles;
CREATE POLICY "Only admins can delete roles"
ON public.user_roles
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));
