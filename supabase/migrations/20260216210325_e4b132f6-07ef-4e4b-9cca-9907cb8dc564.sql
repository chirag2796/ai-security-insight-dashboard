
-- Fix: Drop restrictive INSERT policy and recreate as permissive
DROP POLICY "Anyone can insert companies" ON public.companies;
CREATE POLICY "Anyone can insert companies"
  ON public.companies FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Clear test data
DELETE FROM public.activity_log;
DELETE FROM public.compliance_steps;
DELETE FROM public.compliance_plans;
DELETE FROM public.controls;
DELETE FROM public.requests;
DELETE FROM public.vendors;
DELETE FROM public.tools;
DELETE FROM public.members;
DELETE FROM public.profiles;
DELETE FROM public.reports;
DELETE FROM public.companies;
