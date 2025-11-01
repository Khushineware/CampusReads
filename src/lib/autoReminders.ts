// Automatic reminder checking service
// This can be called periodically to check for due/overdue books

import { supabase } from '../supabaseClient'
import { emailService } from './emailService'

interface ReminderBook {
  id: number
  user_email: string
  book_isbn: string
  due_date: string
  book_name?: string
}

export async function checkAndSendReminders(): Promise<{
  overdueCount: number
  dueSoonCount: number
  sentCount: number
  failedCount: number
}> {
  try {
    const today = new Date()
    const fiveDaysFromNow = new Date()
    fiveDaysFromNow.setDate(today.getDate() + 5)

    // Get overdue books
    const { data: overdueData } = await supabase
      .from('borrowed_books')
      .select('*')
      .eq('returned', false)
      .lt('due_date', today.toISOString())
      .order('due_date')

    // Get due soon books
    const { data: dueSoonData } = await supabase
      .from('borrowed_books')
      .select('*')
      .eq('returned', false)
      .gte('due_date', today.toISOString())
      .lte('due_date', fiveDaysFromNow.toISOString())
      .order('due_date')

    // Get book names
    const allIsbns = [
      ...(overdueData?.map(b => b.book_isbn) || []),
      ...(dueSoonData?.map(b => b.book_isbn) || [])
    ]

    const { data: booksData } = await supabase
      .from('books')
      .select('isbn, name')
      .in('isbn', [...new Set(allIsbns)])

    const booksMap = new Map<string, string>()
    booksData?.forEach(book => {
      booksMap.set(book.isbn, book.name)
    })

    // Prepare reminders
    const overdueReminders = (overdueData || []).map(record => {
      const daysOverdue = Math.floor(
        (today.getTime() - new Date(record.due_date).getTime()) / (1000 * 60 * 60 * 24)
      )
      return {
        studentEmail: record.user_email,
        studentName: record.user_email.split('@')[0],
        bookTitle: booksMap.get(record.book_isbn) || record.book_isbn,
        dueDate: record.due_date,
        daysLeft: -daysOverdue,
        isOverdue: true
      }
    })

    const dueSoonReminders = (dueSoonData || []).map(record => {
      const dueDate = new Date(record.due_date)
      const daysLeft = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return {
        studentEmail: record.user_email,
        studentName: record.user_email.split('@')[0],
        bookTitle: booksMap.get(record.book_isbn) || record.book_isbn,
        dueDate: record.due_date,
        daysLeft,
        isOverdue: false
      }
    })

    const allReminders = [...overdueReminders, ...dueSoonReminders]

    if (allReminders.length === 0) {
      return { overdueCount: 0, dueSoonCount: 0, sentCount: 0, failedCount: 0 }
    }

    // Send reminders
    const result = await emailService.sendBulkReminders(allReminders)

    return {
      overdueCount: overdueReminders.length,
      dueSoonCount: dueSoonReminders.length,
      sentCount: result.success,
      failedCount: result.failed
    }
  } catch (error) {
    console.error('Auto reminder check error:', error)
    throw error
  }
}

// Auto-run reminders check (optional - can be called manually or set up as cron job)
export function startAutoReminderCheck(intervalMinutes: number = 60) {
  // Check immediately
  checkAndSendReminders().catch(console.error)

  // Then check periodically
  const interval = setInterval(() => {
    checkAndSendReminders().catch(console.error)
  }, intervalMinutes * 60 * 1000)

  // Return cleanup function
  return () => clearInterval(interval)
}

