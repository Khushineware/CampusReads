import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

interface Book {
  id: number
  isbn: string
  name: string
  author: string
  category: string
  available_copies: number
}

interface SearchBooksProps {
  onBorrow: (isbn: string) => void
}

export function SearchBooks({ onBorrow }: SearchBooksProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [books, setBooks] = useState<Book[]>([])
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([])

  useEffect(() => {
    loadBooks()
  }, [])

  const loadBooks = async () => {
    try {
      const { data, error } = await supabase
        .from('books')
        .select('*')

      if (!error && data) {
        setBooks(data as Book[])
        setFilteredBooks(data as Book[])
      }
    } catch (error) {
      console.error('Error loading books:', error)
    }
  }

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredBooks(books)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = books.filter(book =>
      book.name.toLowerCase().includes(query) ||
      book.author.toLowerCase().includes(query) ||
      book.isbn.includes(query) ||
      book.category.toLowerCase().includes(query)
    )
    setFilteredBooks(filtered)
  }, [searchQuery, books])

  return (
    <div className="dashboard-section">
      <h3 className="section-title">Search Books</h3>
      <div className="search-box">
        <input
          className="input-field"
          type="text"
          placeholder="Search by book name or enter ISBN..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <p className="search-hint">💡 Tip: You can search by book name or enter an ISBN directly</p>
      </div>
      <div className="books-list">
        {filteredBooks.length === 0 ? (
          <p className="empty-message">No books found</p>
        ) : (
          filteredBooks.map((book) => (
            <div key={book.id} className="book-card">
              <div className="book-info">
                <p><strong>{book.name}</strong></p>
                <p>Author: {book.author}</p>
                <p>ISBN: {book.isbn}</p>
                <p>Category: {book.category}</p>
                <p>Available: {book.available_copies > 0 ? `✅ ${book.available_copies} copies` : '❌ Not available'}</p>
              </div>
              {book.available_copies > 0 && (
                <button
                  className="action-button"
                  onClick={() => onBorrow(book.isbn)}
                >
                  Borrow
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

