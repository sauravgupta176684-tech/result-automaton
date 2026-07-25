REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
REVOKE ALL ON FUNCTION public.ensure_my_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_my_role() FROM anon;
GRANT EXECUTE ON FUNCTION public.ensure_my_role() TO authenticated;