-- Add AI Book to database and assign to student@test.edu for recommendations
-- Run this in Supabase SQL Editor

-- Step 1: Ensure the AI book exists in the books table
INSERT INTO public.books (isbn, name, author, category, total_copies, available_copies) 
VALUES 
  ('978-0136042594', 'Artificial Intelligence: A Modern Approach', 'Stuart Russell', 'Computer Science', 3, 2)
ON CONFLICT (isbn) 
DO UPDATE SET 
  name = EXCLUDED.name,
  author = EXCLUDED.author,
  category = EXCLUDED.category,
  total_copies = EXCLUDED.total_copies,
  available_copies = EXCLUDED.available_copies;

-- Step 2: Check if student@test.edu already has this book borrowed
-- If not, add a borrowed book entry so recommendations can be based on it
INSERT INTO public.borrowed_books (user_email, book_isbn, borrow_date, due_date, returned)
SELECT 
  'student@test.edu' as user_email,
  '978-0136042594' as book_isbn,
  NOW() as borrow_date,
  NOW() + INTERVAL '14 days' as due_date,
  false as returned
WHERE NOT EXISTS (
  SELECT 1 
  FROM public.borrowed_books 
  WHERE user_email = 'student@test.edu' 
  AND book_isbn = '978-0136042594' 
  AND returned = false
);

-- Step 3: Decrease available copies if book was just added to borrowed_books
UPDATE public.books
SET available_copies = available_copies - 1
WHERE isbn = '978-0136042594'
AND available_copies > 0
AND EXISTS (
  SELECT 1 
  FROM public.borrowed_books 
  WHERE user_email = 'student@test.edu' 
  AND book_isbn = '978-0136042594' 
  AND returned = false
  AND borrow_date > NOW() - INTERVAL '1 minute'
);

-- Step 4: Add some additional books for better recommendations
INSERT INTO public.books (isbn, name, author, category, total_copies, available_copies) 
VALUES 
  ('978-0132350884', 'Clean Code', 'Robert C. Martin', 'Computer Science', 4, 4),
  ('978-0134685991', 'Effective Java', 'Joshua Bloch', 'Computer Science', 3, 3),
  ('978-0596007126', 'Head First Design Patterns', 'Eric Freeman', 'Computer Science', 5, 5),
  ('978-0201633610', 'Design Patterns', 'Gang of Four', 'Computer Science', 3, 3)
ON CONFLICT (isbn) DO NOTHING;

-- Verify the setup
SELECT 'AI Book added for student@test.edu!' as status;
SELECT COUNT(*) as total_books FROM public.books WHERE category = 'Computer Science';
SELECT book_isbn, borrow_date, due_date, returned 
FROM public.borrowed_books 
WHERE user_email = 'student@test.edu' 
AND returned = false;

