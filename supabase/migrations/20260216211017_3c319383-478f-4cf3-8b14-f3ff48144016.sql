
-- Create a trigger to handle new user setup server-side (bypasses RLS)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _company_id uuid;
  _full_name text;
  _company_name text;
BEGIN
  _full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  _company_name := COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Organization');

  -- Create company
  INSERT INTO public.companies (name)
  VALUES (_company_name)
  RETURNING id INTO _company_id;

  -- Create profile
  INSERT INTO public.profiles (user_id, full_name, company_id)
  VALUES (NEW.id, _full_name, _company_id);

  -- Create member with owner role
  INSERT INTO public.members (user_id, org_id, role)
  VALUES (NEW.id, _company_id, 'owner');

  RETURN NEW;
END;
$$;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
