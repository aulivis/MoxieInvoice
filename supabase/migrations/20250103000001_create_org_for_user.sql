-- Ensure organization and profile for the current user (e.g. after Magic Link signup).
-- Uses SECURITY DEFINER so we can insert org and then profile; RLS would block
-- SELECT on the newly inserted org before the profile is linked.
CREATE OR REPLACE FUNCTION public.create_organization_for_user()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_org_id UUID;
  v_profile_org_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT organization_id INTO v_profile_org_id
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_profile_org_id IS NOT NULL THEN
    RETURN v_profile_org_id;
  END IF;

  INSERT INTO public.organizations (name)
  VALUES ('My Organization')
  RETURNING id INTO v_org_id;

  INSERT INTO public.profiles (id, organization_id, preferred_lang)
  VALUES (v_user_id, v_org_id, 'hu')
  ON CONFLICT (id) DO UPDATE SET
    organization_id = EXCLUDED.organization_id,
    preferred_lang = COALESCE(public.profiles.preferred_lang, EXCLUDED.preferred_lang),
    updated_at = now();

  RETURN v_org_id;
END;
$$;
