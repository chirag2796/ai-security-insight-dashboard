
-- Companies table
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  full_name TEXT NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Add user_id and company_id to reports
ALTER TABLE public.reports 
  ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

-- Compliance plans table
CREATE TABLE public.compliance_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.compliance_plans ENABLE ROW LEVEL SECURITY;

-- Compliance steps table
CREATE TABLE public.compliance_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.compliance_plans(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  memo TEXT,
  assigned_to TEXT,
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.compliance_steps ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's company_id
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE user_id = _user_id LIMIT 1;
$$;

-- RLS: Companies - users can see their own company
CREATE POLICY "Users can view their company" ON public.companies
  FOR SELECT USING (
    id = public.get_user_company_id(auth.uid())
  );

CREATE POLICY "Anyone can insert companies" ON public.companies
  FOR INSERT WITH CHECK (true);

-- RLS: Profiles
CREATE POLICY "Users can view company profiles" ON public.profiles
  FOR SELECT USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (user_id = auth.uid());

-- RLS: Reports - company members can see all company reports + legacy public ones
DROP POLICY IF EXISTS "Allow public read access to reports" ON public.reports;
DROP POLICY IF EXISTS "Allow public insert access to reports" ON public.reports;
DROP POLICY IF EXISTS "Allow public update access to reports" ON public.reports;

CREATE POLICY "Users can view company reports" ON public.reports
  FOR SELECT USING (
    company_id IS NULL OR company_id = public.get_user_company_id(auth.uid())
  );

CREATE POLICY "Authenticated users can insert reports" ON public.reports
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update company reports" ON public.reports
  FOR UPDATE USING (
    company_id IS NULL OR company_id = public.get_user_company_id(auth.uid())
  );

-- RLS: Compliance plans - company shared
CREATE POLICY "Users can view company plans" ON public.compliance_plans
  FOR SELECT USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can insert plans" ON public.compliance_plans
  FOR INSERT WITH CHECK (user_id = auth.uid() AND company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update company plans" ON public.compliance_plans
  FOR UPDATE USING (company_id = public.get_user_company_id(auth.uid()));

-- RLS: Compliance steps - via plan's company
CREATE POLICY "Users can view plan steps" ON public.compliance_steps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.compliance_plans cp
      WHERE cp.id = plan_id AND cp.company_id = public.get_user_company_id(auth.uid())
    )
  );

CREATE POLICY "Users can insert plan steps" ON public.compliance_steps
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.compliance_plans cp
      WHERE cp.id = plan_id AND cp.company_id = public.get_user_company_id(auth.uid())
    )
  );

CREATE POLICY "Users can update plan steps" ON public.compliance_steps
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.compliance_plans cp
      WHERE cp.id = plan_id AND cp.company_id = public.get_user_company_id(auth.uid())
    )
  );

-- Triggers for updated_at
CREATE TRIGGER update_compliance_plans_updated_at
  BEFORE UPDATE ON public.compliance_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_compliance_steps_updated_at
  BEFORE UPDATE ON public.compliance_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
