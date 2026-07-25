CREATE TYPE public.app_role AS ENUM ('teacher', 'viewer');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own role"
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.ensure_my_role()
RETURNS public.app_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  existing public.app_role;
  assigned public.app_role;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT role INTO existing FROM public.user_roles WHERE user_id = uid LIMIT 1;
  IF existing IS NOT NULL THEN
    RETURN existing;
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'teacher') THEN
    assigned := 'viewer';
  ELSE
    assigned := 'teacher';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (uid, assigned)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN assigned;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_my_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;