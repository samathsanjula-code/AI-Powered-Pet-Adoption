import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { SuperAdminNavLinks } from '../components/SuperAdminNav'
import { isSuperAdminAccount } from '../utils/superAdminNav'
import { API_BASE } from '../api'
import './AdoptionFormPage.css'

const DEFAULT_PET_CLIPART = 'https://img.freepik.com/free-vector/group-cute-smiley-pets_23-2148512151.jpg?semt=ais_hybrid&w=740&q=80'
const PHONE_PATTERN = /^\d{10}$/

function formatAgeMonths(ageMonths) {
  const m = Number(ageMonths)
  if (!Number.isFinite(m) || m <= 0) return '—'
  const years = Math.floor(m / 12)
  const months = m % 12
  if (years > 0 && months > 0) return `${years}y ${months}m`
  if (years > 0) return `${years}y`
  return `${months}m`
}

function getPetImageSrc(pet) {
  if (pet?.imagePaths && pet.imagePaths[0]) return `${API_BASE}${pet.imagePaths[0]}`
  if (pet?.imageLocation) return pet.imageLocation
  return DEFAULT_PET_CLIPART
}

function AdoptionFormPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const petId = searchParams.get('petId')
  const { user } = useAuth()

  const [pet, setPet] = useState(null)
  const [applicationId, setApplicationId] = useState('')
  const [applicantName, setApplicantName] = useState(user?.name || '')
  const [applicantEmail, setApplicantEmail] = useState(user?.email || '')
  const [applicantPhone, setApplicantPhone] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [submittedId, setSubmittedId] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (petId) {
      fetchPet()
      fetchPreviewId()
    } else {
      setLoading(false)
      setError('No pet selected. Go to Pet Search and click Adopt on a pet.')
    }
  }, [petId])

  const fetchPet = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/pets/${petId}`)
      if (res.ok) {
        const data = await res.json()
        setPet(data)
      }
    } catch (e) {}
    setLoading(false)
  }

  const fetchPreviewId = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/adoption-applications/preview-id`)
      if (res.ok) {
        const data = await res.json()
        setApplicationId(data.applicationId || '')
      } else {
        setApplicationId('APP-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Math.random().toString(36).slice(2, 6).toUpperCase())
      }
    } catch (e) {
      setApplicationId('APP-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Math.random().toString(36).slice(2, 6).toUpperCase())
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!petId || !applicantName.trim() || !applicantEmail.trim()) {
      setError('Name and email are required.')
      return
    }
    const phone = applicantPhone.trim()
    if (phone && !PHONE_PATTERN.test(phone)) {
      setError('Phone number must be exactly 10 digits')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`${API_BASE}/api/adoption-applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          petId: Number(petId),
          applicantName: applicantName.trim(),
          applicantEmail: applicantEmail.trim(),
          applicantPhone: applicantPhone.trim(),
          message: message.trim(),
          userId: user?.id || null
        })
      })
      const data = await res.json()
      if (res.ok && data.applicationId) {
        setSubmittedId(data.applicationId)
        setSuccess(true)
      } else {
        setError(data.message || 'Submission failed')
      }
    } catch (err) {
      setError('Could not submit. Ensure the backend is running.')
    }
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="adoption-form-page">
        <div className="adoption-form-loading">Loading...</div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="adoption-form-page">
        <header className="adoption-form-header">
          <Link to="/" className="adoption-form-logo">PetMatch</Link>
          <nav>
            {user && isSuperAdminAccount(user) ? (
              <SuperAdminNavLinks />
            ) : (
              <>
                <Link to="/pet-search">Pet Search</Link>
                <Link to="/">Home</Link>
              </>
            )}
          </nav>
        </header>
        <main className="adoption-form-main">
          <div className="adoption-form-success">
            <div className="success-icon">✓</div>
            <h2>Application Submitted</h2>
            <p>Your adoption application has been received and is pending approval.</p>
            <p className="adoption-ref-id">Application ID: <strong>{submittedId}</strong></p>
            <p className="adoption-ref-note">Save this ID to check your application status. An admin will review your request shortly.</p>
            <Link to="/pet-search" className="adoption-form-btn">Browse More Pets</Link>
            <Link to="/" className="adoption-form-btn secondary">Home</Link>
          </div>
        </main>
      </div>
    )
  }

  if (!pet && petId) {
    return (
      <div className="adoption-form-page">
        <header className="adoption-form-header">
          <Link to="/" className="adoption-form-logo">PetMatch</Link>
          <nav>
            {user && isSuperAdminAccount(user) ? (
              <SuperAdminNavLinks />
            ) : (
              <Link to="/pet-search">Pet Search</Link>
            )}
          </nav>
        </header>
        <main className="adoption-form-main">
          <p className="adoption-form-error">Pet not found.</p>
          <Link to="/pet-search">Back to Pet Search</Link>
        </main>
      </div>
    )
  }

  if (error && !petId) {
    return (
      <div className="adoption-form-page">
        <header className="adoption-form-header">
          <Link to="/" className="adoption-form-logo">PetMatch</Link>
          <nav>
            {user && isSuperAdminAccount(user) ? (
              <SuperAdminNavLinks />
            ) : (
              <Link to="/pet-search">Pet Search</Link>
            )}
          </nav>
        </header>
        <main className="adoption-form-main">
          <p className="adoption-form-error">{error}</p>
          <Link to="/pet-search">Go to Pet Search</Link>
        </main>
      </div>
    )
  }

  return (
    <div className="adoption-form-page">
      <header className="adoption-form-header">
        <Link to="/" className="adoption-form-logo">PetMatch</Link>
        <nav>
          {user && isSuperAdminAccount(user) ? (
            <SuperAdminNavLinks />
          ) : (
            <>
              <Link to="/pet-search">Pet Search</Link>
              <Link to="/">Home</Link>
            </>
          )}
        </nav>
      </header>

      <main className="adoption-form-main">
        <h1>Adoption Application</h1>
        <p className="adoption-form-sub">Apply to adopt {pet?.petType || 'this pet'}. Your request will be reviewed by our adoption team.</p>

        {pet && (
          <div className="adoption-form-pet-summary">
            <div className="adoption-form-pet-image">
              <img src={getPetImageSrc(pet)} alt={pet.petType || 'Pet'} />
            </div>
            <div className="adoption-form-pet-info">
              <h3>{pet.petType || 'Pet'}</h3>
              <p>
                {pet.breed || '—'}
                {pet.ageMonths != null ? ` • ${formatAgeMonths(pet.ageMonths)}` : ''}
                {pet.size ? ` • ${pet.size}` : ''}
              </p>
              <p className="adoption-form-pet-category">{pet.petType}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="adoption-form">
          <div className="adoption-form-group">
            <label>Application ID</label>
            <input type="text" value={applicationId} readOnly className="adoption-form-readonly" />
          </div>
          <div className="adoption-form-group">
            <label>Your Name *</label>
            <input type="text" value={applicantName} onChange={e => setApplicantName(e.target.value)} placeholder="Full name" required />
          </div>
          <div className="adoption-form-group">
            <label>Email *</label>
            <input type="email" value={applicantEmail} onChange={e => setApplicantEmail(e.target.value)} placeholder="you@example.com" required />
          </div>
          <div className="adoption-form-group">
            <label>Phone</label>
            <input
              type="tel"
              inputMode="numeric"
              value={applicantPhone}
              onChange={e => setApplicantPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="0712345678"
              pattern="[0-9]{10}"
              title="Phone number must be exactly 10 digits"
              maxLength={10}
            />
          </div>
          <div className="adoption-form-group">
            <label>Message (Why do you want to adopt?)</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Tell us about your home and why you'd be a great match..." rows={4} />
          </div>
          {error && <p className="adoption-form-err">{error}</p>}
          <button type="submit" className="adoption-form-submit" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Application'}
          </button>
        </form>
      </main>

      <footer className="adoption-form-footer">
        <p>© PetMatch – Adoption Applications</p>
      </footer>
    </div>
  )
}

export default AdoptionFormPage
