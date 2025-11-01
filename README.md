# CampusReads - Smart Library Management System

A modern, responsive web application that simplifies book tracking and reminders for students and library staff.

# Team : Git_gud
members: 1. Khushi Neware
         2. Yash Wandhare
         3. Anshuman Patil
         4. Roopam Zade

## ✨ Features

### 🎨 Design
- **Beautiful Pastel Gradient Theme** - Soft, modern colors that are easy on the eyes
- **Fully Responsive** - Works seamlessly on desktop, tablet, and mobile devices
- **Dark Mode Support** - Comfortable viewing in any lighting condition
- **Smooth Animations** - Polished interactions throughout the app

### 👥 Dual Role System

#### 📚 Student Portal
- **Dashboard Overview** - View borrowed books, due dates, and personalized recommendations
- **Book Search** - Advanced search with filters by category and availability status
- **My Books** - Current loans, borrowing history, and renewal options
- **Reading Analytics** - Interactive charts with reading trends and achievements

#### 👨‍💼 Librarian Portal
- **Dashboard Command Center** - Real-time statistics and recent transactions
- **Inventory Management** - Complete book catalog with add/edit/delete capabilities
- **Issue & Return System** - QR/Barcode scanner using device webcam
- **Advanced Analytics** - Interactive charts showing library usage trends
- **Settings & Configuration** - Gmail API integration and notification preferences

### 📧 Email & Notifications
- Gmail API integration for automated reminders
- In-app notification center with real-time updates
- Customizable email templates
- Automated overdue notices

### 📊 Data Visualization
- Interactive charts powered by Recharts
- Bar, Pie, Line, and Area charts
- Responsive and touch-friendly

## 🚀 Getting Started

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🔑 Demo Credentials

Use any email/password combination to log in. Select your role (Student/Librarian) before signing in.

**Student:** `student@university.edu`  
**Librarian:** `librarian@university.edu`

## 📱 Key Features

✅ Complete authentication with dual roles  
✅ Beautiful pastel gradient UI design  
✅ Real-time notifications system  
✅ QR/Barcode scanning via webcam  
✅ Interactive analytics charts  
✅ Gmail API integration  
✅ Fully responsive mobile design  
✅ Customizable email templates  

## 🛠️ Technology Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **UI Components:** shadcn/ui
- **Charts:** Recharts
- **Icons:** Lucide React
- **Package Manager:** Bun/npm

## 📁 Project Structure

```
src/
├── app/
│   ├── login/              # Authentication
│   ├── student/            # Student portal pages
│   ├── librarian/          # Librarian portal pages
│   └── api/                # API routes
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── charts/             # Chart components
│   ├── DashboardLayout.tsx # Main layout
│   └── NotificationCenter.tsx
└── lib/
    └── emailService.ts     # Email service
```

## 🎯 Usage Guide

### For Students
1. Login with student role
2. Browse and search books
3. View borrowed books and due dates
4. Track reading analytics

### For Librarians
1. Login with librarian role
2. Manage book inventory
3. Issue/return books using QR scanner
4. View library analytics
5. Configure email notifications

### Setting Up Email Notifications
1. Go to Settings → Email API
2. Enter Gmail API credentials
3. Configure notification preferences
4. Customize email templates

## 📈 Future Enhancements

- Real database integration
- Actual Gmail API implementation
- Book reservation system
- Payment gateway for fines
- Mobile app version
- Book reviews and ratings


---

**Built with ❤️ using Next.js, TypeScript, and modern web technologies.**