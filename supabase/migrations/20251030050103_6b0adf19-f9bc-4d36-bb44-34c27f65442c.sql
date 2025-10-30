-- Security fix: user_subscriptions table should be read-only for users
-- Only backend processes (service role) can INSERT/UPDATE subscriptions

-- Add comment to document this is a backend-managed table
comment on table public.user_subscriptions is 
'Backend-managed table. Users can only read their own subscriptions. 
INSERT/UPDATE operations should only be performed by backend processes (edge functions/webhooks) using service role.';

-- Ensure RLS is enabled (it already is, but being explicit)
alter table public.user_subscriptions enable row level security;

-- Users can ONLY read their own subscriptions (already exists, keeping it)
-- No INSERT policy = users cannot create subscriptions
-- No UPDATE policy = users cannot modify subscriptions
-- No DELETE policy = users cannot delete subscriptions

-- This is intentional: subscriptions must be managed exclusively by backend processes
-- (Stripe webhooks) to prevent users from granting themselves paid access