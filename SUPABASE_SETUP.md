# Supabase Database Setup Guide for CampusReads

This guide will help you set up all the required tables in Supabase for the CampusReads library management system.

## Step 1: Access Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"

## Step 2: Create the Required Tables

Copy and paste the following SQL scripts one by one, or all together:

### 1. Create `books` Table

```sql
-- Create books table
CREATE TABLE IF NOT EXISTS public.books (
  id SERIAL PRIMARY KEY,
  isbn TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  author TEXT NOT NULL,
  category TEXT,
  total_copies INTEGER NOT NULL DEFAULT 0,
  available_copies INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on ISBN for faster searches
CREATE INDEX IF NOT EXISTS idx_books_isbn ON public.books(isbn);

-- Add comments for documentation
COMMENT ON TABLE public.books IS 'Library book catalog';
COMMENT ON COLUMN public.books.isbn IS 'International Standard Book Number (unique identifier)';
COMMENT ON COLUMN public.books.total_copies IS 'Total number of copies owned by library';
COMMENT ON COLUMN public.books.available_copies IS 'Number of copies currently available for borrowing';
```

### 2. Create `borrowed_books` Table

```sql
-- Create borrowed_books table
CREATE TABLE IF NOT EXISTS public.borrowed_books (
  id SERIAL PRIMARY KEY,
  user_email TEXT NOT NULL,
  book_isbn TEXT NOT NULL REFERENCES public.books(isbn) ON DELETE CASCADE,
  borrow_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  return_date TIMESTAMP WITH TIME ZONE,
  returned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_borrowed_books_user_email ON public.borrowed_books(user_email);
CREATE INDEX IF NOT EXISTS idx_borrowed_books_book_isbn ON public.borrowed_books(book_isbn);
CREATE INDEX IF NOT EXISTS idx_borrowed_books_returned ON public.borrowed_books(returned);
CREATE INDEX IF NOT EXISTS idx_borrowed_books_due_date ON public.borrowed_books(due_date);

-- Add comments
COMMENT ON TABLE public.borrowed_books IS 'Records of books borrowed by users';
COMMENT ON COLUMN public.borrowed_books.user_email IS 'Email of the user who borrowed the book';
COMMENT ON COLUMN public.borrowed_books.returned IS 'Whether the book has been returned';
```

### 3. Create `users` Table (if using Supabase Auth)

```sql
-- Create users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'librarian')),
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on role for faster queries
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Add comment
COMMENT ON TABLE public.users IS 'User profiles with role information';
COMMENT ON COLUMN public.users.role IS 'User role: student or librarian';
```

### 4. Enable Row Level Security (RLS) - Optional but Recommended

```sql
-- Enable RLS on books table
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read books
CREATE POLICY "Books are viewable by everyone" ON public.books
  FOR SELECT USING (true);

-- Policy: Only authenticated users can borrow (managed through app logic)
-- You can add more restrictive policies if needed

-- Enable RLS on borrowed_books
ALTER TABLE public.borrowed_books ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own borrow records
CREATE POLICY "Users can view own borrows" ON public.borrowed_books
  FOR SELECT USING (auth.uid()::text = user_email OR user_email = current_setting('request.jwt.claims', true)::json->>'email');

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all users (for librarian functionality)
CREATE POLICY "Users are viewable by authenticated users" ON public.users
  FOR SELECT USING (auth.role() = 'authenticated');
```

### 5. Create Helper Functions (Optional)

```sql
-- Function to automatically update available_copies when book is borrowed
CREATE OR REPLACE FUNCTION update_available_copies_on_borrow()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.returned = FALSE THEN
    UPDATE public.books
    SET available_copies = available_copies - 1
    WHERE isbn = NEW.book_isbn;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update copies when borrowing
DROP TRIGGER IF EXISTS trigger_update_copies_on_borrow ON public.borrowed_books;
CREATE TRIGGER trigger_update_copies_on_borrow
  AFTER INSERT ON public.borrowed_books
  FOR EACH ROW
  WHEN (NEW.returned = FALSE)
  EXECUTE FUNCTION update_available_copies_on_borrow();

-- Function to restore available_copies when book is returned
CREATE OR REPLACE FUNCTION update_available_copies_on_return()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.returned = TRUE AND OLD.returned = FALSE THEN
    UPDATE public.books
    SET available_copies = available_copies + 1
    WHERE isbn = NEW.book_isbn;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update copies when returning
DROP TRIGGER IF EXISTS trigger_update_copies_on_return ON public.borrowed_books;
CREATE TRIGGER trigger_update_copies_on_return
  AFTER UPDATE ON public.borrowed_books
  FOR EACH ROW
  WHEN (NEW.returned = TRUE AND OLD.returned = FALSE)
  EXECUTE FUNCTION update_available_copies_on_return();
```

## Step 3: Insert Sample Data (Optional)

You can add some sample books to test the system:

```sql
-- Insert sample books
INSERT INTO public.books (isbn, name, author, category, total_copies, available_copies) VALUES
  ('978-0262033848', 'Introduction to Algorithms', 'Thomas H. Cormen', 'Computer Science', 5, 5),
  ('978-0136042594', 'Artificial Intelligence: A Modern Approach', 'Stuart Russell', 'Computer Science', 3, 3),
  ('978-0521809269', 'The Art of Electronics', 'Paul Horowitz', 'Engineering', 4, 4),
  ('978-0538453059', 'Principles of Economics', 'N. Gregory Mankiw', 'Economics', 6, 6),
  ('978-0134093413', 'Campbell Biology', 'Lisa A. Urry', 'Biology', 5, 5),
  ('978-1118230725', 'Fundamentals of Physics', 'David Halliday', 'Physics', 4, 4),
  ('978-0132350884', 'Clean Code', 'Robert C. Martin', 'Computer Science', 5, 5),
  ('978-0201633610', 'Design Patterns', 'Gang of Four', 'Computer Science', 4, 4)
ON CONFLICT (isbn) DO NOTHING;
```

## Step 4: Create Test Users (If using Supabase Auth)

1. Go to **Authentication** → **Users** in Supabase dashboard
2. Click **Add User** → **Create new user**
3. Create two test users:

**Student User:**
- Email: `student@test.com` (or your preferred email)
- Password: `student123` (or your preferred password)
- After creating, note the User ID (UUID)

**Librarian User:**
- Email: `librarian@test.com` (or your preferred email)
- Password: `librarian123` (or your preferred password)
- After creating, note the User ID (UUID)

4. Then run this SQL to add roles:

```sql
-- Add roles to users (replace UUIDs with actual user IDs from auth.users)
-- Get user IDs first:
-- SELECT id, email FROM auth.users;

-- Then insert into users table (replace UUIDs with actual values)
INSERT INTO public.users (id, email, role, name) VALUES
  ((SELECT id FROM auth.users WHERE email = 'student@test.com'), 'student@test.com', 'student', 'Test Student'),
  ((SELECT id FROM auth.users WHERE email = 'librarian@test.com'), 'librarian@test.com', 'librarian', 'Test Librarian')
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;
```

## Step 5: Verify Setup

Run these queries to verify everything is set up correctly:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('books', 'borrowed_books', 'users');

-- Check books table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'books' AND table_schema = 'public';

-- Check sample books
SELECT * FROM public.books LIMIT 5;

-- Check users
SELECT * FROM public.users;
```

## Important Notes

### Table Names
- Make sure table names are lowercase: `books`, `borrowed_books`, `users`
- Supabase is case-sensitive with table names when using quotes, but lowercase works best

### Column Names
- Use lowercase: `isbn`, `name`, `author`, `total_copies`, `available_copies`
- Use snake_case for multi-word columns: `book_isbn`, `user_email`, `borrow_date`

### Permissions
- If you get permission errors, make sure RLS policies allow your operations
- You can temporarily disable RLS for testing:
  ```sql
  ALTER TABLE public.books DISABLE ROW LEVEL SECURITY;
  ```

### Common Issues

1. **Table not found**: Make sure you're running SQL in the correct database and schema (public)
2. **Permission denied**: Check RLS policies or temporarily disable them for testing
3. **Foreign key errors**: Make sure books exist before creating borrow records
4. **ISBN format**: The app handles various formats, but store ISBNs consistently in your database

## Quick Setup Script (All-in-One)

If you want to run everything at once, here's a complete script:

```sql
-- ============================================
-- CampusReads Database Setup - Complete Script
-- ============================================

-- 1. Books Table
CREATE TABLE IF NOT EXISTS public.books (
  id SERIAL PRIMARY KEY,
  isbn TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  author TEXT NOT NULL,
  category TEXT,
  total_copies INTEGER NOT NULL DEFAULT 0,
  available_copies INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_books_isbn ON public.books(isbn);

-- 2. Borrowed Books Table
CREATE TABLE IF NOT EXISTS public.borrowed_books (
  id SERIAL PRIMARY KEY,
  user_email TEXT NOT NULL,
  book_isbn TEXT NOT NULL REFERENCES public.books(isbn) ON DELETE CASCADE,
  borrow_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  return_date TIMESTAMP WITH TIME ZONE,
  returned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_borrowed_books_user_email ON public.borrowed_books(user_email);
CREATE INDEX IF NOT EXISTS idx_borrowed_books_book_isbn ON public.borrowed_books(book_isbn);
CREATE INDEX IF NOT EXISTS idx_borrowed_books_returned ON public.borrowed_books(returned);
CREATE INDEX IF NOT EXISTS idx_borrowed_books_due_date ON public.borrowed_books(due_date);

-- 3. Users Table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'librarian')),
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- 4. Sample Books (Optional)
INSERT INTO public.books (isbn, name, author, category, total_copies, available_copies) VALUES
  ('978-0262033848', 'Introduction to Algorithms', 'Thomas H. Cormen', 'Computer Science', 5, 5),
  ('978-0136042594', 'Artificial Intelligence: A Modern Approach', 'Stuart Russell', 'Computer Science', 3, 3),
  ('978-0521809269', 'The Art of Electronics', 'Paul Horowitz', 'Engineering', 4, 4),
  ('978-0538453059', 'Principles of Economics', 'N. Gregory Mankiw', 'Economics', 6, 6)
ON CONFLICT (isbn) DO NOTHING;

-- 5. Verify Setup
SELECT 'Setup Complete!' as status;
SELECT COUNT(*) as total_books FROM public.books;
```

## Next Steps

After running the SQL scripts:

1. ✅ Verify tables are created (use the verification query above)
2. ✅ Add some books using the librarian dashboard or SQL
3. ✅ Create user accounts in Supabase Auth
4. ✅ Add user roles in the `users` table
5. ✅ Test login and borrowing functionality

## Troubleshooting

If you still get errors:

1. **Check table exists**: Run `SELECT * FROM public.books LIMIT 1;`
2. **Check permissions**: Make sure your Supabase API key has access
3. **Check schema**: Ensure you're using `public` schema
4. **Check column names**: Verify exact column names match (case-sensitive)

If issues persist, check the browser console (F12) for detailed error messages!

