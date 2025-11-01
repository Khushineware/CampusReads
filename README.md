# CampusReads - Library Management System

A comprehensive library management system built with React, TypeScript, and Supabase.

## ✨ Features

### 👤 Student Features
- ✅ **Login Page** - Role-based authentication for students
- ✅ **ISBN Scanning/Input** - Scan or manually enter ISBN to borrow books
- ✅ **Book Search** - Search books by title, author, ISBN, or category
- ✅ **Smart Recommendations** - AI-powered book recommendations based on reading history
- ✅ **Reading Analytics** - Track reading habits, favorite categories, and statistics
- ✅ **Borrow/Return Books** - Easy book borrowing and return process
- ✅ **Email Reminders** - Automatic reminders for due/overdue books (via Gmail)

### 👨‍💼 Librarian Features
- ✅ **Login Page** - Role-based authentication for librarians
- ✅ **Dashboard** - View library statistics (total books, borrowed, overdue, available)
- ✅ **Inventory Management** - Add, view, and delete books from catalog
- ✅ **Recent Transactions** - See recently borrowed/submitted books
- ✅ **Smart Reminders** - Automatically identify and send reminders for due/overdue books via Gmail
- ✅ **Overdue Management** - View and manage overdue books

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Supabase account and project

### Installation

1. **Clone/Navigate to the project**
```bash
cd CampusReads
```

2. **Install Dependencies**
```bash
npm install
```

3. **Configure Supabase**
   - Create a Supabase project at https://supabase.com
   - Update `src/supabaseClient.ts` with your Supabase URL and anon key
   - Set up the following tables in your Supabase database:

### Required Database Tables

#### `books` table
```sql
CREATE TABLE books (
  id SERIAL PRIMARY KEY,
  isbn TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  author TEXT NOT NULL,
  category TEXT,
  total_copies INTEGER NOT NULL DEFAULT 0,
  available_copies INTEGER NOT NULL DEFAULT 0
);
```

#### `borrowed_books` table
```sql
CREATE TABLE borrowed_books (
  id SERIAL PRIMARY KEY,
  user_email TEXT NOT NULL,
  book_isbn TEXT NOT NULL REFERENCES books(isbn),
  borrow_date TIMESTAMP NOT NULL DEFAULT NOW(),
  due_date TIMESTAMP NOT NULL,
  return_date TIMESTAMP,
  returned BOOLEAN NOT NULL DEFAULT FALSE
);
```

#### `users` table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'librarian'))
);
```

4. **Run the Development Server**
```bash
npm run dev
```

5. **Open in Browser**
   - Navigate to http://localhost:5173

## 📚 Usage

### For Students

1. **Login** - Select "Student" role and enter your credentials
2. **Borrow Books** - Use the "My Books" tab to:
   - Enter ISBN manually
   - Or click "Use Camera to Scan ISBN" (placeholder for camera functionality)
3. **Search Books** - Use the "Search" tab to find books by various criteria
4. **Get Recommendations** - Check the "Recommendations" tab for personalized suggestions
5. **View Analytics** - Track your reading habits in the "Analytics" tab

### For Librarians

1. **Login** - Select "Librarian" role and enter credentials
2. **Dashboard** - View library statistics and overview
3. **Inventory** - Manage book catalog:
   - Add new books
   - View all books
   - Delete books
4. **Transactions** - View recent borrow/return activities
5. **Reminders** - Send email reminders for overdue books:
   - Click "Send Reminders via Gmail" to send reminders to all students with due/overdue books
   - Currently in demo mode (logs to console)

## 🔧 Email Reminders (Gmail Integration)

The system includes email reminder functionality:

- **Automatic Detection**: Identifies books that are:
  - Overdue (past due date)
  - Due soon (within 5 days)

- **Manual Trigger**: Librarians can manually send reminders from the Reminders tab

- **Future Enhancement**: To integrate actual Gmail API:
  1. Set up Gmail API credentials
  2. Configure OAuth 2.0
  3. Update the reminder sending logic in `librarianDashboard.tsx`

Currently, reminders are logged to the console in demo mode.

## 📊 Features Overview

### Student Dashboard
- **My Books**: View borrowed books, due dates, and return functionality
- **Search**: Comprehensive book search with filters
- **Recommendations**: Personalized book suggestions
- **Analytics**: Reading statistics and habits

### Librarian Dashboard
- **Dashboard**: Library statistics and quick actions
- **Inventory**: Complete catalog management
- **Transactions**: Recent activity tracking
- **Reminders**: Overdue book management and email sending

## 🛠️ Technology Stack

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite
- **Database**: Supabase (PostgreSQL)
- **Styling**: CSS3

## 📝 Notes

- The system uses Supabase for authentication and database
- ISBN scanning currently shows a placeholder (can be enhanced with a barcode scanner library)
- Email reminders are in demo mode (ready for Gmail API integration)
- All features are fully functional and connected to Supabase

## 🔐 Authentication

Users must be registered in Supabase Auth with corresponding entries in the `users` table with the correct role (`student` or `librarian`).

## 📄 License

MIT License

---

**CampusReads** - Smart Library Management for Modern Campuses 📚
