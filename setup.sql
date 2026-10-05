-- ============================================================================
-- SARENA ESCROW MARKETPLACE - DATABASE SETUP SCRIPT
-- Paste this script into your Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTENSIONS & PREREQUISITES
-- ----------------------------------------------------------------------------
-- Enable UUID generation extension if not already present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 2. PUBLIC USERS TABLE (INCORPORATING PROFILE DETAILS)
-- ----------------------------------------------------------------------------
-- Represents all registered users (clients, creators, and admins).
-- Syncs automatically with Supabase Auth via a database trigger.
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'client' CHECK (role IN ('client', 'creator', 'admin')),
    
    -- Creator Profile details (nullable for client accounts)
    username TEXT UNIQUE,
    bio TEXT,
    portfolio_url TEXT,
    price_base INTEGER DEFAULT 0 CHECK (price_base >= 0),
    is_verified BOOLEAN DEFAULT FALSE NOT NULL,
    is_member BOOLEAN DEFAULT FALSE NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ----------------------------------------------------------------------------
-- 3. WORKSPACES & ESCROW TABLE
-- ----------------------------------------------------------------------------
-- Manages workspaces, invoice status, escrow releases, and collaboration.
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL CHECK (amount >= 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'escrow', 'released', 'refunded')),
    xendit_invoice_id TEXT,
    xendit_external_id TEXT,
    revisions INTEGER DEFAULT 0 CHECK (revisions >= 0),
    revisions_used INTEGER DEFAULT 0 CHECK (revisions_used >= 0),
    handshake BOOLEAN DEFAULT FALSE,
    brief TEXT,
    title TEXT,
    requirements_file TEXT,
    deliverable_file TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ----------------------------------------------------------------------------
-- 4. PERFORMANCE INDEXES
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_workspaces_client_id ON public.workspaces(client_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_creator_id ON public.workspaces(creator_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);

-- ----------------------------------------------------------------------------
-- 5. AUTOMATED UPDATE TIMESTAMPS TRIGGER
-- ----------------------------------------------------------------------------
-- Function to automatically bump the updated_at column on edit.
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_workspaces_updated_at ON public.workspaces;
CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- 6. SUPABASE AUTH TO PUBLIC USERS SYNC TRIGGER
-- ----------------------------------------------------------------------------
-- Runs every time a user signs up using Google OAuth or Email Auth in Supabase.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    'client' -- Default role is client, upgraded to creator upon setting up a profile
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS) CONFIGURATION
-- ----------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 8. SECURITY POLICIES
-- ----------------------------------------------------------------------------

-- PUBLIC USERS POLICIES
CREATE POLICY "Allow public read access to users"
  ON public.users FOR SELECT
  USING (true);

CREATE POLICY "Allow users to update their own row"
  ON public.users FOR UPDATE
  USING (
    auth.uid() = id OR 
    id = '00000000-0000-0000-0000-000000000001' OR 
    id = '00000000-0000-0000-0000-000000000002'
  )
  WITH CHECK (
    (
      auth.uid() = id OR 
      id = '00000000-0000-0000-0000-000000000001' OR 
      id = '00000000-0000-0000-0000-000000000002'
    ) AND 
    (
      -- Prevent upgrading own role to admin if not already an admin
      role IS DISTINCT FROM 'admin' OR 
      (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin' OR
      id = '00000000-0000-0000-0000-000000000001' OR 
      id = '00000000-0000-0000-0000-000000000002'
    )
  );

-- WORKSPACES POLICIES
CREATE POLICY "Allow users to read their own workspaces or admins to read all"
  ON public.workspaces FOR SELECT
  USING (
    auth.uid() = client_id OR 
    auth.uid() = creator_id OR
    (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin'))
  );

CREATE POLICY "Allow client to create workspaces"
  ON public.workspaces FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Allow client, creator, and admins to update workspaces"
  ON public.workspaces FOR UPDATE
  USING (
    auth.uid() = client_id OR 
    auth.uid() = creator_id OR
    (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin'))
  )
  WITH CHECK (
    auth.uid() = client_id OR 
    auth.uid() = creator_id OR
    (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin'))
  );

-- ============================================================================
-- NOTE ON ADMIN CREATION:
-- To designate a user as an administrator, execute this SQL query manually in 
-- your Supabase SQL editor replacing <USER_UUID_HERE> with the user's ID:
-- UPDATE public.users SET role = 'admin' WHERE id = '<USER_UUID_HERE>';
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 9. STORAGE BUCKET FOR WORKSPACE FILES
-- ----------------------------------------------------------------------------
-- Creates the public storage bucket for workspace requirements and deliverables.
INSERT INTO storage.buckets (id, name, public)
VALUES ('workspaces', 'workspaces', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage objects
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY; -- Already enabled by default, attempting to alter this table causes owner errors in SQL Editor

-- Storage Policies
DROP POLICY IF EXISTS "Allow public read access to workspaces bucket" ON storage.objects;
CREATE POLICY "Allow public read access to workspaces bucket"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'workspaces');

DROP POLICY IF EXISTS "Allow authenticated users to upload to workspaces bucket" ON storage.objects;
CREATE POLICY "Allow authenticated users to upload to workspaces bucket"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'workspaces' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow users to delete their own objects" ON storage.objects;
CREATE POLICY "Allow users to delete their own objects"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'workspaces' AND auth.uid()::text = owner::text);

-- ----------------------------------------------------------------------------
-- 10. LOCAL DEVELOPMENT BYPASS USERS (FOR OFFLINE / BYPASS TESTING)
-- ----------------------------------------------------------------------------
-- Drops the foreign key constraint referencing auth.users to allow mock users
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;

-- Inserts pre-configured dev client and dev designer accounts
INSERT INTO public.users (
  id, 
  email, 
  full_name, 
  avatar_url, 
  role, 
  username, 
  bio, 
  price_base, 
  is_verified,
  is_member
)
VALUES 
  (
    '00000000-0000-0000-0000-000000000001', 
    'client@example.com', 
    'Test Client', 
    'https://api.dicebear.com/7.x/adventurer/svg?seed=testclient', 
    'client', 
    'devclient', 
    'Client profile for local testing and bypass.', 
    0, 
    false,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000002', 
    'designer@example.com', 
    'Test Designer', 
    'https://api.dicebear.com/7.x/adventurer/svg?seed=testdesigner', 
    'creator', 
    'testdesigner', 
    'Experienced developer and illustrator specializing in high-fidelity mockups.', 
    150000, 
    true,
    false
  )
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 11. WORKSPACE COLUMN ALTERATIONS & UPDATED RLS POLICIES FOR PUBLIC OPENINGS
-- ----------------------------------------------------------------------------
-- Make client_id and creator_id nullable to support public workspaces
ALTER TABLE public.workspaces ALTER COLUMN client_id DROP NOT NULL;
ALTER TABLE public.workspaces ALTER COLUMN creator_id DROP NOT NULL;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id);

-- Re-create security policies to support public and invitation workspaces
DROP POLICY IF EXISTS "Allow users to read their own workspaces or admins to read all" ON public.workspaces;
CREATE POLICY "Allow users to read workspaces"
  ON public.workspaces FOR SELECT
  USING (
    auth.uid() = client_id OR 
    auth.uid() = creator_id OR
    client_id IS NULL OR 
    creator_id IS NULL OR
    client_id = '00000000-0000-0000-0000-000000000001' OR 
    client_id = '00000000-0000-0000-0000-000000000002' OR
    creator_id = '00000000-0000-0000-0000-000000000001' OR 
    creator_id = '00000000-0000-0000-0000-000000000002' OR
    (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin'))
  );

DROP POLICY IF EXISTS "Allow client to create workspaces" ON public.workspaces;
CREATE POLICY "Allow authenticated users to create workspaces"
  ON public.workspaces FOR INSERT
  WITH CHECK (
    auth.uid() = client_id OR 
    auth.uid() = creator_id OR
    client_id = '00000000-0000-0000-0000-000000000001' OR 
    client_id = '00000000-0000-0000-0000-000000000002' OR
    creator_id = '00000000-0000-0000-0000-000000000001' OR 
    creator_id = '00000000-0000-0000-0000-000000000002'
  );

DROP POLICY IF EXISTS "Allow client, creator, and admins to update workspaces" ON public.workspaces;
CREATE POLICY "Allow users to update workspaces"
  ON public.workspaces FOR UPDATE
  USING (
    auth.uid() = client_id OR 
    auth.uid() = creator_id OR
    client_id IS NULL OR 
    creator_id IS NULL OR
    client_id = '00000000-0000-0000-0000-000000000001' OR 
    client_id = '00000000-0000-0000-0000-000000000002' OR
    creator_id = '00000000-0000-0000-0000-000000000001' OR 
    creator_id = '00000000-0000-0000-0000-000000000002' OR
    (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin'))
  )
  WITH CHECK (
    auth.uid() = client_id OR 
    auth.uid() = creator_id OR
    client_id IS NULL OR 
    creator_id IS NULL OR
    client_id = '00000000-0000-0000-0000-000000000001' OR 
    client_id = '00000000-0000-0000-0000-000000000002' OR
    creator_id = '00000000-0000-0000-0000-000000000001' OR 
    creator_id = '00000000-0000-0000-0000-000000000002' OR
    (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin'))
  );


-- ----------------------------------------------------------------------------
-- 12. FOLLOWS TABLE (FOR USER COLLABORATION & SOCIAL FEATURES)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.follows (
    follower_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    PRIMARY KEY (follower_id, following_id)
);

-- Enable RLS
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- Follows policies
DROP POLICY IF EXISTS "Allow public read access to follows" ON public.follows;
CREATE POLICY "Allow public read access to follows"
  ON public.follows FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to follow others" ON public.follows;
CREATE POLICY "Allow authenticated users to follow others"
  ON public.follows FOR INSERT
  WITH CHECK (
    auth.uid() = follower_id OR
    follower_id = '00000000-0000-0000-0000-000000000001' OR 
    follower_id = '00000000-0000-0000-0000-000000000002'
  );

DROP POLICY IF EXISTS "Allow users to unfollow others" ON public.follows;
CREATE POLICY "Allow users to unfollow others"
  ON public.follows FOR DELETE
  USING (
    auth.uid() = follower_id OR
    follower_id = '00000000-0000-0000-0000-000000000001' OR 
    follower_id = '00000000-0000-0000-0000-000000000002'
  );


-- ----------------------------------------------------------------------------
-- 13. TRANSACTIONS TABLE (FOR AUDITING & PAYMENT TRACKING)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL CHECK (amount >= 0),
    status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
    payment_method TEXT,
    reference_id TEXT,
    raw_payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Apply updated_at trigger
DROP TRIGGER IF EXISTS update_transactions_updated_at ON public.transactions;
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS Policies
DROP POLICY IF EXISTS "Allow users to read their own workspace transactions or admins to read all" ON public.transactions;
CREATE POLICY "Allow users to read their own workspace transactions or admins to read all"
  ON public.transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspaces 
      WHERE workspaces.id = transactions.workspace_id 
      AND (
        auth.uid() = workspaces.client_id OR 
        auth.uid() = workspaces.creator_id OR
        (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin'))
      )
    )
  );

-- ----------------------------------------------------------------------------
-- 14. DYNAMIC GRID LAYOUT COLUMN
-- ----------------------------------------------------------------------------
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS finalization_layout JSONB DEFAULT '[]'::jsonb;




