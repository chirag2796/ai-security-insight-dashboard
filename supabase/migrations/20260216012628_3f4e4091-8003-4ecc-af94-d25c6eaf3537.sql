
-- Allow users to delete their company's reports
CREATE POLICY "Users can delete company reports"
ON public.reports
FOR DELETE
USING ((company_id IS NULL) OR (company_id = get_user_company_id(auth.uid())));

-- Allow users to delete their company's compliance plans
CREATE POLICY "Users can delete company plans"
ON public.compliance_plans
FOR DELETE
USING (company_id = get_user_company_id(auth.uid()));

-- Allow users to delete steps of their company's compliance plans
CREATE POLICY "Users can delete plan steps"
ON public.compliance_steps
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM compliance_plans cp
  WHERE cp.id = compliance_steps.plan_id
  AND cp.company_id = get_user_company_id(auth.uid())
));
