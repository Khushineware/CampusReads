import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { emailService } from './lib/emailService'
import { checkAndSendReminders } from './lib/autoReminders'

interface Book {
  id: number
  isbn: string
  name: string
  author: string
  category: string
  total_copies: number
  available_copies: number
}

interface BorrowRecord {
  id: number
  user_email: string
  book_isbn: string
  borrow_date: string
  due_date: string
  returned: boolean
  book_name?: string
}

function LibrarianDashboard() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'transactions' | 'reminders'>('dashboard')
  const [books, setBooks] = useState<Book[]>([])
  const [stats, setStats] = useState({
    totalBooks: 0,
    borrowedBooks: 0,
    overdueBooks: 0,
    availableBooks: 0
  })
  const [recentTransactions, setRecentTransactions] = useState<BorrowRecord[]>([])
  const [overdueBooks, setOverdueBooks] = useState<BorrowRecord[]>([])
  const [dueSoonBooks, setDueSoonBooks] = useState<BorrowRecord[]>([])
  const [newBook, setNewBook] = useState({
    isbn: '',
    name: '',
    author: '',
    category: '',
    total_copies: ''
  })
  const [showAddBook, setShowAddBook] = useState(false)
  const [sendingEmails, setSendingEmails] = useState(false)

  // Load dashboard stats
  const loadStats = async () => {
    try {
      // Get all books
      const { data: allBooks, error: booksError } = await supabase
        .from('books')
        .select('*')

      if (!booksError && allBooks) {
        const totalBooks = allBooks.reduce((sum, b) => sum + b.total_copies, 0)
        const availableBooks = allBooks.reduce((sum, b) => sum + b.available_copies, 0)
        const borrowedBooks = totalBooks - availableBooks

        // Get overdue books
        const today = new Date().toISOString()
        const { data: overdue, error: overdueError } = await supabase
          .from('borrowed_books')
          .select('*')
          .eq('returned', false)
          .lt('due_date', today)

        setStats({
          totalBooks,
          borrowedBooks,
          overdueBooks: overdue?.length || 0,
          availableBooks
        })
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  // Load all books
  const loadBooks = async () => {
    try {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .order('name')

      if (!error && data) {
        setBooks(data)
      }
    } catch (error) {
      console.error('Error loading books:', error)
    }
  }

  // Load recent transactions
  const loadTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('borrowed_books')
        .select('*')
        .order('borrow_date', { ascending: false })
        .limit(20)

      if (!error && data) {
        // Get book names
        const isbnList = data.map(b => b.book_isbn)
        const { data: booksData } = await supabase
          .from('books')
          .select('isbn, name')
          .in('isbn', isbnList)

        const booksMap = new Map<string, string>()
        booksData?.forEach(book => {
          booksMap.set(book.isbn, book.name)
        })

        const enriched = data.map(item => ({
          ...item,
          book_name: booksMap.get(item.book_isbn)
        }))

        setRecentTransactions(enriched as BorrowRecord[])
      }
    } catch (error) {
      console.error('Error loading transactions:', error)
    }
  }

  // Load overdue books
  const loadOverdue = async () => {
    try {
      const today = new Date().toISOString()
      const { data, error } = await supabase
        .from('borrowed_books')
        .select('*')
        .eq('returned', false)
        .lt('due_date', today)
        .order('due_date')

      if (!error && data) {
        const isbnList = data.map(b => b.book_isbn)
        const { data: booksData } = await supabase
          .from('books')
          .select('isbn, name')
          .in('isbn', isbnList)

        const booksMap = new Map<string, string>()
        booksData?.forEach(book => {
          booksMap.set(book.isbn, book.name)
        })

        const enriched = data.map(item => ({
          ...item,
          book_name: booksMap.get(item.book_isbn)
        }))

        setOverdueBooks(enriched as BorrowRecord[])
      }
    } catch (error) {
      console.error('Error loading overdue:', error)
    }
  }

  // Load due soon books (within 5 days)
  const loadDueSoon = async () => {
    try {
      const today = new Date()
      const fiveDaysFromNow = new Date()
      fiveDaysFromNow.setDate(today.getDate() + 5)

      const { data, error } = await supabase
        .from('borrowed_books')
        .select('*')
        .eq('returned', false)
        .gte('due_date', today.toISOString())
        .lte('due_date', fiveDaysFromNow.toISOString())
        .order('due_date')

      if (!error && data) {
        const isbnList = data.map(b => b.book_isbn)
        const { data: booksData } = await supabase
          .from('books')
          .select('isbn, name')
          .in('isbn', isbnList)

        const booksMap = new Map<string, string>()
        booksData?.forEach(book => {
          booksMap.set(book.isbn, book.name)
        })

        const enriched = data.map(item => ({
          ...item,
          book_name: booksMap.get(item.book_isbn)
        }))

        setDueSoonBooks(enriched as BorrowRecord[])
      }
    } catch (error) {
      console.error('Error loading due soon:', error)
    }
  }

  // Add new book
  const handleAddBook = async () => {
    if (!newBook.isbn || !newBook.name || !newBook.author || !newBook.total_copies) {
      alert('Please fill all required fields')
      return
    }

    try {
      const { error } = await supabase
        .from('books')
        .insert({
          isbn: newBook.isbn,
          name: newBook.name,
          author: newBook.author,
          category: newBook.category || 'General',
          total_copies: parseInt(newBook.total_copies),
          available_copies: parseInt(newBook.total_copies)
        })

      if (error) {
        alert('Error adding book: ' + error.message)
        return
      }

      alert('Book added successfully!')
      setNewBook({ isbn: '', name: '', author: '', category: '', total_copies: '' })
      setShowAddBook(false)
      loadBooks()
      loadStats()
    } catch (error) {
      console.error('Error adding book:', error)
      alert('An error occurred')
    }
  }

  // Delete book
  const handleDeleteBook = async (isbn: string) => {
    if (!confirm('Are you sure you want to delete this book?')) return

    try {
      const { error } = await supabase
        .from('books')
        .delete()
        .eq('isbn', isbn)

      if (error) {
        alert('Error deleting book: ' + error.message)
        return
      }

      alert('Book deleted successfully!')
      loadBooks()
      loadStats()
    } catch (error) {
      console.error('Error deleting book:', error)
    }
  }

  // Return book
  const handleReturnBook = async (recordId: number, bookIsbn: string) => {
    try {
      // Mark as returned
      const { error: returnError } = await supabase
        .from('borrowed_books')
        .update({ returned: true, return_date: new Date().toISOString() })
        .eq('id', recordId)

      if (returnError) {
        alert('Error returning book: ' + returnError.message)
        return
      }

      // Increase available copies
      const { data: book } = await supabase
        .from('books')
        .select('available_copies')
        .eq('isbn', bookIsbn)
        .single()

      if (book) {
        await supabase
          .from('books')
          .update({ available_copies: book.available_copies + 1 })
          .eq('isbn', bookIsbn)
      }

      alert('Book returned successfully!')
      loadTransactions()
      loadOverdue()
      loadStats()
    } catch (error) {
      console.error('Error returning book:', error)
    }
  }

  // Send reminder emails automatically (all overdue and due soon)
  const sendReminders = async () => {
    if (sendingEmails) return
    
    setSendingEmails(true)
    try {
      // Prepare reminders for overdue books
      const overdueReminders = overdueBooks.map(record => {
        const daysOverdue = Math.floor(
          (new Date().getTime() - new Date(record.due_date).getTime()) / (1000 * 60 * 60 * 24)
        )
        return {
          studentEmail: record.user_email,
          studentName: record.user_email.split('@')[0], // Use email username as name
          bookTitle: record.book_name || record.book_isbn,
          dueDate: record.due_date,
          daysLeft: -daysOverdue,
          isOverdue: true
        }
      })

      // Prepare reminders for due soon books
      const dueSoonReminders = dueSoonBooks.map(record => {
        const today = new Date()
        const dueDate = new Date(record.due_date)
        const daysLeft = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        return {
          studentEmail: record.user_email,
          studentName: record.user_email.split('@')[0],
          bookTitle: record.book_name || record.book_isbn,
          dueDate: record.due_date,
          daysLeft,
          isOverdue: false
        }
      })

      const allReminders = [...overdueReminders, ...dueSoonReminders]

      if (allReminders.length === 0) {
        alert('No reminders to send!')
        setSendingEmails(false)
        return
      }

      // Send bulk reminders
      const result = await emailService.sendBulkReminders(allReminders)

      if (result.failed === 0) {
        alert(`✅ Successfully sent ${result.success} reminder email(s)!`)
      } else {
        alert(`Sent ${result.success} email(s), ${result.failed} failed.\n\nErrors:\n${result.errors.join('\n')}`)
      }

      // Reload to show updated status
      loadOverdue()
      loadDueSoon()
    } catch (error) {
      console.error('Error sending reminders:', error)
      alert(`Error sending reminders: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease check your email configuration in the Email Settings tab.`)
    } finally {
      setSendingEmails(false)
    }
  }

  // Send reminder for a specific book
  const sendIndividualReminder = async (record: BorrowRecord) => {
    try {
      const today = new Date()
      const dueDate = new Date(record.due_date)
      const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      const isOverdue = daysDiff < 0
      const daysLeft = Math.abs(daysDiff)

      if (isOverdue) {
        await emailService.sendOverdueNotice(
          record.user_email,
          record.user_email.split('@')[0],
          record.book_name || record.book_isbn,
          record.due_date,
          daysLeft
        )
      } else {
        await emailService.sendDueReminder(
          record.user_email,
          record.user_email.split('@')[0],
          record.book_name || record.book_isbn,
          record.due_date,
          daysLeft
        )
      }

      alert(`Reminder sent successfully to ${record.user_email}!`)
    } catch (error) {
      console.error('Error sending individual reminder:', error)
      alert(`Failed to send reminder: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Initialize email service with environment variables on component mount
  useEffect(() => {
    // Configure email service from environment variables
    emailService.configure({
      emailjsServiceId: import.meta.env.VITE_EMAILJS_SERVICE_ID,
      emailjsTemplateId: import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
      emailjsPublicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
      senderEmail: import.meta.env.VITE_SENDER_EMAIL,
      senderName: 'CampusReads Library'
    })
  }, [])

  useEffect(() => {
    loadStats()
    if (activeTab === 'inventory') {
      loadBooks()
    } else if (activeTab === 'transactions') {
      loadTransactions()
    } else if (activeTab === 'reminders') {
      loadOverdue()
      loadDueSoon()
    }
  }, [activeTab])

  const userEmail = localStorage.getItem('userEmail')

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="header-left">
          <h2 className="dashboard-title">Librarian Dashboard</h2>
          <p className="welcome-text">Welcome, {userEmail}!</p>
        </div>
        <button className="logout-button" onClick={async () => {
          await supabase.auth.signOut()
          localStorage.clear()
          window.location.reload()
        }}>
          Logout
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="tabs">
        <button 
          className={`tab-button ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          📊 Dashboard
        </button>
        <button 
          className={`tab-button ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          📚 Inventory
        </button>
        <button 
          className={`tab-button ${activeTab === 'transactions' ? 'active' : ''}`}
          onClick={() => setActiveTab('transactions')}
        >
          🔄 Transactions
        </button>
        <button 
          className={`tab-button ${activeTab === 'reminders' ? 'active' : ''}`}
          onClick={() => setActiveTab('reminders')}
        >
          📧 Reminders
        </button>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="dashboard-section">
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Total Books</h3>
              <p className="stat-number">{stats.totalBooks}</p>
            </div>
            <div className="stat-card">
              <h3>Borrowed</h3>
              <p className="stat-number">{stats.borrowedBooks}</p>
            </div>
            <div className="stat-card">
              <h3>Available</h3>
              <p className="stat-number">{stats.availableBooks}</p>
            </div>
            <div className="stat-card overdue">
              <h3>Overdue</h3>
              <p className="stat-number">{stats.overdueBooks}</p>
            </div>
          </div>
          <button 
            className="action-button" 
            onClick={sendReminders}
            disabled={sendingEmails}
            style={{ marginTop: '1.5rem' }}
          >
            {sendingEmails ? '📧 Sending Reminders...' : '📧 Send All Reminders'}
          </button>
          <p style={{ marginTop: '1rem', color: '#666', fontSize: '0.9rem' }}>
            This will send reminders to all students with overdue or due soon books.
          </p>
        </div>
      )}

      {/* Inventory Tab */}
      {activeTab === 'inventory' && (
        <div className="dashboard-section">
          <div className="section-header">
            <h3 className="section-title">Book Inventory</h3>
            <button className="action-button" onClick={() => setShowAddBook(!showAddBook)}>
              {showAddBook ? 'Cancel' : '+ Add New Book'}
            </button>
          </div>

          {showAddBook && (
            <div className="add-book-form">
              <input
                className="input-field"
                placeholder="ISBN *"
                value={newBook.isbn}
                onChange={(e) => setNewBook({ ...newBook, isbn: e.target.value })}
              />
              <input
                className="input-field"
                placeholder="Book Title *"
                value={newBook.name}
                onChange={(e) => setNewBook({ ...newBook, name: e.target.value })}
              />
              <input
                className="input-field"
                placeholder="Author *"
                value={newBook.author}
                onChange={(e) => setNewBook({ ...newBook, author: e.target.value })}
              />
              <input
                className="input-field"
                placeholder="Category"
                value={newBook.category}
                onChange={(e) => setNewBook({ ...newBook, category: e.target.value })}
              />
              <input
                className="input-field"
                type="number"
                placeholder="Total Copies *"
                value={newBook.total_copies}
                onChange={(e) => setNewBook({ ...newBook, total_copies: e.target.value })}
              />
              <button className="action-button" onClick={handleAddBook}>
                Add Book
              </button>
            </div>
          )}

          <div className="books-list">
            {books.map((book) => (
              <div key={book.id} className="book-card">
                <div className="book-info">
                  <p><strong>{book.name}</strong></p>
                  <p>Author: {book.author}</p>
                  <p>ISBN: {book.isbn}</p>
                  <p>Category: {book.category}</p>
                  <p>Available: {book.available_copies} / {book.total_copies}</p>
                </div>
                <button 
                  className="delete-button"
                  onClick={() => handleDeleteBook(book.isbn)}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <div className="dashboard-section">
          <h3 className="section-title">Recent Borrow/Return Transactions</h3>
          <div className="transactions-list">
            {recentTransactions.map((record) => (
              <div key={record.id} className="transaction-card">
                <div className="transaction-info">
                  <p><strong>{record.book_name || record.book_isbn}</strong></p>
                  <p>Student: {record.user_email}</p>
                  <p>Borrowed: {new Date(record.borrow_date).toLocaleDateString()}</p>
                  <p>Due: {new Date(record.due_date).toLocaleDateString()}</p>
                  <p>Status: {record.returned ? '✅ Returned' : '⏳ Borrowed'}</p>
                </div>
                {!record.returned && (
                  <button 
                    className="action-button"
                    onClick={() => handleReturnBook(record.id, record.book_isbn)}
                  >
                    Mark as Returned
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reminders Tab */}
      {activeTab === 'reminders' && (
        <div className="dashboard-section">
          <div className="section-header">
            <h3 className="section-title">Overdue Books & Reminders</h3>
            <button 
              className="action-button" 
              onClick={sendReminders}
              disabled={sendingEmails}
            >
              {sendingEmails ? '📧 Sending...' : '📧 Send All Reminders'}
            </button>
          </div>

          {/* Overdue Books Section */}
          {overdueBooks.length > 0 && (
            <div>
              <h4 className="subsection-title">⚠️ Overdue Books ({overdueBooks.length})</h4>
              <div className="overdue-list">
                {overdueBooks.map((record) => {
                  const daysOverdue = Math.floor(
                    (new Date().getTime() - new Date(record.due_date).getTime()) / (1000 * 60 * 60 * 24)
                  )
                  return (
                    <div key={record.id} className="overdue-card">
                      <div className="overdue-info">
                        <p><strong>{record.book_name || record.book_isbn}</strong></p>
                        <p>Student: {record.user_email}</p>
                        <p>Due Date: {new Date(record.due_date).toLocaleDateString()}</p>
                        <p className="overdue-days">⚠️ {daysOverdue} days overdue</p>
                      </div>
                      <div className="card-actions">
                        <button 
                          className="action-button email-button"
                          onClick={() => sendIndividualReminder(record)}
                          title="Send reminder email"
                        >
                          📧 Send Email
                        </button>
                        <button 
                          className="action-button return-button"
                          onClick={() => handleReturnBook(record.id, record.book_isbn)}
                        >
                          Mark as Returned
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Due Soon Books Section */}
          {dueSoonBooks.length > 0 && (
            <div style={{ marginTop: '2rem' }}>
              <h4 className="subsection-title">⏰ Due Soon (Within 5 Days) ({dueSoonBooks.length})</h4>
              <div className="overdue-list">
                {dueSoonBooks.map((record) => {
                  const today = new Date()
                  const dueDate = new Date(record.due_date)
                  const daysLeft = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                  return (
                    <div key={record.id} className="book-card warning">
                      <div className="overdue-info">
                        <p><strong>{record.book_name || record.book_isbn}</strong></p>
                        <p>Student: {record.user_email}</p>
                        <p>Due Date: {dueDate.toLocaleDateString()}</p>
                        <p className="overdue-days">⏰ {daysLeft} day(s) left</p>
                      </div>
                      <div className="card-actions">
                        <button 
                          className="action-button email-button"
                          onClick={() => sendIndividualReminder(record)}
                          title="Send reminder email"
                        >
                          📧 Send Reminder
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {overdueBooks.length === 0 && dueSoonBooks.length === 0 && (
            <p className="empty-message">No overdue or due soon books! 🎉</p>
          )}
        </div>
      )}

    </div>
  )
}

export default LibrarianDashboard

