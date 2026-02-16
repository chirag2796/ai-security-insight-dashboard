
DROP POLICY "Anyone can insert companies" ON public.companies;

CREATE POLICY "Anyone can insert companies"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (true);
