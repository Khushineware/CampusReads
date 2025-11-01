import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

interface AnalyticsData {
  totalBorrowed: number
  totalReturned: number
  favoriteCategories: { category: string; count: number }[]
  averageReadingDays: number
}

export function Analytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalBorrowed: 0,
    totalReturned: 0,
    favoriteCategories: [],
    averageReadingDays: 0
  })
  const [loading, setLoading] = useState(true)
  const userEmail = localStorage.getItem('userEmail')

  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async () => {
    if (!userEmail) return

    try {
      // Get all borrow records for this user
      const { data: borrows, error } = await supabase
        .from('borrowed_books')
        .select('*')
        .eq('user_email', userEmail)

      if (error || !borrows) {
        setLoading(false)
        return
      }

      const totalBorrowed = borrows.length
      const totalReturned = borrows.filter(b => b.returned).length

      // Get book categories
      const isbnList = borrows.map(b => b.book_isbn)
      const { data: books } = await supabase
        .from('books')
        .select('isbn, category')
        .in('isbn', isbnList)

      // Calculate favorite categories
      const categoryCount: Record<string, number> = {}
      books?.forEach(book => {
        categoryCount[book.category] = (categoryCount[book.category] || 0) + 1
      })

      const favoriteCategories = Object.entries(categoryCount)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      // Calculate average reading days
      let totalDays = 0
      let count = 0
      borrows.forEach(borrow => {
        if (borrow.returned && borrow.return_date) {
          const borrowDate = new Date(borrow.borrow_date)
          const returnDate = new Date(borrow.return_date)
          const days = (returnDate.getTime() - borrowDate.getTime()) / (1000 * 60 * 60 * 24)
          totalDays += days
          count++
        }
      })

      setAnalytics({
        totalBorrowed,
        totalReturned,
        favoriteCategories,
        averageReadingDays: count > 0 ? Math.round(totalDays / count) : 0
      })
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="dashboard-section">Loading analytics...</div>
  }

  return (
    <div className="dashboard-section">
      <h3 className="section-title">Reading Analytics</h3>
      
      <div className="stats-grid">
        <div className="stat-card">
          <h4>Total Books Borrowed</h4>
          <p className="stat-number">{analytics.totalBorrowed}</p>
        </div>
        <div className="stat-card">
          <h4>Books Read</h4>
          <p className="stat-number">{analytics.totalReturned}</p>
        </div>
        <div className="stat-card">
          <h4>Avg Reading Time</h4>
          <p className="stat-number">{analytics.averageReadingDays} days</p>
        </div>
      </div>

      {analytics.favoriteCategories.length > 0 && (
        <div className="favorite-categories">
          <h4>Favorite Categories</h4>
          <div className="categories-list">
            {analytics.favoriteCategories.map((cat, idx) => (
              <div key={idx} className="category-item">
                <span className="category-name">{cat.category}</span>
                <span className="category-count">{cat.count} books</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

