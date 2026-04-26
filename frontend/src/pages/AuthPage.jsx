import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { API_BASE } from '../api'
import './AuthPage.css'

const ROLES = [
  { value: 'Volunteer/Shelter', label: 'Volunteer/Shelter' },
  { value: 'Adopter', label: 'Adopter (Looking for a pet)' },
  { value: 'Seller', label: 'Seller' }
]

function AuthPage({ initialTab = 'login', adminOnly = false, allowedRoles = ['Admin'], adminRedirectPath = '/admin/user-management' }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const returnTo = searchParams.get('returnTo') || '/'
  const { login } = useAuth()
  const [tab, setTab] = useState(adminOnly ? 'login' : initialTab)

  // Sign In state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Register state
  const [name, setName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [role, setRole] = useState('Adopter')
  const [regPassword, setRegPassword] = useState('')
  const [showRegPassword, setShowRegPassword] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)

  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [redirectAfterLogin, setRedirectAfterLogin] = useState('/')
  const [isRegisterSuccess, setIsRegisterSuccess] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if (res.ok) {
        if (adminOnly && !allowedRoles.includes(data.user?.role)) {
          setError(`This login page is only for ${allowedRoles.join(', ')} accounts`)
          return
        }
        login({ ...data.user, token: data.token })
        const isSellerAdmin = data.user?.role === 'SellerAdmin'
        const isAdoptionAdmin = data.user?.role === 'AdoptionAdmin'
        if (adminOnly) {
          navigate(adminRedirectPath, { replace: true })
          return
        }
        if (isSellerAdmin) {
          navigate('/seller-admin', { replace: true })
          return
        }
        if (isAdoptionAdmin) {
          navigate('/adoption-admin', { replace: true })
          return
        }
        setIsRegisterSuccess(false)
        setSuccess(true)
        setMessage('Login Successful!')
        setRedirectAfterLogin(returnTo)
      } else {
        setError(data.message || 'Login failed')
      }
    } catch (err) {
      setError('Could not connect to server')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    if (!agreeTerms) {
      setError('Please agree to Terms of Service and Privacy Policy')
      return
    }

    const trimmedName = name.trim()
    const trimmedEmail = regEmail.trim()
    const pass = regPassword

    if (!trimmedName || !trimmedEmail || !pass) {
      setError('Name, email, and password are required.')
      return
    }

    const needsCapital = /[A-Z]/.test(pass)
    const needsNumber = /[0-9]/.test(pass)
    const needsSymbol = /[^A-Za-z0-9]/.test(pass)
    const minLengthOk = pass.length >= 6

    if (!minLengthOk || !needsCapital || !needsNumber || !needsSymbol) {
      setError('Password must be at least 6 characters and include 1 capital letter, 1 number, and 1 symbol.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName, email: trimmedEmail, password: pass, role })
      })
      const data = await res.json()
      if (res.ok) {
        setIsRegisterSuccess(true)
        setSuccess(true)
        setMessage('Account created! Please sign in.')
        setRedirectAfterLogin('/login')
      } else {
        setError(data.message || 'Registration failed')
      }
    } catch (err) {
      setError('Could not connect to server')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (success) {
      const destination = redirectAfterLogin || returnTo || '/'
      const timer = setTimeout(() => {
        // Registration uses a success overlay first; force a local fallback to login
        // so the UI never gets stuck even if route navigation is delayed.
        if (isRegisterSuccess) {
          setSuccess(false)
          setIsRegisterSuccess(false)
          setTab('login')
          setEmail(regEmail)
          setRegPassword('')
          setError('')
        }
        navigate(destination, { replace: true })
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [success, navigate, returnTo, redirectAfterLogin, isRegisterSuccess, regEmail])

  if (success) {
    return (
      <div className="auth-page success-view">
        <div className="success-box">
          <div className="success-icon">✓</div>
          <h2>{message}</h2>
          <p>{isRegisterSuccess ? 'Redirecting to sign in...' : 'Redirecting...'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <header className="auth-header">
        <Link to="/" className="auth-logo">PetMatch</Link>
        <div className="auth-help">
          <span>Need help?</span>
          <button type="button" className="support-btn">Support</button>
        </div>
      </header>

      <div className="auth-container">
        <div className="auth-left">
          <img src="https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600" alt="Happy dog" />
          <div className="auth-brand-overlay">
            <h2>Find your new best friend today.</h2>
            <p>Join thousands of pet lovers connecting through PetMatch. Your perfect companion is just a few clicks away.</p>
            <div className="social-proof">
              <div className="avatars">
                <span>👤</span><span>👤</span><span>👤</span>
              </div>
              <span>Joined by 10k+ pet lovers</span>
            </div>
          </div>
        </div>

        <div className="auth-right">
          <h1 className="auth-welcome">Welcome to PetMatch</h1>
          <p className="auth-sub">Join our community and help pets find their forever homes.</p>

          <div className="auth-tabs">
            <button
              type="button"
              className={tab === 'login' ? 'tab active' : 'tab'}
              onClick={() => { setTab('login'); setError('') }}
            >
              Sign In
            </button>
            {!adminOnly && (
              <button
                type="button"
                className={tab === 'register' ? 'tab active' : 'tab'}
                onClick={() => { setTab('register'); setError('') }}
              >
                Create Account
              </button>
            )}
          </div>

          {tab === 'login' ? (
            <form onSubmit={handleLogin} className="auth-form">
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <div className="password-wrap">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button type="button" className="eye-btn" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? '🙈' : '👁'}
                  </button>
                </div>
                <Link to="/forgot" className="forgot-link">Forgot password?</Link>
              </div>
              {error && <p className="error-msg">{error}</p>}
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="auth-form">
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>I am a...</label>
                <select value={role} onChange={(e) => setRole(e.target.value)}>
                  {ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Password</label>
                <div className="password-wrap">
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    placeholder="Create a strong password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    minLength={6}
                    required
                  />
                  <button type="button" className="eye-btn" onClick={() => setShowRegPassword(!showRegPassword)}>
                    {showRegPassword ? '🙈' : '👁'}
                  </button>
                </div>
              </div>
              <label className="checkbox-wrap">
                <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} />
                By creating an account, you agree to our{' '}
                <Link to="/terms">Terms of Service</Link> and{' '}
                <Link to="/privacy">Privacy Policy</Link>.
              </label>
              {error && <p className="error-msg">{error}</p>}
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'Creating...' : 'Create Account'}
              </button>
            </form>
          )}
        </div>
      </div>

      <footer className="auth-footer">
        <p>© 2024 PetMatch Platform. All rights reserved.</p>
        <div className="auth-footer-links">
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/contact">Contact</Link>
        </div>
      </footer>
    </div>
  )
}

export default AuthPage
