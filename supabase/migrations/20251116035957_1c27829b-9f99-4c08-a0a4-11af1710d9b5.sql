-- Add fields to store complete payment operation data
ALTER TABLE public.user_subscriptions 
ADD COLUMN IF NOT EXISTS coupon_code text,
ADD COLUMN IF NOT EXISTS payment_token text,
ADD COLUMN IF NOT EXISTS mercadopago_payment_id text;

-- Add index for faster payment ID lookups
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_mp_payment_id 
ON public.user_subscriptions(mercadopago_payment_id);