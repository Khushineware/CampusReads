# Quick Start Guide - Supabase Setup

## 🚀 Fast Setup (5 Minutes)

### Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com
2. Open your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Copy & Paste SQL Script
Copy the entire contents of `setup_supabase.sql` and paste it into the SQL Editor, then click **Run** (or press Ctrl+Enter).

### Step 3: Verify Tables Created
Run this to check:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('books', 'borrowed_books', 'users');
```

You should see 3 tables: `books`, `borrowed_books`, `users`

### Step 4: Check Sample Books
```sql
SELECT * FROM public.books;
```

You should see 6 sample books with ISBNs like `978-0262033848`

### Step 5: Create Test Users

1. Go to **Authentication** → **Users**
2. Click **Add User** → **Create new user**

**Create Student:**
- Email: `student@test.com`
- Password: `student123`
- Copy the User ID (UUID)

**Create Librarian:**
- Email: `librarian@test.com`  
- Password: `librarian123`
- Copy the User ID (UUID)

### Step 6: Check Users Table Structure

First, check what columns exist:
```sql
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'users';
```

### Step 7: Add User Roles

**Option A: If name column exists, use this:**
```sql
INSERT INTO public.users (id, email, role, name) 
SELECT 
  au.id,
  au.email,
  CASE 
    WHEN au.email = 'student@test.com' THEN 'student'
    WHEN au.email = 'librarian@test.com' THEN 'librarian'
  END as role,
  CASE 
    WHEN au.email = 'student@test.com' THEN 'Test Student'
    WHEN au.email = 'librarian@test.com' THEN 'Test Librarian'
  END as name
FROM auth.users au
WHERE au.email IN ('student@test.com', 'librarian@test.com')
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;
```

**Option B: If name column doesn't exist, use this (without name):**
```sql
-- Add name column if missing
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS name TEXT;

-- Then insert users
INSERT INTO public.users (id, email, role) 
SELECT 
  au.id,
  au.email,
  CASE 
    WHEN au.email = 'student@test.com' THEN 'student'
    WHEN au.email = 'librarian@test.com' THEN 'librarian'
  END as role
FROM auth.users au
WHERE au.email IN ('student@test.com', 'librarian@test.com')
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

-- Update names separately
UPDATE public.users 
SET name = CASE 
  WHEN email = 'student@test.com' THEN 'Test Student'
  WHEN email = 'librarian@test.com' THEN 'Test Librarian'
END
WHERE email IN ('student@test.com', 'librarian@test.com');
```

**Or use the fix script:**
Just copy and run `fix_users_table.sql` - it handles everything automatically!

### Step 7: Test Login

Now you can login with:
- **Student**: `student@test.com` / `student123`
- **Librarian**: `librarian@test.com` / `librarian123`

### Step 8: Test ISBN

Try borrowing a book with ISBN: `978-0262033848`

## ✅ That's It!

Your database is now ready. The app should work correctly now.

## 📋 Table Structure Summary

### `books` table columns:
- `id` (auto-increment)
- `isbn` (TEXT, unique) ← **IMPORTANT: This is what you search by**
- `name` (TEXT)
- `author` (TEXT)
- `category` (TEXT)
- `total_copies` (INTEGER)
- `available_copies` (INTEGER)

### `borrowed_books` table columns:
- `id` (auto-increment)
- `user_email` (TEXT)
- `book_isbn` (TEXT, references books.isbn)
- `borrow_date` (TIMESTAMP)
- `due_date` (TIMESTAMP)
- `return_date` (TIMESTAMP, nullable)
- `returned` (BOOLEAN)

### `users` table columns:
- `id` (UUID, references auth.users.id)
- `email` (TEXT)
- `role` (TEXT: 'student' or 'librarian')
- `name` (TEXT)

## 🔍 Troubleshooting

**Error: Table not found**
- Make sure you ran the SQL script
- Check table names are lowercase: `books` not `Books`

**Error: Permission denied**
- Run this to disable RLS temporarily:
  ```sql
  ALTER TABLE public.books DISABLE ROW LEVEL SECURITY;
  ALTER TABLE public.borrowed_books DISABLE ROW LEVEL SECURITY;
  ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
  ```

**ISBN not found**
- Check Debug Books tab to see what ISBNs are in database
- Make sure ISBN matches exactly (including dashes/spaces)

