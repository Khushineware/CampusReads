# 📚 CampusReads – Smart Library Management System

CampusReads is a modern library management platform designed to simplify workflows for students and librarians. It includes role-based access, fast borrowing tools, real-time inventory, automated reminders, analytics, and personalized book recommendations powered by a custom collaborative filtering model.

---

## 🔑 Demo Login Credentials

**Student Account**  
Email: student@test.edu  
Password: student123  

**Librarian Account**  
Email: librarian@test.edu  
Password: librarian123  

---

## ✨ Features

### 👤 Student Features
- **Secure Login** with role-based access  
- **ISBN Scanning/Input** to borrow books  
- **Search Books** by title, author, ISBN, or category  
- **Personalized Recommendations** via a custom TypeScript collaborative-filtering engine  
- **Reading Analytics** showing habits and favorite categories  
- **Borrow / Return Books** from a dedicated dashboard  
- **Automated Email Reminders** for due and overdue books  

### 👨‍💼 Librarian Features
- **Secure Login** with librarian permissions  
- **Dashboard Overview** with live library statistics  
- **Inventory Management**: add, view, and delete books  
- **Recent Transactions** for quick monitoring  
- **Automated Reminder System** for due/overdue books  
- **Overdue Management** with filters and quick actions  

---

## 📚 How to Use

### Students
1. Log in using the student credentials  
2. Borrow books via ISBN entry or scan  
3. Search and filter books  
4. View personalized recommendations  
5. Track reading stats in the analytics view  

### Librarians
1. Log in using librarian credentials  
2. Manage inventory (add / view / delete)  
3. View recent activities  
4. Monitor overdue books  
5. Send automatic reminders from the reminders panel  

---

## 🤖 Recommendation System

CampusReads includes a collaborative-filtering recommendation algorithm built entirely in **TypeScript**.  
It uses:
- Reading history  
- Book categories  
- Academic interests  

This generates relevant and personalized book suggestions for each student.

---

## 📧 Automated Email Reminders (EmailJS Integration)

The system uses **EmailJS** to send fully functional email reminders.  
It automatically identifies:
- Overdue books  
- Books due within a few days  

Reminders can be triggered directly from the librarian dashboard and are sent in real-time.

---

## 📊 Dashboards Overview

### Student Dashboard
- Borrowed books  
- Due dates  
- Personalized recommendations  
- Reading analytics  

### Librarian Dashboard
- Library statistics  
- Inventory controls  
- Recent transactions  
- Reminder system  
- Overdue management  

---

## 🛠️ Technology Stack

| Layer | Technology | Description |
|-------|-----------|-------------|
| Frontend | React 19 + TypeScript | Component-based modern UI |
| Styling | CSS3 + TailwindCSS | Fast, responsive UI design |
| Backend | Node.js + TypeScript | App logic + API handling |
| Database | Supabase (PostgreSQL) | Auth + data storage |
| Email | EmailJS API | Automated email reminders |
| AI Engine | Custom TS Model | Collaborative filtering recommendations |
| Build Tool | Vite | Dev/build tooling |

---

## 🔐 Authentication

All users must exist in **Supabase Auth** with their correct roles (`student` or `librarian`).  
Demo credentials are provided above for quick access.

---

## 📄 License

**MIT License**

---

**CampusReads — Modern, practical library management.**
