-- Rollback: restore original org_insert policy and remove search_path pin
DROP POLICY IF EXISTS org_insert ON public.organizations;
CREATE POLICY org_insert ON public.organizations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Remove explicit search_path (reverts to default mutable behaviour)
ALTER FUNCTION public.user_org_id() RESET search_path;
