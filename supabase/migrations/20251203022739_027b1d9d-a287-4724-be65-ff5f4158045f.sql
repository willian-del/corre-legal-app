-- Add referral fields to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_referrals INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS earned_days INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_level INTEGER DEFAULT 1;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS level_updated_at TIMESTAMPTZ;

-- Create referral_history table for tracking referrals
CREATE TABLE IF NOT EXISTS public.referral_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'completed',
  UNIQUE(referred_id)
);

-- Enable RLS on referral_history
ALTER TABLE public.referral_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for referral_history
CREATE POLICY "Users can view their own referrals"
ON public.referral_history
FOR SELECT
USING (auth.uid() = referrer_id);

CREATE POLICY "Service role can insert referrals"
ON public.referral_history
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view all referrals"
ON public.referral_history
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Function to generate referral code on profile creation
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8));
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to auto-generate referral code
DROP TRIGGER IF EXISTS set_referral_code ON public.profiles;
CREATE TRIGGER set_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_referral_code();

-- Function to calculate level based on referrals
CREATE OR REPLACE FUNCTION public.calculate_referral_level(total_refs INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN CASE
    WHEN total_refs >= 50 THEN 5
    WHEN total_refs >= 30 THEN 4
    WHEN total_refs >= 20 THEN 3
    WHEN total_refs >= 10 THEN 2
    ELSE 1
  END;
END;
$$;

-- Function to process a referral and update stats
CREATE OR REPLACE FUNCTION public.process_referral(
  _referrer_code TEXT,
  _referred_user_id UUID,
  _referred_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _referrer_id UUID;
  _old_level INTEGER;
  _new_level INTEGER;
  _new_total INTEGER;
BEGIN
  -- Find referrer by code
  SELECT id, current_level, total_referrals INTO _referrer_id, _old_level, _new_total
  FROM public.profiles
  WHERE referral_code = _referrer_code;
  
  IF _referrer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Código de indicação não encontrado');
  END IF;
  
  -- Prevent self-referral
  IF _referrer_id = _referred_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não é possível se auto-indicar');
  END IF;
  
  -- Check if already referred
  IF EXISTS (SELECT 1 FROM public.referral_history WHERE referred_id = _referred_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário já foi indicado');
  END IF;
  
  -- Increment referrals
  _new_total := COALESCE(_new_total, 0) + 1;
  _new_level := public.calculate_referral_level(_new_total);
  
  -- Update referrer stats
  UPDATE public.profiles
  SET 
    total_referrals = _new_total,
    earned_days = _new_total * 5,
    current_level = _new_level,
    level_updated_at = CASE WHEN _new_level > _old_level THEN now() ELSE level_updated_at END
  WHERE id = _referrer_id;
  
  -- Record in history
  INSERT INTO public.referral_history (referrer_id, referred_id, referred_name)
  VALUES (_referrer_id, _referred_user_id, _referred_name);
  
  -- Update referred user's referred_by
  UPDATE public.profiles
  SET referred_by = _referrer_code
  WHERE id = _referred_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'previousLevel', _old_level,
    'newLevel', _new_level,
    'leveledUp', _new_level > COALESCE(_old_level, 1),
    'totalReferrals', _new_total,
    'earnedDays', _new_total * 5
  );
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.process_referral TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_referral_level TO authenticated;