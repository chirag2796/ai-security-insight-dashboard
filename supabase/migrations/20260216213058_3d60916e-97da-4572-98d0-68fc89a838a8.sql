
-- Remove default tool seeding from handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _company_id uuid;
  _full_name text;
  _company_name text;
BEGIN
  _full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  _company_name := COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Organization');

  INSERT INTO public.companies (name) VALUES (_company_name) RETURNING id INTO _company_id;
  INSERT INTO public.profiles (user_id, full_name, company_id) VALUES (NEW.id, _full_name, _company_id);
  INSERT INTO public.members (user_id, org_id, role) VALUES (NEW.id, _company_id, 'owner');

  RETURN NEW;
END;
$$;
