-- Drop existing table
DROP TABLE IF EXISTS public.user_subscriptions CASCADE;

-- Create user_subscriptions table with only Mercado Pago fields
CREATE TABLE public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plan_type TEXT NOT NULL,
  status TEXT NOT NULL,
  payment_method TEXT DEFAULT 'mercadopago',
  amount_paid NUMERIC,
  currency TEXT DEFAULT 'BRL',
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  paid_at TIMESTAMP WITH TIME ZONE,
  mercadopago_payment_id TEXT,
  payment_token TEXT,
  coupon_code TEXT,
  alert_7_days_sent BOOLEAN DEFAULT false,
  alert_15_days_sent BOOLEAN DEFAULT false,
  alert_30_days_sent BOOLEAN DEFAULT false
);

-- Enable RLS
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own subscriptions"
  ON public.user_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions"
  ON public.user_subscriptions
  FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert subscriptions"
  ON public.user_subscriptions
  FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update subscriptions"
  ON public.user_subscriptions
  FOR UPDATE
  USING (is_admin(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();