import { useState, useEffect } from 'react'
import { emailService } from '../lib/emailService'

interface EmailSettingsProps {
  onSave: () => void
}

export function EmailSettings({ onSave }: EmailSettingsProps) {
  const [settings, setSettings] = useState({
    emailjsServiceId: '',
    emailjsTemplateId: '',
    emailjsPublicKey: '',
    gmailApiKey: '',
    senderEmail: '',
    senderName: 'CampusReads Library'
  })
  const [selectedMethod, setSelectedMethod] = useState<'emailjs' | 'gmail'>('emailjs')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [testEmail, setTestEmail] = useState('')

  useEffect(() => {
    // Load saved settings (defaults are pre-configured, but allow customization)
    const saved = localStorage.getItem('emailSettings')
    setSettings({
      emailjsServiceId: 'service_ugxce6h', // Default
      emailjsTemplateId: 'template_j7w14xq', // Default
      emailjsPublicKey: 'caKYX4F870Uld9Mg8', // Default
      gmailApiKey: '',
      senderEmail: 'libdemo142536@gmail.com', // Default
      senderName: 'CampusReads Library'
    })
    
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        // Allow overriding defaults if custom settings exist
        setSettings({
          emailjsServiceId: parsed.emailjsServiceId || 'service_ugxce6h',
          emailjsTemplateId: parsed.emailjsTemplateId || 'template_j7w14xq',
          emailjsPublicKey: parsed.emailjsPublicKey || 'caKYX4F870Uld9Mg8',
          gmailApiKey: parsed.gmailApiKey || '',
          senderEmail: parsed.senderEmail || 'libdemo142536@gmail.com',
          senderName: parsed.senderName || 'CampusReads Library'
        })
        setSelectedMethod(parsed.emailjsServiceId ? 'emailjs' : 'gmail')
      } catch (error) {
        console.error('Error loading settings:', error)
      }
    } else {
      // Pre-configure with defaults
      emailService.configure({
        emailjsServiceId: 'service_ugxce6h',
        emailjsTemplateId: 'template_j7w14xq',
        emailjsPublicKey: 'caKYX4F870Uld9Mg8',
        senderEmail: 'libdemo142536@gmail.com',
        senderName: 'CampusReads Library'
      })
      setSelectedMethod('emailjs')
    }
  }, [])

  const handleSave = () => {
    setSaveStatus('saving')
    try {
      emailService.configure({
        emailjsServiceId: settings.emailjsServiceId,
        emailjsTemplateId: settings.emailjsTemplateId,
        emailjsPublicKey: settings.emailjsPublicKey,
        gmailApiKey: settings.gmailApiKey,
        senderEmail: settings.senderEmail,
        senderName: settings.senderName
      })
      setSaveStatus('success')
      setTimeout(() => {
        setSaveStatus('idle')
        onSave()
      }, 2000)
    } catch (error) {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }

  const handleTestEmail = async () => {
    if (!testEmail) {
      alert('Please enter a test email address')
      return
    }

    try {
      await emailService.sendEmail({
        to: testEmail,
        subject: 'Test Email from CampusReads',
        message: 'This is a test email from CampusReads Library Management System. If you receive this, your email configuration is working correctly!',
      })
      alert('Test email sent successfully!')
    } catch (error) {
      alert(`Failed to send test email: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return (
    <div className="dashboard-section">
      <h3 className="section-title">Email Configuration</h3>

      {/* Method Selection */}
      <div className="method-selection">
        <label>
          <input
            type="radio"
            value="emailjs"
            checked={selectedMethod === 'emailjs'}
            onChange={() => setSelectedMethod('emailjs')}
          />
          EmailJS (Recommended - Easy Setup)
        </label>
        <label>
          <input
            type="radio"
            value="gmail"
            checked={selectedMethod === 'gmail'}
            onChange={() => setSelectedMethod('gmail')}
          />
          Gmail API (Advanced)
        </label>
      </div>

      {/* EmailJS Configuration */}
      {selectedMethod === 'emailjs' && (
        <div className="email-config">
          <h4>EmailJS Setup</h4>
          <p className="config-hint">
            Get your credentials from <a href="https://www.emailjs.com" target="_blank" rel="noopener noreferrer">EmailJS.com</a>
          </p>
          
          <div className="config-input-group">
            <label>EmailJS Service ID</label>
            <input
              className="input-field"
              type="text"
              placeholder="service_xxxxxxxx"
              value={settings.emailjsServiceId}
              onChange={(e) => setSettings({ ...settings, emailjsServiceId: e.target.value })}
            />
          </div>

          <div className="config-input-group">
            <label>EmailJS Template ID</label>
            <input
              className="input-field"
              type="text"
              placeholder="template_xxxxxxxx"
              value={settings.emailjsTemplateId}
              onChange={(e) => setSettings({ ...settings, emailjsTemplateId: e.target.value })}
            />
          </div>

          <div className="config-input-group">
            <label>EmailJS Public Key</label>
            <input
              className="input-field"
              type="text"
              placeholder="xxxxxxxxxxxxx"
              value={settings.emailjsPublicKey}
              onChange={(e) => setSettings({ ...settings, emailjsPublicKey: e.target.value })}
            />
          </div>
        </div>
      )}

      {/* Gmail API Configuration */}
      {selectedMethod === 'gmail' && (
        <div className="email-config">
          <h4>Gmail API Setup</h4>
          <p className="config-hint">
            Configure Gmail API credentials from Google Cloud Console
          </p>
          
          <div className="config-input-group">
            <label>Gmail API Key</label>
            <input
              className="input-field"
              type="password"
              placeholder="AIza..."
              value={settings.gmailApiKey}
              onChange={(e) => setSettings({ ...settings, gmailApiKey: e.target.value })}
            />
          </div>
        </div>
      )}

      {/* Common Settings */}
      <div className="email-config">
        <h4>Sender Information</h4>
        
        <div className="config-input-group">
          <label>Sender Email</label>
          <input
            className="input-field"
            type="email"
            placeholder="library@campus.edu"
            value={settings.senderEmail}
            onChange={(e) => setSettings({ ...settings, senderEmail: e.target.value })}
          />
        </div>

        <div className="config-input-group">
          <label>Sender Name</label>
          <input
            className="input-field"
            type="text"
            placeholder="CampusReads Library"
            value={settings.senderName}
            onChange={(e) => setSettings({ ...settings, senderName: e.target.value })}
          />
        </div>
      </div>

      {/* Test Email */}
      <div className="test-email-section">
        <h4>Test Email</h4>
        <div className="test-email-input">
          <input
            className="input-field"
            type="email"
            placeholder="Enter email to test"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
          />
          <button className="action-button" onClick={handleTestEmail}>
            Send Test Email
          </button>
        </div>
      </div>

      {/* Save Button */}
      <div className="save-section">
        <button
          className="action-button"
          onClick={handleSave}
          disabled={saveStatus === 'saving'}
        >
          {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'success' ? '✅ Saved!' : 'Save Email Settings'}
        </button>
        {saveStatus === 'error' && (
          <p className="error-message">Error saving settings. Please try again.</p>
        )}
      </div>
    </div>
  )
}

