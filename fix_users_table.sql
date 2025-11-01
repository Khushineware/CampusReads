-- Fix users table - Add missing 'name' column if it doesn't exist
-- Run this in Supabase SQL Editor

-- First, check if column exists and add it if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'name'
  ) THEN
    ALTER TABLE public.users ADD COLUMN name TEXT;
    RAISE NOTICE 'Added name column to users table';
  ELSE
    RAISE NOTICE 'Name column already exists';
  END IF;
END $$;

-- Now insert users (without name first, then update if needed)
INSERT INTO public.users (id, email, role) 
SELECT 
  au.id,
  au.email,
  CASE 
    WHEN au.email = 'student@test.com' THEN 'student'
    WHEN au.email = 'librarian@test.com' THEN 'librarian'
    ELSE 'student'  -- Default role
  END as role
FROM auth.users au
WHERE au.email IN ('student@test.com', 'librarian@test.com')
ON CONFLICT (id) DO UPDATE SET 
  role = EXCLUDED.role,
  email = EXCLUDED.email;

-- Update names separately (this will work even if name column doesn't exist in older tables)
UPDATE public.users 
SET name = CASE 
  WHEN email = 'student@test.com' THEN 'Test Student'
  WHEN email = 'librarian@test.com' THEN 'Test Librarian'
END
WHERE email IN ('student@test.com', 'librarian@test.com');

-- Verify
SELECT id, email, role, name FROM public.users;

