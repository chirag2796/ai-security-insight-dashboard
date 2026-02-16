
-- Recreate with broader permissions
DROP POLICY IF EXISTS "Anyone can insert companies" ON public.companies;
CREATE POLICY "Anyone can insert companies"
  ON public.companies
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK (true);
