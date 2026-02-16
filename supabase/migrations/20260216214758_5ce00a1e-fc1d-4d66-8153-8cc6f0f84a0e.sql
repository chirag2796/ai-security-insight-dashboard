
-- Clear all existing data (order matters due to foreign keys)
DELETE FROM compliance_steps;
DELETE FROM compliance_plans;
DELETE FROM controls;
DELETE FROM requests;
DELETE FROM tools;
DELETE FROM vendors;
DELETE FROM activity_log;
DELETE FROM members;
DELETE FROM profiles;
DELETE FROM companies;
-- Clear auth users
DELETE FROM auth.users;

-- Create app_role enum
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- RLS: users can see their own roles
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- RLS: admins can view all roles in their org
CREATE POLICY "Admins can view org roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  AND EXISTS (
    SELECT 1 FROM public.members m1
    JOIN public.members m2 ON m1.org_id = m2.org_id
    WHERE m1.user_id = auth.uid() AND m2.user_id = user_roles.user_id
  )
);

-- RLS: only trigger/service role inserts roles
CREATE POLICY "Service role can manage roles"
ON public.user_roles FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Update handle_new_user to assign admin role for direct signups
-- Invited users get 'user' role (they come through invite flow)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _company_id uuid;
  _full_name text;
  _company_name text;
  _invited_to_org uuid;
  _role app_role;
BEGIN
  _full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  _company_name := COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Organization');
  _invited_to_org := (NEW.raw_user_meta_data->>'invited_to_org')::uuid;

  IF _invited_to_org IS NOT NULL THEN
    -- Invited user: join existing org as 'user'
    _company_id := _invited_to_org;
    _role := 'user';
    INSERT INTO public.profiles (user_id, full_name, company_id) VALUES (NEW.id, _full_name, _company_id);
    INSERT INTO public.members (user_id, org_id, role) VALUES (NEW.id, _company_id, 'member');
  ELSE
    -- Direct signup: create new org, become admin/owner
    INSERT INTO public.companies (name) VALUES (_company_name) RETURNING id INTO _company_id;
    INSERT INTO public.profiles (user_id, full_name, company_id) VALUES (NEW.id, _full_name, _company_id);
    INSERT INTO public.members (user_id, org_id, role) VALUES (NEW.id, _company_id, 'owner');
    _role := 'admin';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);

  RETURN NEW;
END;
$$;
