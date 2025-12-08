-- Drop the overly permissive INSERT policy that allows any authenticated user to insert referrals
-- The process_referral database function uses SECURITY DEFINER which bypasses RLS,
-- so no user-facing INSERT policy is needed
DROP POLICY IF EXISTS "Service role can insert referrals" ON public.referral_history;