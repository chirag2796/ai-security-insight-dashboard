
-- Allow org members to update their own company
CREATE POLICY "Members can update their company"
  ON public.companies FOR UPDATE
  USING (id = get_user_company_id(auth.uid()));
