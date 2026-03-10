-- Security: restrict organizations INSERT to authenticated users only
DROP POLICY IF EXISTS org_insert ON public.organizations;
CREATE POLICY org_insert ON public.organizations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Security: fix mutable search_path on user_org_id
ALTER FUNCTION public.user_org_id() SET search_path = public;
