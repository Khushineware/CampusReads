import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export function BookDebug() {
  const [books, setBooks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadBooks()
  }, [])

  const loadBooks = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data, error: booksError } = await supabase
        .from('books')
        .select('*')

      if (booksError) {
        setError(`Error: ${booksError.message}`)
        console.error('Error loading books:', booksError)
      } else if (data) {
        setBooks(data)
        console.log('Books loaded:', data)
      } else {
        setError('No data returned from books table')
      }
    } catch (err) {
      setError(`Unexpected error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="dashboard-section">Loading books from database...</div>
  }

  return (
    <div className="dashboard-section">
      <h3 className="section-title">🔍 Books Table Debug</h3>
      <button className="action-button" onClick={loadBooks} style={{ marginBottom: '1rem' }}>
        Refresh Books List
      </button>
      
      {error && (
        <div style={{ padding: '1rem', backgroundColor: '#fff5f5', border: '1px solid #dc3545', borderRadius: '8px', marginBottom: '1rem' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {books.length === 0 && !error ? (
        <p className="empty-message">No books found in the database. Please add books first.</p>
      ) : (
        <>
          <p style={{ marginBottom: '1rem', color: '#666' }}>
            Found {books.length} book(s) in the books table:
          </p>
          <div className="books-list">
            {books.map((book, index) => (
              <div key={book.id || index} className="book-card">
                <div className="book-info">
                  <p><strong>ID:</strong> {book.id}</p>
                  <p><strong>ISBN:</strong> <code style={{ backgroundColor: '#f0f0f0', padding: '2px 6px', borderRadius: '4px' }}>{book.isbn || '(empty)'}</code></p>
                  <p><strong>Name:</strong> {book.name || '(empty)'}</p>
                  <p><strong>Author:</strong> {book.author || '(empty)'}</p>
                  <p><strong>Category:</strong> {book.category || '(empty)'}</p>
                  <p><strong>Total Copies:</strong> {book.total_copies ?? '(empty)'}</p>
                  <p><strong>Available Copies:</strong> {book.available_copies ?? '(empty)'}</p>
                  <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.5rem' }}>
                    <strong>ISBN Type:</strong> {typeof book.isbn} | 
                    <strong> Length:</strong> {book.isbn?.length ?? 0} | 
                    <strong> Normalized:</strong> {book.isbn?.replace(/[-\s]/g, '') || 'N/A'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

