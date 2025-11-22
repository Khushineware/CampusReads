import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { SearchBooks } from './components/SearchBooks'
import { Analytics } from './components/Analytics'
import { StudentAnalytics } from './components/StudentAnalytics'
import { Recommendations } from './components/Recommendations'
import { CameraScanner } from './components/CameraScanner'

interface BorrowedBook {
  id: number
  user_email: string
  book_isbn: string
  borrow_date: string
  due_date: string
  returned: boolean
  book_name?: string
  book_author?: string
}

function StudentDashboard() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'search' | 'analytics' | 'recommendations'>('dashboard')
  const [isbn, setIsbn] = useState('')
  const [myBooks, setMyBooks] = useState<BorrowedBook[]>([])
  const [showScanner, setShowScanner] = useState(false)
  const userEmail = localStorage.getItem('userEmail')

  // Normalize ISBN - remove spaces, dashes, and convert to string
  const normalizeISBN = (isbn: string): string => {
    return isbn.trim().replace(/[-\s]/g, '')
  }

  // Function to borrow a book (can be called with ISBN)
  const borrowBook = async (isbnToBorrow?: string) => {
    let isbnValue = isbnToBorrow || isbn.trim()
    if (!isbnValue) {
      alert('Please enter or scan an ISBN!')
      return
    }

    // Normalize ISBN (remove spaces and dashes for comparison)
    const normalizedISBN = normalizeISBN(isbnValue)

    try {
      console.log('Attempting to borrow book with ISBN:', { original: isbnValue, normalized: normalizedISBN })
      
      // First, let's try exact match
      let { data: book, error: bookError } = await supabase
        .from('books')
        .select('*')
        .eq('isbn', isbnValue)
        .single()

      console.log('Exact match query result:', { book, bookError })

      // If exact match fails, try normalized match (in case database has normalized ISBNs)
      if (bookError && normalizedISBN !== isbnValue) {
        console.log('Trying normalized ISBN match...')
        const result = await supabase
          .from('books')
          .select('*')
          .eq('isbn', normalizedISBN)
          .single()
        book = result.data
        bookError = result.error
        console.log('Normalized match query result:', { book, bookError })
      }

      // If still not found, try case-insensitive search (in case column type issue)
      if (bookError) {
        console.log('Trying to fetch all books to debug...')
        const { data: allBooks, error: allBooksError } = await supabase
          .from('books')
          .select('*')
          .limit(10)

        console.log('Sample books from database:', { allBooks, allBooksError })
        
        if (allBooks && allBooks.length > 0) {
          // Try to find a match manually
          const foundBook = allBooks.find((b: any) => 
            normalizeISBN(b.isbn || '') === normalizedISBN || 
            b.isbn === isbnValue ||
            b.isbn === normalizedISBN
          )
          
          if (foundBook) {
            book = foundBook
            bookError = null
            console.log('Found book via manual search:', foundBook)
          } else {
            console.log('Available ISBNs in database:', allBooks.map((b: any) => b.isbn))
          }
        }
      }

      if (bookError || !book) {
        // Show more detailed error
        const errorMsg = bookError 
          ? `Book not found! Error: ${bookError.message}\n\nTried searching for: "${isbnValue}"\n\nPlease check:\n1. The ISBN is correct\n2. The book exists in the books table\n3. The column name is "isbn" (case-sensitive)`
          : `Book not found with ISBN: "${isbnValue}"`
        alert(errorMsg)
        setIsbn('')
        return
      }

      if (book.available_copies <= 0) {
        alert('Book not available!')
        setIsbn('')
        return
      }

      // Add to borrowed_books table
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 14) // Due in 14 days

      // Use the actual ISBN from the book record
      const actualISBN = book.isbn || isbnValue

      const { error: borrowError } = await supabase.from('borrowed_books').insert({
        user_email: userEmail,
        book_isbn: actualISBN,
        borrow_date: new Date().toISOString(),
        due_date: dueDate.toISOString(),
        returned: false
      })

      console.log('Borrow insert result:', { borrowError })

      if (borrowError) {
        console.error('Borrow error details:', borrowError)
        alert('Error borrowing book: ' + borrowError.message)
        return
      }

      // Decrease available copies (using actualISBN declared above)
      const { error: updateError } = await supabase
        .from('books')
        .update({ available_copies: book.available_copies - 1 })
        .eq('isbn', actualISBN)

      console.log('Update copies result:', { updateError })

      if (updateError) {
        alert('Error updating book availability: ' + updateError.message)
        return
      }

      alert(`Book "${book.name}" borrowed successfully! Due date: ${dueDate.toLocaleDateString()}`)
      setIsbn('') // Clear the input
      setShowScanner(false)
      loadMyBooks() // Refresh list
      
      // If we're on search/recommendations, refresh those too
      if (activeTab === 'search' || activeTab === 'recommendations') {
        window.location.reload() // Simple refresh for now
      }
    } catch (error) {
      console.error('Unexpected error:', error)
      alert('An unexpected error occurred: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  // Load books borrowed by this student
  const loadMyBooks = async () => {
    if (!userEmail) return
    
    try {
      // First get all borrowed books
      const { data: borrowedBooks, error } = await supabase
        .from('borrowed_books')
        .select('*')
        .eq('user_email', userEmail)
        .eq('returned', false)
        .order('borrow_date', { ascending: false })

      console.log('Loaded borrowed books:', { borrowedBooks, error })

      if (error) {
        console.error('Error loading books:', error)
        return
      }

      if (!borrowedBooks || borrowedBooks.length === 0) {
        setMyBooks([])
        return
      }

      // Now fetch book details for each ISBN from books table
      const isbnList = borrowedBooks.map(bb => bb.book_isbn)
      
      if (isbnList.length > 0) {
      const { data: booksData, error: booksError } = await supabase
        .from('books')
          .select('isbn, name, author')
        .in('isbn', isbnList)

      console.log('Loaded books data:', { booksData, booksError })

        // Create a map of ISBN to book details
        const booksMap = new Map<string, { name: string; author: string }>()
      if (booksData) {
        booksData.forEach(book => {
            booksMap.set(book.isbn, { name: book.name, author: book.author })
        })
      }

        // Combine the data with full book information
        const transformedData = borrowedBooks.map((item: any) => {
          const bookInfo = booksMap.get(item.book_isbn)
          return {
        ...item,
            book_name: bookInfo?.name || 'Unknown Book',
            book_author: bookInfo?.author || 'Unknown Author'
          }
        })

      setMyBooks(transformedData)
      } else {
        setMyBooks(borrowedBooks)
      }
    } catch (error) {
      console.error('Unexpected error loading books:', error)
    }
  }

  // Load books when component loads
  useEffect(() => {
    loadMyBooks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      loadMyBooks()
    } catch (error) {
      console.error('Error returning book:', error)
    }
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="header-left">
      <h2 className="dashboard-title">Student Dashboard</h2>
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
          📚 My Books
        </button>
        <button 
          className={`tab-button ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
          🔍 Search
        </button>
        <button 
          className={`tab-button ${activeTab === 'recommendations' ? 'active' : ''}`}
          onClick={() => setActiveTab('recommendations')}
        >
          ✨ Recommendations
        </button>
        <button 
          className={`tab-button ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          📊 Analytics
        </button>
      </div>

      {/* Dashboard Tab - My Books */}
      {activeTab === 'dashboard' && (
        <>
      <div className="dashboard-section">
        <h3 className="section-title">Borrow a Book</h3>
        <div className="borrow-form">
          <input 
            className="input-field"
            type="text"
                placeholder="Enter or Scan ISBN"
            value={isbn}
            onChange={(e) => setIsbn(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && borrowBook()}
          />
              <button className="action-button" onClick={() => borrowBook()}>Borrow</button>
        </div>
            {!showScanner && (
              <button className="scanner-button" onClick={() => setShowScanner(true)}>
                📷 Use Camera to Scan ISBN
              </button>
            )}
            {showScanner && (
              <CameraScanner 
                onClose={() => setShowScanner(false)}
                onScan={(isbn) => {
                  setIsbn(isbn)
                  setShowScanner(false)
                }}
              />
            )}
      </div>

      <div className="dashboard-section">
        <h3 className="section-title">My Borrowed Books</h3>
        {myBooks.length === 0 ? (
          <p className="empty-message">No books currently borrowed</p>
        ) : (
          <div className="books-list">
                {myBooks.map((book) => {
                  const dueDate = new Date(book.due_date)
                  const today = new Date()
                  const daysLeft = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                  const isOverdue = daysLeft < 0
                  
                  return (
                    <div key={book.id} className={`book-card ${isOverdue ? 'overdue' : daysLeft <= 3 ? 'warning' : ''}`}>
                      <div className="book-info">
                        <p className="book-name"><strong>{book.book_name || 'Unknown Book'}</strong></p>
                        {book.book_author && (
                          <p className="book-author">Author: {book.book_author}</p>
                        )}
                        <p className="book-isbn">ISBN: {book.book_isbn}</p>
                        <p className="book-borrowed">Borrowed: {new Date(book.borrow_date).toLocaleDateString()}</p>
                        <p className={`book-due ${isOverdue ? 'overdue-text' : ''}`}>
                          Due Date: {dueDate.toLocaleDateString()}
                          {isOverdue ? ` ⚠️ ${Math.abs(daysLeft)} days overdue` : daysLeft <= 3 ? ` ⚠️ ${daysLeft} days left` : ` (${daysLeft} days left)`}
                        </p>
                        {isOverdue && (
                          <p className="reminder-note">📧 You will receive email reminders for overdue books</p>
                        )}
                      </div>
                      <button 
                        className="action-button return-button"
                        onClick={() => handleReturnBook(book.id, book.book_isbn)}
                      >
                        Return Book
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Search Tab */}
      {activeTab === 'search' && (
        <SearchBooks onBorrow={borrowBook} />
      )}

      {/* Recommendations Tab */}
      {activeTab === 'recommendations' && (
        <Recommendations userEmail={userEmail || ''} onBorrow={borrowBook} />
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <StudentAnalytics userEmail={userEmail || ''} />
      )}
    </div>
  )
}

export default StudentDashboard
