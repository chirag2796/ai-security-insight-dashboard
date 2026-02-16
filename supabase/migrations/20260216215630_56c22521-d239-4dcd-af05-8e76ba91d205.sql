
-- Update handle_new_user to update existing pending member record for invited users
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
    
    -- Update existing pending member record if it exists, otherwise create new
    UPDATE public.members 
    SET user_id = NEW.id, invite_status = 'active'
    WHERE org_id = _company_id AND invite_email = NEW.email AND invite_status = 'pending_signup';
    
    IF NOT FOUND THEN
      INSERT INTO public.members (user_id, org_id, role, invite_status) VALUES (NEW.id, _company_id, 'member', 'active');
    END IF;
  ELSE
    -- Direct signup: create new org, become admin/owner
    INSERT INTO public.companies (name) VALUES (_company_name) RETURNING id INTO _company_id;
    INSERT INTO public.profiles (user_id, full_name, company_id) VALUES (NEW.id, _full_name, _company_id);
    INSERT INTO public.members (user_id, org_id, role, invite_status) VALUES (NEW.id, _company_id, 'owner', 'active');
    _role := 'admin';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);

  RETURN NEW;
END;
$$;
