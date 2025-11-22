# 📚 CampusReads - Smart Library Management System  

A modern and intelligent **Library Management System** built with **React**, **Node.js**, **TypeScript**, and **Supabase**, featuring **AI-powered book recommendations** and an intuitive user interface for both students and librarians.  

---
## Team Git_gud

## ✨ Features  

### 👤 Student Features  
- ✅ **Login Page** - Role-based authentication for students  
- ✅ **ISBN Scanning/Input** - Scan or manually enter ISBN to borrow books  
- ✅ **Book Search** - Search books by title, author, ISBN, or category  
- ✅ **Smart Recommendations** - LLM-powered personalized book suggestions based on reading history  
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

---

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

---

## 🤖 AI-Powered Recommendations  

CampusReads integrates a **Locally Trained LLM Model** to generate smart and personalized book recommendations.  

- Uses **student reading history**, **categories**, and **academic subjects**  
- Provides **context-aware and personalized suggestions**  
- Improves student engagement with **data-driven learning insights**  

---

## 🔧 Email Reminders (Gmail Integration)  

The system includes automated email reminder functionality:  

- **Automatic Detection**: Identifies books that are:  
  - Overdue (past due date)  
  - Due soon (within 5 days)  

- **Manual Trigger**: Librarians can manually send reminders from the Reminders tab  

- **Future Enhancement**: To integrate actual Gmail API:  
  1. Set up Gmail API credentials  
  2. Configure OAuth 2.0  
  3. Update the reminder sending logic in `librarianDashboard.tsx`  

Currently, reminders are logged to the console in demo mode.  

---

## 📊 Features Overview  

### Student Dashboard  
- **My Books**: View borrowed books, due dates, and return functionality  
- **Search**: Comprehensive book search with filters  
- **Recommendations**: Personalized book suggestions via LLM  
- **Analytics**: Reading statistics and insights  

### Librarian Dashboard  
- **Dashboard**: Library statistics and quick actions  
- **Inventory**: Complete catalog management  
- **Transactions**: Recent activity tracking  
- **Reminders**: Overdue book management and email sending  

---

## 🛠️ Technology Stack  

| Layer | Technology | Description |
|-------|-------------|-------------|
| **Frontend** | **React 19 + TypeScript** | Component-based modern UI framework |
| **Styling** | **CSS3 + TailwindCSS** | For fast, modern, and responsive design |
| **Backend** | **Node.js + TypeScript** | Handles app logic, APIs, and communication with Supabase |
| **Database** | **Supabase (PostgreSQL + SQL)** | Cloud-based backend for authentication and data storage |
| **AI Engine** | **Custom Trained LLM Model** | Provides intelligent and context-aware book recommendations |
| **Build Tool** | **Vite** | Lightning-fast build tool for React apps |

---

## 📝 Notes  

- The system uses **Supabase** for authentication and database management  
- **LLM model** enhances book recommendations using user behavior and reading data  
- **ISBN scanning** currently uses a placeholder (can be enhanced with a barcode scanner library)  
- **Email reminders** are in demo mode (ready for Gmail API integration)  
- All core features are fully functional and integrated with Supabase  

---

## 🔐 Authentication  

Users must be registered in **Supabase Auth** with corresponding entries in the `users` table with the correct role (`student` or `librarian`).  

---

## 📄 License  

**MIT License**  

---

**CampusReads** – Smart Library Management for Modern Campuses 📖💡
