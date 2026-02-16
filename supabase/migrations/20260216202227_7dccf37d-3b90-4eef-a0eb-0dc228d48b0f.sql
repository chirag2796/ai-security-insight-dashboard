
-- =============================================
-- Phase 1: GRC Platform Schema Migration
-- =============================================

-- 1. Create enums
CREATE TYPE public.member_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE public.tool_status AS ENUM ('pending', 'approved', 'rejected', 'sunset');
CREATE TYPE public.risk_level AS ENUM ('high', 'medium', 'low');
CREATE TYPE public.workflow_stage AS ENUM ('draft', 'review', 'approved', 'rejected');
CREATE TYPE public.control_status AS ENUM ('compliant', 'non_compliant', 'not_applicable');

-- 2. Expand companies table with slug and settings
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{}'::jsonb;

-- 3. Members table (role-based org membership)
CREATE TABLE public.members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.member_role NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, user_id)
);

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- Security definer function to get member role (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.get_member_role(_user_id uuid, _org_id uuid)
RETURNS public.member_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.members WHERE user_id = _user_id AND org_id = _org_id LIMIT 1;
$$;

-- Security definer to check if user is member of org
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.members WHERE user_id = _user_id AND org_id = _org_id);
$$;

-- Members RLS
CREATE POLICY "Members can view org members"
  ON public.members FOR SELECT
  USING (org_id = get_user_company_id(auth.uid()));

CREATE POLICY "Owners/admins can insert members"
  ON public.members FOR INSERT
  WITH CHECK (
    org_id = get_user_company_id(auth.uid())
    AND (
      get_member_role(auth.uid(), org_id) IN ('owner', 'admin')
      OR NOT EXISTS (SELECT 1 FROM public.members WHERE org_id = members.org_id)
    )
  );

CREATE POLICY "Owners can update members"
  ON public.members FOR UPDATE
  USING (org_id = get_user_company_id(auth.uid()) AND get_member_role(auth.uid(), org_id) = 'owner');

CREATE POLICY "Owners can delete members"
  ON public.members FOR DELETE
  USING (org_id = get_user_company_id(auth.uid()) AND get_member_role(auth.uid(), org_id) = 'owner');

-- 4. Tools table
CREATE TABLE public.tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  url text,
  category text,
  description text,
  status public.tool_status NOT NULL DEFAULT 'pending',
  risk_level public.risk_level,
  report_id uuid REFERENCES public.reports(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org tools"
  ON public.tools FOR SELECT
  USING (org_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can insert org tools"
  ON public.tools FOR INSERT
  WITH CHECK (org_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can update org tools"
  ON public.tools FOR UPDATE
  USING (org_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins can delete org tools"
  ON public.tools FOR DELETE
  USING (org_id = get_user_company_id(auth.uid()));

CREATE TRIGGER update_tools_updated_at
  BEFORE UPDATE ON public.tools
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Requests table
CREATE TABLE public.requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  tool_id uuid REFERENCES public.tools(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL REFERENCES auth.users(id),
  workflow_stage public.workflow_stage NOT NULL DEFAULT 'draft',
  submission_data jsonb DEFAULT '{}'::jsonb,
  notes text,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org requests"
  ON public.requests FOR SELECT
  USING (org_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can insert org requests"
  ON public.requests FOR INSERT
  WITH CHECK (org_id = get_user_company_id(auth.uid()) AND requester_id = auth.uid());

CREATE POLICY "Users can update org requests"
  ON public.requests FOR UPDATE
  USING (org_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins can delete org requests"
  ON public.requests FOR DELETE
  USING (org_id = get_user_company_id(auth.uid()));

CREATE TRIGGER update_requests_updated_at
  BEFORE UPDATE ON public.requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Vendors table
CREATE TABLE public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  website text,
  research_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org vendors"
  ON public.vendors FOR SELECT
  USING (org_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can insert org vendors"
  ON public.vendors FOR INSERT
  WITH CHECK (org_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can update org vendors"
  ON public.vendors FOR UPDATE
  USING (org_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can delete org vendors"
  ON public.vendors FOR DELETE
  USING (org_id = get_user_company_id(auth.uid()));

CREATE TRIGGER update_vendors_updated_at
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Controls table
CREATE TABLE public.controls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  tool_id uuid REFERENCES public.tools(id) ON DELETE CASCADE,
  framework text NOT NULL,
  control_ref text NOT NULL,
  title text NOT NULL,
  description text,
  status public.control_status NOT NULL DEFAULT 'not_applicable',
  attestation text,
  attested_by uuid REFERENCES auth.users(id),
  attested_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.controls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org controls"
  ON public.controls FOR SELECT
  USING (org_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can insert org controls"
  ON public.controls FOR INSERT
  WITH CHECK (org_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can update org controls"
  ON public.controls FOR UPDATE
  USING (org_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can delete org controls"
  ON public.controls FOR DELETE
  USING (org_id = get_user_company_id(auth.uid()));

CREATE TRIGGER update_controls_updated_at
  BEFORE UPDATE ON public.controls
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Activity log (append-only)
CREATE TABLE public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org activity"
  ON public.activity_log FOR SELECT
  USING (org_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can insert org activity"
  ON public.activity_log FOR INSERT
  WITH CHECK (org_id = get_user_company_id(auth.uid()));

-- Activity log is append-only: no update or delete policies

-- 9. Create index for performance
CREATE INDEX idx_tools_org_id ON public.tools(org_id);
CREATE INDEX idx_tools_status ON public.tools(status);
CREATE INDEX idx_requests_org_id ON public.requests(org_id);
CREATE INDEX idx_requests_workflow ON public.requests(workflow_stage);
CREATE INDEX idx_controls_org_id ON public.controls(org_id);
CREATE INDEX idx_controls_framework ON public.controls(framework);
CREATE INDEX idx_activity_log_org_id ON public.activity_log(org_id);
CREATE INDEX idx_activity_log_created ON public.activity_log(created_at DESC);
CREATE INDEX idx_members_org_id ON public.members(org_id);
CREATE INDEX idx_members_user_id ON public.members(user_id);
CREATE INDEX idx_vendors_org_id ON public.vendors(org_id);
