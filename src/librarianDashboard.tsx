import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

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
  const [newBook, setNewBook] = useState({
    isbn: '',
    name: '',
    author: '',
    category: '',
    total_copies: ''
  })
  const [showAddBook, setShowAddBook] = useState(false)

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

  // Send reminder emails (mock implementation)
  const sendReminders = async () => {
    try {
      // Get all overdue and due soon books
      const today = new Date()
      const fiveDaysFromNow = new Date()
      fiveDaysFromNow.setDate(today.getDate() + 5)

      const { data: dueSoon, error } = await supabase
        .from('borrowed_books')
        .select('*')
        .eq('returned', false)
        .gte('due_date', today.toISOString())
        .lte('due_date', fiveDaysFromNow.toISOString())

      const overdueCount = overdueBooks.length
      const dueSoonCount = dueSoon?.length || 0

      // In production, this would send actual emails via Gmail API
      alert(`Reminders sent!\nOverdue: ${overdueCount}\nDue Soon (5 days): ${dueSoonCount}\n\n(Currently in demo mode - emails logged to console)`)
      
      // Log what would be sent
      console.log('Would send reminders to:', {
        overdue: overdueBooks.map(b => b.user_email),
        dueSoon: dueSoon?.map(b => b.user_email)
      })
    } catch (error) {
      console.error('Error sending reminders:', error)
      alert('Error sending reminders')
    }
  }

  useEffect(() => {
    loadStats()
    if (activeTab === 'inventory') {
      loadBooks()
    } else if (activeTab === 'transactions') {
      loadTransactions()
    } else if (activeTab === 'reminders') {
      loadOverdue()
    }
  }, [activeTab])

  const userEmail = localStorage.getItem('userEmail')

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2 className="dashboard-title">Librarian Dashboard</h2>
        <p className="welcome-text">Welcome, {userEmail}!</p>
        <button className="logout-button" onClick={() => {
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
          <button className="action-button" onClick={sendReminders}>
            📧 Send Reminders (Gmail)
          </button>
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
            <button className="action-button" onClick={sendReminders}>
              📧 Send Reminders via Gmail
            </button>
          </div>
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
                  <button 
                    className="action-button"
                    onClick={() => handleReturnBook(record.id, record.book_isbn)}
                  >
                    Mark as Returned
                  </button>
                </div>
              )
            })}
          </div>
          {overdueBooks.length === 0 && (
            <p className="empty-message">No overdue books! 🎉</p>
          )}
        </div>
      )}
    </div>
  )
}

export default LibrarianDashboard

