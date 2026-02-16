
-- Add invite tracking columns to members table
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS invite_email text;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS invite_status text NOT NULL DEFAULT 'active';
-- For existing rows, keep 'active'. New invites will be 'pending_signup'.

-- Make user_id nullable so we can create pending member records before user registers
ALTER TABLE public.members ALTER COLUMN user_id DROP NOT NULL;
