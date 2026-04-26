import { useState } from 'react'
import { Link } from 'react-router-dom'
import { API_BASE } from '../api'
import './ForgotPasswordPage.css'

function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [requestedPassword, setRequestedPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const res = await fetch(`${API_BASE}/api/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, requestedPassword })
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.message || 'Could not submit request')
        return
      }

      setMessage(data.message || 'Request sent for admin approval')
      setEmail('')
      setRequestedPassword('')
    } catch (err) {
      setError('Could not connect to server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="forgot-page">
      <div className="forgot-card">
        <h1>Forgot Password</h1>
        <p>Submit a request with your email and new password. Admin will approve it.</p>

        <form onSubmit={handleSubmit}>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />

          <label>New Password</label>
          <input
            type="password"
            value={requestedPassword}
            onChange={(e) => setRequestedPassword(e.target.value)}
            placeholder="Enter your new password"
            required
          />

          {error && <p className="forgot-error">{error}</p>}
          {message && <p className="forgot-success">{message}</p>}

          <button type="submit" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Request'}
          </button>
        </form>

        <Link to="/login" className="forgot-back-link">Back to Sign In</Link>
      </div>
    </div>
  )
}

export default ForgotPasswordPage
