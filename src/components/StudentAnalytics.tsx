import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

interface Book {
  id: number
  isbn: string
  name: string
  author: string
  category: string
}

interface BorrowedBook {
  id: number
  user_email: string
  book_isbn: string
  borrow_date: string
  due_date: string
  returned: boolean
}

interface ReadingHistoryItem {
  bookTitle: string
  author: string
  borrowDate: string
  dueDate: string
  returned: boolean
}

interface StudentAnalyticsProps {
  userEmail: string
}

export function StudentAnalytics({ userEmail }: StudentAnalyticsProps) {
  const [loading, setLoading] = useState(true)
  const [totalBooks, setTotalBooks] = useState(0)
  const [currentlyReading, setCurrentlyReading] = useState(0)
  const [favoriteGenre, setFavoriteGenre] = useState<string>('N/A')
  const [booksThisMonth, setBooksThisMonth] = useState(0)
  const [readingHistory, setReadingHistory] = useState<ReadingHistoryItem[]>([])

  useEffect(() => {
    if (userEmail) {
      loadAnalytics()
    } else {
      setLoading(false)
    }
  }, [userEmail])

  const loadAnalytics = async () => {
    if (!userEmail) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      // 1. Total books ever borrowed (count all records for this user)
      const { data: allBorrows, error: allBorrowsError } = await supabase
        .from('borrowed_books')
        .select('id')
        .eq('user_email', userEmail)

      if (allBorrowsError) {
        console.error('Error fetching total borrows:', allBorrowsError)
      } else {
        setTotalBooks(allBorrows?.length || 0)
      }

      // 2. Currently reading (count where returned = false)
      const { data: currentBorrows, error: currentBorrowsError } = await supabase
        .from('borrowed_books')
        .select('id')
        .eq('user_email', userEmail)
        .eq('returned', false)

      if (currentBorrowsError) {
        console.error('Error fetching current borrows:', currentBorrowsError)
      } else {
        setCurrentlyReading(currentBorrows?.length || 0)
      }

      // 3. Favorite genre (query books table joined with borrowed_books, count by genre/category)
      const { data: borrowedWithBooks, error: booksError } = await supabase
        .from('borrowed_books')
        .select('book_isbn')
        .eq('user_email', userEmail)

      if (!booksError && borrowedWithBooks && borrowedWithBooks.length > 0) {
        const isbnList = borrowedWithBooks.map(b => b.book_isbn)
        
        const { data: books, error: booksDataError } = await supabase
          .from('books')
          .select('category')
          .in('isbn', isbnList)

        if (!booksDataError && books && books.length > 0) {
          // Count by category/genre
          const genreCount: Record<string, number> = {}
          books.forEach(book => {
            const genre = book.category || 'Uncategorized'
            genreCount[genre] = (genreCount[genre] || 0) + 1
          })

          // Find most common genre
          const sortedGenres = Object.entries(genreCount)
            .sort((a, b) => b[1] - a[1])

          if (sortedGenres.length > 0) {
            setFavoriteGenre(sortedGenres[0][0])
          }
        }
      }

      // 4. Books borrowed this month (count where borrow_date is in current month)
      const now = new Date()
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

      const { data: monthBorrows, error: monthBorrowsError } = await supabase
        .from('borrowed_books')
        .select('id')
        .eq('user_email', userEmail)
        .gte('borrow_date', firstDayOfMonth.toISOString())
        .lte('borrow_date', lastDayOfMonth.toISOString())

      if (monthBorrowsError) {
        console.error('Error fetching month borrows:', monthBorrowsError)
      } else {
        setBooksThisMonth(monthBorrows?.length || 0)
      }

      // 5. Reading history: Show list of last 5 borrowed books with titles and dates
      const { data: recentBorrows, error: recentBorrowsError } = await supabase
        .from('borrowed_books')
        .select('book_isbn, borrow_date, due_date, returned')
        .eq('user_email', userEmail)
        .order('borrow_date', { ascending: false })
        .limit(5)

      if (!recentBorrowsError && recentBorrows && recentBorrows.length > 0) {
        const isbnList = recentBorrows.map(b => b.book_isbn)
        
        const { data: booksData, error: booksHistoryError } = await supabase
          .from('books')
          .select('isbn, name, author')
          .in('isbn', isbnList)

        if (!booksHistoryError && booksData) {
          const booksMap = new Map<string, { name: string; author: string }>()
          booksData.forEach(book => {
            booksMap.set(book.isbn, { name: book.name, author: book.author })
          })

          const history: ReadingHistoryItem[] = recentBorrows.map(borrow => {
            const bookInfo = booksMap.get(borrow.book_isbn)
            return {
              bookTitle: bookInfo?.name || borrow.book_isbn,
              author: bookInfo?.author || 'Unknown',
              borrowDate: borrow.borrow_date,
              dueDate: borrow.due_date,
              returned: borrow.returned
            }
          })

          setReadingHistory(history)
        }
      }
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        color: '#64748b',
        fontSize: '1rem'
      }}>
        Loading analytics...
      </div>
    )
  }

  // Edge case: No borrowed books yet
  if (totalBooks === 0) {
    return (
      <div style={{
        padding: '2rem',
        borderRadius: '8px',
        background: '#f8fafc',
        border: '1px solid #e2e8f0'
      }}>
        <h3 style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          color: '#1e293b',
          marginBottom: '0.5rem',
          paddingBottom: '0.75rem',
          borderBottom: '2px solid #2563eb'
        }}>
          Reading Analytics
        </h3>
        <div style={{
          padding: '3rem 2rem',
          textAlign: 'center',
          color: '#64748b',
          fontSize: '1rem',
          background: '#ffffff',
          borderRadius: '8px',
          border: '2px dashed #e2e8f0',
          marginTop: '1.5rem'
        }}>
          No reading data available yet. Start borrowing books to see your reading statistics!
        </div>
      </div>
    )
  }

  return (
    <div style={{
      padding: '2rem',
      borderRadius: '8px',
      background: '#f8fafc',
      border: '1px solid #e2e8f0'
    }}>
      <h3 style={{
        fontSize: '1.5rem',
        fontWeight: 700,
        color: '#1e293b',
        marginBottom: '1.5rem',
        paddingBottom: '0.75rem',
        borderBottom: '2px solid #2563eb'
      }}>
        Reading Analytics
      </h3>

      {/* Stats Grid */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1.25rem',
        marginBottom: '2rem',
        width: '100%'
      }}>
        {/* Total Books Card */}
        <div style={{
          flex: '1 1 200px',
          background: '#ffffff',
          padding: '1.5rem',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '2rem',
            fontWeight: 700,
            color: '#2563eb',
            marginBottom: '0.5rem'
          }}>
            {totalBooks}
          </div>
          <div style={{
            fontSize: '0.875rem',
            color: '#64748b',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Total Books Borrowed
          </div>
        </div>

        {/* Currently Reading Card */}
        <div style={{
          flex: '1 1 200px',
          background: '#ffffff',
          padding: '1.5rem',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '2rem',
            fontWeight: 700,
            color: '#10b981',
            marginBottom: '0.5rem'
          }}>
            {currentlyReading}
          </div>
          <div style={{
            fontSize: '0.875rem',
            color: '#64748b',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Currently Reading
          </div>
        </div>

        {/* Favorite Genre Card */}
        <div style={{
          flex: '1 1 200px',
          background: '#ffffff',
          padding: '1.5rem',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#f59e0b',
            marginBottom: '0.5rem'
          }}>
            {favoriteGenre}
          </div>
          <div style={{
            fontSize: '0.875rem',
            color: '#64748b',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Favorite Genre
          </div>
        </div>

        {/* Books This Month Card */}
        <div style={{
          flex: '1 1 200px',
          background: '#ffffff',
          padding: '1.5rem',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '2rem',
            fontWeight: 700,
            color: '#8b5cf6',
            marginBottom: '0.5rem'
          }}>
            {booksThisMonth}
          </div>
          <div style={{
            fontSize: '0.875rem',
            color: '#64748b',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Books This Month
          </div>
        </div>
      </div>

      {/* Reading History */}
      {readingHistory.length > 0 && (
        <div style={{
          background: '#ffffff',
          padding: '1.5rem',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <h4 style={{
            fontSize: '1.125rem',
            fontWeight: 600,
            color: '#1e293b',
            marginBottom: '1rem',
            paddingBottom: '0.5rem',
            borderBottom: '1px solid #e2e8f0'
          }}>
            Recent Reading History
          </h4>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            {readingHistory.map((item, index) => (
              <div
                key={index}
                style={{
                  padding: '1rem',
                  background: '#f8fafc',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0'
                }}
              >
                <div style={{
                  fontSize: '1rem',
                  fontWeight: 600,
                  color: '#1e293b',
                  marginBottom: '0.5rem'
                }}>
                  {item.bookTitle}
                </div>
                <div style={{
                  fontSize: '0.875rem',
                  color: '#64748b',
                  marginBottom: '0.5rem'
                }}>
                  by {item.author}
                </div>
                <div style={{
                  display: 'flex',
                  gap: '1rem',
                  fontSize: '0.875rem',
                  color: '#64748b',
                  flexWrap: 'wrap'
                }}>
                  <span>
                    <strong>Borrowed:</strong> {new Date(item.borrowDate).toLocaleDateString()}
                  </span>
                  <span>
                    <strong>Due:</strong> {new Date(item.dueDate).toLocaleDateString()}
                  </span>
                  <span style={{
                    color: item.returned ? '#10b981' : '#f59e0b',
                    fontWeight: 600
                  }}>
                    {item.returned ? '✅ Returned' : '📖 Currently Reading'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

