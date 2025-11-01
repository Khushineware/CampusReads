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

interface RecommendationsProps {
  onBorrow: (isbn: string) => void
}

export function Recommendations({ onBorrow }: RecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const userEmail = localStorage.getItem('userEmail')

  useEffect(() => {
    loadRecommendations()
  }, [])

  const loadRecommendations = async () => {
    if (!userEmail) {
      setLoading(false)
      return
    }

    try {
      // Get user's borrowed books to understand preferences
      const { data: borrows } = await supabase
        .from('borrowed_books')
        .select('book_isbn')
        .eq('user_email', userEmail)

      if (!borrows || borrows.length === 0) {
        // If no history, recommend popular books
        const { data: allBooks } = await supabase
          .from('books')
          .select('*')
          .gt('available_copies', 0)
          .limit(5)

        setRecommendations(allBooks as Book[] || [])
        setLoading(false)
        return
      }

      // Get categories of books user has borrowed
      const isbnList = borrows.map(b => b.book_isbn)
      const { data: userBooks } = await supabase
        .from('books')
        .select('category')
        .in('isbn', isbnList)

      // Find most common category
      const categoryCount: Record<string, number> = {}
      userBooks?.forEach(book => {
        categoryCount[book.category] = (categoryCount[book.category] || 0) + 1
      })

      const favoriteCategory = Object.entries(categoryCount)
        .sort((a, b) => b[1] - a[1])[0]?.[0]

      // Recommend books from same category
      const { data: recommended } = await supabase
        .from('books')
        .select('*')
        .eq('category', favoriteCategory || '')
        .gt('available_copies', 0)
        .not('isbn', 'in', `(${isbnList.join(',')})`)
        .limit(5)

      // If not enough recommendations, add more from other categories
      if (!recommended || recommended.length < 5) {
        const { data: additional } = await supabase
          .from('books')
          .select('*')
          .gt('available_copies', 0)
          .not('isbn', 'in', `(${isbnList.join(',')})`)
          .limit(5 - (recommended?.length || 0))

        setRecommendations([...(recommended || []), ...(additional || [])] as Book[])
      } else {
        setRecommendations(recommended as Book[])
      }
    } catch (error) {
      console.error('Error loading recommendations:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="dashboard-section">Loading recommendations...</div>
  }

  if (recommendations.length === 0) {
    return (
      <div className="dashboard-section">
        <h3 className="section-title">Recommended for You</h3>
        <p className="empty-message">No recommendations available yet. Start borrowing books!</p>
      </div>
    )
  }

  return (
    <div className="dashboard-section">
      <h3 className="section-title">Recommended for You</h3>
      <p className="recommendation-subtitle">Based on your reading history</p>
      <div className="books-list">
        {recommendations.map((book) => (
          <div key={book.id} className="book-card">
            <div className="book-info">
              <p><strong>{book.name}</strong></p>
              <p>Author: {book.author}</p>
              <p>Category: {book.category}</p>
              <p>Available: ✅ {book.available_copies} copies</p>
            </div>
            <button
              className="action-button"
              onClick={() => onBorrow(book.isbn)}
            >
              Borrow
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

