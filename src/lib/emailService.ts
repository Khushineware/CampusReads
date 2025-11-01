// Email service for sending notifications via EmailJS or Gmail API

interface EmailData {
  to: string
  subject: string
  message: string
  studentName?: string
  bookTitle?: string
  dueDate?: string
  daysLeft?: number
  isOverdue?: boolean
}

class EmailService {
  private static instance: EmailService
  // Permanent EmailJS configuration
  private emailjsServiceId: string = 'service_ugxce6h'
  private emailjsTemplateId: string = 'template_j7w14xq'
  private emailjsPublicKey: string = 'caKYX4F870Uld9Mg8'
  private gmailApiKey: string = ''
  private senderEmail: string = 'libdemo142536@gmail.com'
  private senderName: string = 'CampusReads Library'

  private constructor() {
    // Load custom settings from localStorage (if user wants to override defaults)
    if (typeof window !== 'undefined') {
      const settings = localStorage.getItem('emailSettings')
      if (settings) {
        try {
          const parsed = JSON.parse(settings)
          // Only override defaults if custom values are provided
          if (parsed.emailjsServiceId) this.emailjsServiceId = parsed.emailjsServiceId
          if (parsed.emailjsTemplateId) this.emailjsTemplateId = parsed.emailjsTemplateId
          if (parsed.emailjsPublicKey) this.emailjsPublicKey = parsed.emailjsPublicKey
          if (parsed.gmailApiKey) this.gmailApiKey = parsed.gmailApiKey
          if (parsed.senderEmail) this.senderEmail = parsed.senderEmail
          if (parsed.senderName) this.senderName = parsed.senderName
        } catch (error) {
          console.error('Error loading email settings:', error)
        }
      }
    }
  }

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService()
    }
    return EmailService.instance
  }

  configure(config: {
    emailjsServiceId?: string
    emailjsTemplateId?: string
    emailjsPublicKey?: string
    gmailApiKey?: string
    senderEmail?: string
    senderName?: string
  }) {
    if (config.emailjsServiceId) this.emailjsServiceId = config.emailjsServiceId
    if (config.emailjsTemplateId) this.emailjsTemplateId = config.emailjsTemplateId
    if (config.emailjsPublicKey) this.emailjsPublicKey = config.emailjsPublicKey
    if (config.gmailApiKey) this.gmailApiKey = config.gmailApiKey
    if (config.senderEmail) this.senderEmail = config.senderEmail
    if (config.senderName) this.senderName = config.senderName

    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('emailSettings', JSON.stringify({
        emailjsServiceId: this.emailjsServiceId,
        emailjsTemplateId: this.emailjsTemplateId,
        emailjsPublicKey: this.emailjsPublicKey,
        gmailApiKey: this.gmailApiKey,
        senderEmail: this.senderEmail,
        senderName: this.senderName
      }))
    }
  }

  // Send email using EmailJS (recommended for frontend)
  private async sendViaEmailJS(data: EmailData): Promise<boolean> {
    if (!this.emailjsServiceId || !this.emailjsTemplateId || !this.emailjsPublicKey) {
      throw new Error('EmailJS not configured. Please set up EmailJS in settings.')
    }

    try {
      // Dynamic import to avoid issues if emailjs not installed
      const emailjs = await import('@emailjs/browser')
      
      // Format due date for template
      const formattedDueDate = data.dueDate 
        ? new Date(data.dueDate).toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })
        : ''

      const templateParams = {
        to_email: data.to,
        subject: data.subject,
        message: data.message, // Full formatted message
        student_name: data.studentName || 'Student',
        book_title: data.bookTitle || 'Book',
        due_date: formattedDueDate, // Formatted date (e.g., "Monday, January 15, 2024")
        days_left: data.daysLeft?.toString() || '0',
      }

      await emailjs.send(
        this.emailjsServiceId,
        this.emailjsTemplateId,
        templateParams,
        this.emailjsPublicKey
      )

      return true
    } catch (error) {
      console.error('EmailJS send error:', error)
      throw error
    }
  }

  // Send email via custom backend API (if you have one)
  private async sendViaAPI(data: EmailData): Promise<boolean> {
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: data.to,
          subject: data.subject,
          message: data.message,
          apiKey: this.gmailApiKey,
        }),
      })

      if (!response.ok) {
        throw new Error(`Email API error: ${response.statusText}`)
      }

      return true
    } catch (error) {
      console.error('Email API send error:', error)
      throw error
    }
  }

  // Main send method - tries EmailJS first, falls back to API
  async sendEmail(data: EmailData): Promise<boolean> {
    try {
      // Try EmailJS first (recommended)
      if (this.emailjsServiceId && this.emailjsTemplateId && this.emailjsPublicKey) {
        return await this.sendViaEmailJS(data)
      }
      
      // Fallback to API if EmailJS not configured
      if (this.gmailApiKey) {
        return await this.sendViaAPI(data)
      }

      throw new Error('No email service configured. Please set up EmailJS or Gmail API in settings.')
    } catch (error) {
      console.error('Send email error:', error)
      throw error
    }
  }

  // Send due date reminder
  async sendDueReminder(
    studentEmail: string,
    studentName: string,
    bookTitle: string,
    dueDate: string,
    daysLeft: number
  ): Promise<boolean> {
    const formattedDate = new Date(dueDate).toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
    
    // Determine reminder type based on days left
    let reminderText = ''
    if (daysLeft === 0) {
      reminderText = `is due for return today, ${formattedDate}`
    } else if (daysLeft === 1) {
      reminderText = `is due for return tomorrow, ${formattedDate}`
    } else {
      reminderText = `is due for return on ${formattedDate} (in ${daysLeft} days)`
    }

    const subject = `Reminder: Book Due Soon - ${bookTitle}`
    const message = `Dear ${studentName},

This is a friendly reminder from the CampusReads Library that the book you borrowed — "${bookTitle}" — ${reminderText}.

Please ensure that you return it on time to avoid any late fees and to keep our library resources available for everyone.

If you have already returned the book, please disregard this message.

Thank you for using the CampusReads App!

${this.senderName}`

    return this.sendEmail({
      to: studentEmail,
      subject,
      message,
      studentName,
      bookTitle,
      dueDate,
      daysLeft,
      isOverdue: false
    })
  }

  // Send overdue notice
  async sendOverdueNotice(
    studentEmail: string,
    studentName: string,
    bookTitle: string,
    dueDate: string,
    daysOverdue: number
  ): Promise<boolean> {
    const formattedDueDate = new Date(dueDate).toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })

    const subject = `URGENT: Overdue Book - ${bookTitle}`
    const message = `Dear ${studentName},

This is an urgent reminder from the CampusReads Library that the book you borrowed — "${bookTitle}" — was due on ${formattedDueDate} and is now ${daysOverdue} day(s) overdue.

Please return it as soon as possible to avoid late fees and to keep our library resources available for everyone.

Late fees may apply for overdue books.

If you have already returned the book, please disregard this message.

Thank you for using the CampusReads App!

${this.senderName}`

    return this.sendEmail({
      to: studentEmail,
      subject,
      message,
      studentName,
      bookTitle,
      dueDate,
      daysLeft: -daysOverdue,
      isOverdue: true
    })
  }

  // Send bulk reminders
  async sendBulkReminders(reminders: Array<{
    studentEmail: string
    studentName: string
    bookTitle: string
    dueDate: string
    daysLeft: number
    isOverdue: boolean
  }>): Promise<{ success: number; failed: number; errors: string[] }> {
    let success = 0
    let failed = 0
    const errors: string[] = []

    for (const reminder of reminders) {
      try {
        if (reminder.isOverdue) {
          const daysOverdue = Math.abs(reminder.daysLeft)
          await this.sendOverdueNotice(
            reminder.studentEmail,
            reminder.studentName || reminder.studentEmail,
            reminder.bookTitle,
            reminder.dueDate,
            daysOverdue
          )
        } else {
          await this.sendDueReminder(
            reminder.studentEmail,
            reminder.studentName || reminder.studentEmail,
            reminder.bookTitle,
            reminder.dueDate,
            reminder.daysLeft
          )
        }
        success++
      } catch (error) {
        failed++
        errors.push(`${reminder.studentEmail}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return { success, failed, errors }
  }
}

export const emailService = EmailService.getInstance()

