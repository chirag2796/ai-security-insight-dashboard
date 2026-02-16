
-- Update handle_new_user to seed default tools for new orgs
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

  -- Seed default enterprise AI tools
  INSERT INTO public.tools (name, category, org_id, created_by, status, url, description) VALUES
    ('GitHub Copilot', 'Software Development', _company_id, NEW.id, 'pending', 'https://github.com/features/copilot', 'AI pair programmer that suggests code completions'),
    ('Cursor', 'Software Development', _company_id, NEW.id, 'pending', 'https://cursor.com', 'AI-first code editor'),
    ('ChatGPT', 'AI & Machine Learning', _company_id, NEW.id, 'pending', 'https://chat.openai.com', 'Conversational AI assistant by OpenAI'),
    ('OpenAI API', 'AI & Machine Learning', _company_id, NEW.id, 'pending', 'https://platform.openai.com', 'API access to GPT and other models'),
    ('Claude', 'AI & Machine Learning', _company_id, NEW.id, 'pending', 'https://claude.ai', 'AI assistant by Anthropic'),
    ('Notion AI', 'Productivity', _company_id, NEW.id, 'pending', 'https://notion.so', 'AI-enhanced workspace and documentation'),
    ('Slack', 'Communication', _company_id, NEW.id, 'approved', 'https://slack.com', 'Team messaging and collaboration'),
    ('Zoom', 'Communication', _company_id, NEW.id, 'approved', 'https://zoom.us', 'Video conferencing and meetings'),
    ('Fireflies.ai', 'Communication', _company_id, NEW.id, 'pending', 'https://fireflies.ai', 'AI meeting assistant and transcription'),
    ('Microsoft Copilot', 'Productivity', _company_id, NEW.id, 'pending', 'https://copilot.microsoft.com', 'AI assistant for Microsoft 365'),
    ('Grammarly', 'Productivity', _company_id, NEW.id, 'approved', 'https://grammarly.com', 'AI writing assistant'),
    ('Midjourney', 'Design', _company_id, NEW.id, 'pending', 'https://midjourney.com', 'AI image generation'),
    ('Jasper', 'Sales & Marketing', _company_id, NEW.id, 'pending', 'https://jasper.ai', 'AI content creation for marketing'),
    ('Salesforce Einstein', 'Sales & Marketing', _company_id, NEW.id, 'pending', 'https://salesforce.com', 'AI-powered CRM analytics'),
    ('Tableau', 'Data & Analytics', _company_id, NEW.id, 'approved', 'https://tableau.com', 'Data visualization and analytics');

  RETURN NEW;
END;
$$;

-- Seed default tools for existing company
INSERT INTO public.tools (name, category, org_id, status, url, description)
SELECT t.name, t.category, c.id, t.status, t.url, t.description
FROM (VALUES
  ('GitHub Copilot', 'Software Development', 'pending'::tool_status, 'https://github.com/features/copilot', 'AI pair programmer that suggests code completions'),
  ('Cursor', 'Software Development', 'pending', 'https://cursor.com', 'AI-first code editor'),
  ('ChatGPT', 'AI & Machine Learning', 'pending', 'https://chat.openai.com', 'Conversational AI assistant by OpenAI'),
  ('OpenAI API', 'AI & Machine Learning', 'pending', 'https://platform.openai.com', 'API access to GPT and other models'),
  ('Claude', 'AI & Machine Learning', 'pending', 'https://claude.ai', 'AI assistant by Anthropic'),
  ('Notion AI', 'Productivity', 'pending', 'https://notion.so', 'AI-enhanced workspace and documentation'),
  ('Slack', 'Communication', 'approved', 'https://slack.com', 'Team messaging and collaboration'),
  ('Zoom', 'Communication', 'approved', 'https://zoom.us', 'Video conferencing and meetings'),
  ('Fireflies.ai', 'Communication', 'pending', 'https://fireflies.ai', 'AI meeting assistant and transcription'),
  ('Microsoft Copilot', 'Productivity', 'pending', 'https://copilot.microsoft.com', 'AI assistant for Microsoft 365'),
  ('Grammarly', 'Productivity', 'approved', 'https://grammarly.com', 'AI writing assistant'),
  ('Midjourney', 'Design', 'pending', 'https://midjourney.com', 'AI image generation'),
  ('Jasper', 'Sales & Marketing', 'pending', 'https://jasper.ai', 'AI content creation for marketing'),
  ('Salesforce Einstein', 'Sales & Marketing', 'pending', 'https://salesforce.com', 'AI-powered CRM analytics'),
  ('Tableau', 'Data & Analytics', 'approved', 'https://tableau.com', 'Data visualization and analytics')
) AS t(name, category, status, url, description)
CROSS JOIN public.companies c
WHERE NOT EXISTS (
  SELECT 1 FROM public.tools WHERE tools.org_id = c.id AND tools.name = t.name
);
