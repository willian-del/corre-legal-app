-- Fix: Validate that the caller's auth.uid() matches the referred_user_id parameter
-- This prevents any authenticated user from claiming referral credit for other users

CREATE OR REPLACE FUNCTION public.process_referral(_referrer_code text, _referred_user_id uuid, _referred_name text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _referrer_id UUID;
  _old_level INTEGER;
  _new_level INTEGER;
  _new_total INTEGER;
BEGIN
  -- SECURITY FIX: Validate that the caller is the referred user
  IF _referred_user_id != auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não autorizado: você só pode processar indicações para sua própria conta');
  END IF;

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
$function$;