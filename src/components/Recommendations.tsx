import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

interface Book {
  id: number
  isbn: string
  name: string
  author: string
  total_copies: number
  available_copies: number
}

interface RecommendationsProps {
  userEmail: string
  onBorrow?: (isbn: string) => void
}

export function Recommendations({ userEmail, onBorrow }: RecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userEmail) {
      loadRecommendations()
    } else {
      setLoading(false)
    }
  }, [userEmail])

  const loadRecommendations = async () => {
    if (!userEmail) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      // Step 1: Query borrowed_books to get all ISBNs that the current user has borrowed (where returned = false)
      const { data: userBorrows, error: userBorrowsError } = await supabase
        .from('borrowed_books')
        .select('book_isbn')
        .eq('user_email', userEmail)
        .eq('returned', false)

      if (userBorrowsError) {
        console.error('Error fetching user borrows:', userBorrowsError)
        setLoading(false)
        return
      }

      // Handle edge case: user hasn't borrowed any books yet
      if (!userBorrows || userBorrows.length === 0) {
        // Show placeholder recommendations based on popular books
        const placeholderRecs = await loadPlaceholderRecommendations([])
        setRecommendations(placeholderRecs)
        setLoading(false)
        return
      }

      const userBorrowedISBNs = userBorrows.map(b => b.book_isbn)

      // Step 2: Find other users who borrowed the same books (exclude current user)
      const { data: similarBorrows, error: similarBorrowsError } = await supabase
        .from('borrowed_books')
        .select('user_email, book_isbn')
        .in('book_isbn', userBorrowedISBNs)
        .neq('user_email', userEmail)
        .eq('returned', false)

      if (similarBorrowsError) {
        console.error('Error fetching similar borrows:', similarBorrowsError)
        setLoading(false)
        return
      }

      // Handle edge case: no other users borrowed the same books
      if (!similarBorrows || similarBorrows.length === 0) {
        // Fallback to placeholder recommendations based on user's borrowed books
        const placeholderRecs = await loadPlaceholderRecommendations(userBorrowedISBNs)
        setRecommendations(placeholderRecs)
        setLoading(false)
        return
      }

      // Step 3: Get unique list of those other users' emails
      const otherUserEmails = Array.from(new Set(
        similarBorrows.map(b => b.user_email)
      ))

      // Step 4: Query what OTHER books those users borrowed (exclude books current user already has)
      const { data: otherUserBorrows, error: otherUserBorrowsError } = await supabase
        .from('borrowed_books')
        .select('book_isbn')
        .in('user_email', otherUserEmails)
        .eq('returned', false)

      if (otherUserBorrowsError) {
        console.error('Error fetching other users borrows:', otherUserBorrowsError)
        setLoading(false)
        return
      }

      // Handle edge case: no other books found
      if (!otherUserBorrows || otherUserBorrows.length === 0) {
        // Fallback to placeholder recommendations based on user's borrowed books
        const placeholderRecs = await loadPlaceholderRecommendations(userBorrowedISBNs)
        setRecommendations(placeholderRecs)
        setLoading(false)
        return
      }

      // Step 5: Count frequency of each ISBN and sort by most popular
      // Filter out books the user already has
      const isbnFrequency: Record<string, number> = {}
      otherUserBorrows.forEach(borrow => {
        const isbn = borrow.book_isbn
        // Exclude books current user already has
        if (!userBorrowedISBNs.includes(isbn)) {
          isbnFrequency[isbn] = (isbnFrequency[isbn] || 0) + 1
        }
      })

      // Step 6: Get top 5 most frequently borrowed ISBNs
      const sortedISBNs = Object.entries(isbnFrequency)
        .sort((a, b) => b[1] - a[1])
        .map(([isbn]) => isbn)
        .slice(0, 5)

      if (sortedISBNs.length === 0) {
        // Fallback to placeholder recommendations based on user's borrowed books
        const placeholderRecs = await loadPlaceholderRecommendations(userBorrowedISBNs)
        setRecommendations(placeholderRecs)
        setLoading(false)
        return
      }

      // Step 7: Fetch book details from books table for those ISBNs
      const { data: recommendedBooks, error: booksError } = await supabase
        .from('books')
        .select('id, isbn, name, author, total_copies, available_copies')
        .in('isbn', sortedISBNs)
        .gt('available_copies', 0)

      if (booksError) {
        console.error('Error fetching recommended books:', booksError)
        // Fallback to placeholder recommendations
        const placeholderRecs = await loadPlaceholderRecommendations(userBorrowedISBNs)
        setRecommendations(placeholderRecs)
        setLoading(false)
        return
      }

      // Handle null data
      if (!recommendedBooks || recommendedBooks.length === 0) {
        // Fallback to placeholder recommendations
        const placeholderRecs = await loadPlaceholderRecommendations(userBorrowedISBNs)
        setRecommendations(placeholderRecs)
        setLoading(false)
        return
      }

      // Sort by frequency (maintain order from sortedISBNs)
      const sortedBooks = sortedISBNs
        .map(isbn => recommendedBooks.find(book => book.isbn === isbn))
        .filter((book): book is Book => book !== undefined)

      // If we have less than 5 recommendations, add placeholder recommendations
      if (sortedBooks.length < 5) {
        const placeholderRecs = await loadPlaceholderRecommendations(userBorrowedISBNs, sortedBooks.map(b => b.isbn))
        setRecommendations([...sortedBooks, ...placeholderRecs].slice(0, 5))
      } else {
        setRecommendations(sortedBooks)
      }
    } catch (error) {
      console.error('Error loading recommendations:', error)
      // Fallback to placeholder recommendations on error
      try {
        const placeholderRecs = await loadPlaceholderRecommendations([])
        setRecommendations(placeholderRecs)
      } catch (placeholderError) {
        console.error('Error loading placeholder recommendations:', placeholderError)
        setRecommendations([])
      }
      setLoading(false)
    }
  }

  const loadPlaceholderRecommendations = async (userBorrowedISBNs: string[], excludeISBNs: string[] = []): Promise<Book[]> => {
    try {
      const excludeSet = new Set([...userBorrowedISBNs, ...excludeISBNs])

      // If user has borrowed books, get recommendations based on those books
      if (userBorrowedISBNs.length > 0) {
        // Get details of user's borrowed books
        const { data: userBooks, error: userBooksError } = await supabase
          .from('books')
          .select('category, author')
          .in('isbn', userBorrowedISBNs)
          .limit(10)

        if (!userBooksError && userBooks && userBooks.length > 0) {
          // Get categories and authors from user's borrowed books
          const categories = Array.from(new Set(userBooks.map(b => b.category).filter(Boolean)))
          const authors = Array.from(new Set(userBooks.map(b => b.author).filter(Boolean)))

          // Try to find books by same category
          if (categories.length > 0) {
            const { data: categoryBooks, error: categoryError } = await supabase
              .from('books')
              .select('id, isbn, name, author, total_copies, available_copies')
              .in('category', categories)
              .gt('available_copies', 0)
              .limit(20)

            if (!categoryError && categoryBooks && categoryBooks.length > 0) {
              // Filter out excluded ISBNs
              const filtered = categoryBooks.filter(book => !excludeSet.has(book.isbn))
              if (filtered.length > 0) {
                return filtered.slice(0, 5) as Book[]
              }
            }
          }

          // Fallback: try to find books by same author
          if (authors.length > 0) {
            const { data: authorBooks, error: authorError } = await supabase
              .from('books')
              .select('id, isbn, name, author, total_copies, available_copies')
              .in('author', authors)
              .gt('available_copies', 0)
              .limit(20)

            if (!authorError && authorBooks && authorBooks.length > 0) {
              // Filter out excluded ISBNs
              const filtered = authorBooks.filter(book => !excludeSet.has(book.isbn))
              if (filtered.length > 0) {
                return filtered.slice(0, 5) as Book[]
              }
            }
          }
        }
      }

      // Final fallback: Get popular books (most available copies or recently borrowed)
      const { data: popularBooks, error: popularError } = await supabase
        .from('books')
        .select('id, isbn, name, author, total_copies, available_copies')
        .gt('available_copies', 0)
        .order('available_copies', { ascending: false })
        .limit(20)

      if (!popularError && popularBooks) {
        // Filter out excluded ISBNs
        const filtered = popularBooks.filter(book => !excludeSet.has(book.isbn))
        return filtered.slice(0, 5) as Book[]
      }

      return []
    } catch (error) {
      console.error('Error loading placeholder recommendations:', error)
      return []
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
        Loading recommendations...
      </div>
    )
  }

  // Edge case: No recommendations found
  if (recommendations.length === 0) {
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
          Recommended for You
        </h3>
        <p style={{
          padding: '3rem 2rem',
          textAlign: 'center',
          color: '#64748b',
          fontSize: '1rem',
          background: '#ffffff',
          borderRadius: '8px',
          border: '2px dashed #e2e8f0',
          marginTop: '1.5rem'
        }}>
          Borrow more books to get recommendations!
        </p>
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
        marginBottom: '0.5rem',
        paddingBottom: '0.75rem',
        borderBottom: '2px solid #2563eb'
      }}>
        Recommended for You
      </h3>
      <p style={{
        color: '#64748b',
        fontSize: '0.95rem',
        marginBottom: '1.5rem',
        fontStyle: 'italic'
      }}>
        Based on what others who borrowed similar books also read
      </p>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '1.25rem',
        width: '100%'
      }}>
        {recommendations.map((book) => (
          <div
            key={book.id}
            style={{
              background: '#ffffff',
              padding: '1.5rem',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            <div style={{ flex: 1, marginBottom: '1rem' }}>
              <p style={{
                fontSize: '1.1rem',
                fontWeight: 700,
                color: '#1e293b',
                marginBottom: '0.5rem'
              }}>
                {book.name}
              </p>
              <p style={{
                fontSize: '0.875rem',
                color: '#64748b',
                marginBottom: '0.5rem'
              }}>
                <strong>Author:</strong> {book.author}
              </p>
              <p style={{
                fontSize: '0.875rem',
                color: '#64748b',
                marginBottom: '0.5rem'
              }}>
                <strong>ISBN:</strong> {book.isbn}
              </p>
              <p style={{
                fontSize: '0.875rem',
                color: book.available_copies > 0 ? '#10b981' : '#ef4444',
                fontWeight: 600,
                marginTop: '0.5rem'
              }}>
                Available: {book.available_copies > 0 ? `✅ ${book.available_copies} copies` : '❌ Out of stock'}
              </p>
            </div>
            {onBorrow && book.available_copies > 0 && (
              <button
                onClick={() => onBorrow(book.isbn)}
                style={{
                  background: '#2563eb',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  transition: 'background 0.2s',
                  width: '100%'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#1e40af'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#2563eb'
                }}
              >
                Borrow
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
