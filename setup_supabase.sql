-- ============================================
-- CampusReads Database Setup - Complete Script
-- Run this in Supabase SQL Editor
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

-- 3. Users Table (extends Supabase auth.users)
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

-- 4. Sample Books (Optional - you can remove this if you want to add books manually)
INSERT INTO public.books (isbn, name, author, category, total_copies, available_copies) VALUES
  ('978-0262033848', 'Introduction to Algorithms', 'Thomas H. Cormen', 'Computer Science', 5, 5),
  ('978-0136042594', 'Artificial Intelligence: A Modern Approach', 'Stuart Russell', 'Computer Science', 3, 3),
  ('978-0521809269', 'The Art of Electronics', 'Paul Horowitz', 'Engineering', 4, 4),
  ('978-0538453059', 'Principles of Economics', 'N. Gregory Mankiw', 'Economics', 6, 6),
  ('978-0134093413', 'Campbell Biology', 'Lisa A. Urry', 'Biology', 5, 5),
  ('978-1118230725', 'Fundamentals of Physics', 'David Halliday', 'Physics', 4, 4)
ON CONFLICT (isbn) DO NOTHING;

-- 5. Verify Setup
SELECT 'Setup Complete! Tables created successfully.' as status;
SELECT COUNT(*) as total_books FROM public.books;

