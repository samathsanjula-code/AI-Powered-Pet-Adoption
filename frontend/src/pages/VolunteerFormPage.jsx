import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { SuperAdminNavLinks } from '../components/SuperAdminNav'
import { isSuperAdminAccount } from '../utils/superAdminNav'
import './VolunteerFormPage.css'

const REG_TYPES = [
  { value: 'Home Pet', label: 'Home Pet', desc: 'Register a pet from your home that needs rehoming.', icon: '🏠' },
  { value: 'Rescued Stray', label: 'Rescued Stray', desc: 'Register a stray pet you found and are currently fostering.', icon: '🐕' }
]

const PET_TYPES = ['Dog', 'Cat', 'Rabbit', 'Bird']
const SIZES = ['Small', 'Medium', 'Large']
const HEALTH_OPTIONS = ['Healthy & Active', 'Needs Care']
const NAME_PATTERN = /^[A-Za-z][A-Za-z\s.'-]{1,49}$/
const TEXT_PATTERN = /^[A-Za-z0-9\s,'./()-]{2,60}$/

import { API_BASE } from '../api'

function VolunteerFormPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [regType, setRegType] = useState('Home Pet')
  const [petType, setPetType] = useState('Dog')
  const [breed, setBreed] = useState('')
  const [ageYears, setAgeYears] = useState('')
  const [ageMonths, setAgeMonths] = useState('')
  const [color, setColor] = useState('')
  const [size, setSize] = useState('Medium')
  const [weightKg, setWeightKg] = useState('')
  const [vaccinated, setVaccinated] = useState('')
  const [healthCondition, setHealthCondition] = useState('Healthy & Active')
  const [previousOwner, setPreviousOwner] = useState('')
  const [contactName, setContactName] = useState(user?.name || '')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || [])
    const valid = files.filter(f => f.size <= 10 * 1024 * 1024 && /\.(jpg|jpeg|png|gif|webp)$/i.test(f.name))
    setImages(prev => [...prev.slice(0, 4 - valid.length), ...valid].slice(0, 4))
  }

  const removeImage = (i) => setImages(prev => prev.filter((_, idx) => idx !== i))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!user?.id) {
      setError('Session expired. Please sign in again.')
      return
    }

    const phone = phoneNumber.trim()
    const cleanBreed = breed.trim()
    const cleanColor = color.trim()
    const cleanContactName = contactName.trim()
    if (!/^07\d{8}$/.test(phone)) {
      setError('Phone number must be like 0712345678')
      return
    }

    if (!regType || !petType || !cleanBreed || !cleanColor || !size || !weightKg) {
      setError('Please fill all required fields.')
      return
    }
    if (!TEXT_PATTERN.test(cleanBreed)) {
      setError('Breed must be 2-60 characters and can include letters, numbers, spaces and basic punctuation.')
      return
    }
    if (!TEXT_PATTERN.test(cleanColor)) {
      setError('Color must be 2-60 characters and can include letters, numbers, spaces and basic punctuation.')
      return
    }
    if (!NAME_PATTERN.test(cleanContactName)) {
      setError('Contact name must be 2-50 characters and contain valid name characters only.')
      return
    }

    const yearsNum = Number(ageYears)
    const monthsNum = Number(ageMonths)
    if (!Number.isInteger(yearsNum) || yearsNum < 0 || !Number.isInteger(monthsNum) || monthsNum < 0) {
      setError('Age (years/months) must be whole numbers.')
      return
    }
    const totalMonths = yearsNum * 12 + monthsNum
    if (totalMonths <= 0) {
      setError('Age must be greater than 0 months.')
      return
    }

    const weightNum = Number(weightKg)
    if (!Number.isFinite(weightNum) || weightNum <= 0) {
      setError('Weight (KG) must be a valid number greater than 0.')
      return
    }

    if (vaccinated !== 'yes' && vaccinated !== 'no') {
      setError('Please select whether the pet is vaccinated.')
      return
    }
    if (previousOwner !== 'yes' && previousOwner !== 'no') {
      setError('Please select whether the pet was previously owned.')
      return
    }
    if (!HEALTH_OPTIONS.includes(healthCondition)) {
      setError('Please select a valid health condition.')
      return
    }

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('registrationType', regType)
      formData.append('petType', petType)
      formData.append('breed', cleanBreed)
      formData.append('ageYears', String(yearsNum))
      formData.append('ageMonths', String(monthsNum))
      formData.append('color', cleanColor)
      formData.append('size', size)
      formData.append('weightKg', String(weightNum))
      formData.append('vaccinated', vaccinated)
      formData.append('healthCondition', healthCondition)
      formData.append('previousOwner', previousOwner)
      formData.append('contactName', cleanContactName)
      formData.append('phoneNumber', phone)
      formData.append('userId', String(user.id))
      images.forEach((img, i) => formData.append('images', img))

      const res = await fetch(`${API_BASE}/api/pets`, {
        method: 'POST',
        body: formData
      })

      let data = {}
      try {
        data = await res.json()
      } catch (_) {
        setError('Invalid response from server')
        return
      }
      if (res.ok) {
        setSuccess(true)
      } else {
        const msg = data.message || data.error || (typeof data === 'string' ? data : 'Registration failed')
        setError(msg)
      }
    } catch (err) {
      setError('Could not connect to server. Make sure the backend is running (cd backend && mvn spring-boot:run)')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="volunteer-page">
        <div className="volunteer-success">
          <div className="success-icon">✓</div>
          <h2>Pet Registered Successfully!</h2>
          <p>Thank you for helping pets find their forever homes.</p>
          <Link to="/volunteer" className="back-btn" onClick={() => setSuccess(false)}>Register Another</Link>
          <Link to="/" className="back-btn secondary">Go Home</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="volunteer-page">
      <header className="vol-header">
        <Link to="/" className="vol-logo">PetMatch</Link>
        <nav>
          {user && isSuperAdminAccount(user) ? (
            <SuperAdminNavLinks />
          ) : (
            <>
              <Link to="/">Home</Link>
              <Link to="/volunteer" className="active">Register</Link>
              {user?.role === 'Admin' && <Link to="/admin">Admin</Link>}
              {user?.role === 'Admin' && <Link to="/seller-admin">Seller Admin</Link>}
              {user?.role === 'Admin' && <Link to="/adoption-admin">Adoption Admin</Link>}
              <span className="profile-link">{user?.name}</span>
              <button type="button" className="logout-btn" onClick={() => { logout(); navigate('/') }}>Logout</button>
            </>
          )}
        </nav>
      </header>

      <main className="vol-main">
        <h1>Pet Registration Form</h1>
        <p className="vol-sub">Help us find the perfect home by providing accurate details about the pet.</p>

        <form onSubmit={handleSubmit} className="vol-form">
          <section className="form-section">
            <h2>1. Registration Type</h2>
            <div className="reg-type-cards">
              {REG_TYPES.map(r => (
                <button
                  key={r.value}
                  type="button"
                  className={`reg-card ${regType === r.value ? 'selected' : ''}`}
                  onClick={() => setRegType(r.value)}
                >
                  <span className="reg-icon">{r.icon}</span>
                  <h3>{r.label}</h3>
                  <p>{r.desc}</p>
                </button>
              ))}
            </div>
          </section>

          <section className="form-section">
            <h2>2. Basic Information</h2>
            <div className="form-grid">
              <div className="form-group">
                <label>Pet Type *</label>
                <select value={petType} onChange={e => setPetType(e.target.value)} required>
                  {PET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Breed *</label>
                <input type="text" placeholder="e.g. Local / Mixed Breed" value={breed} onChange={e => setBreed(e.target.value)} required minLength={2} maxLength={60} />
              </div>
              <div className="form-group">
                <label>Color *</label>
                <input type="text" placeholder="e.g. Brown / White" value={color} onChange={e => setColor(e.target.value)} required minLength={2} maxLength={60} />
              </div>
              <div className="form-group">
                <label>Size *</label>
                <select value={size} onChange={e => setSize(e.target.value)} required>
                  {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Age (Years & Months) *</label>
                <div className="age-row">
                  <input type="number" inputMode="numeric" min="0" step="1" placeholder="Years" value={ageYears} onChange={e => setAgeYears(e.target.value)} required />
                  <input type="number" inputMode="numeric" min="0" step="1" placeholder="Months" value={ageMonths} onChange={e => setAgeMonths(e.target.value)} required />
                </div>
              </div>
              <div className="form-group">
                <label>Weight (KG) *</label>
                <input type="number" inputMode="decimal" step="0.01" min="0.01" placeholder="e.g. 5.25" value={weightKg} onChange={e => setWeightKg(e.target.value)} required />
              </div>
            </div>
          </section>

          <section className="form-section">
            <h2>3. Health Status</h2>
            <div className="check-row">
              <div className="radio-group" role="group" aria-label="Vaccinated">
                <span className="radio-label">Vaccinated *</span>
                <label className="radio"><input type="radio" name="vaccinated" value="yes" checked={vaccinated === 'yes'} onChange={e => setVaccinated(e.target.value)} required /> Yes</label>
                <label className="radio"><input type="radio" name="vaccinated" value="no" checked={vaccinated === 'no'} onChange={e => setVaccinated(e.target.value)} required /> No</label>
              </div>
              <div className="radio-group" role="group" aria-label="Previously owned">
                <span className="radio-label">Previously owned *</span>
                <label className="radio"><input type="radio" name="previousOwner" value="yes" checked={previousOwner === 'yes'} onChange={e => setPreviousOwner(e.target.value)} required /> Yes</label>
                <label className="radio"><input type="radio" name="previousOwner" value="no" checked={previousOwner === 'no'} onChange={e => setPreviousOwner(e.target.value)} required /> No</label>
              </div>
            </div>
            <div className="form-group">
              <label>Health Condition *</label>
              <select value={healthCondition} onChange={e => setHealthCondition(e.target.value)}>
                {HEALTH_OPTIONS.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          </section>

          <section className="form-section">
            <h2>4. Details & Media</h2>
            <div className="form-group">
              <label>Photos (optional)</label>
              <div className="upload-zone" onClick={() => fileInputRef.current?.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); handleFileChange({ target: { files: e.dataTransfer.files } }) }}>
                <input ref={fileInputRef} type="file" multiple accept=".jpg,.jpeg,.png,.gif,.webp" onChange={handleFileChange} hidden />
                <span className="upload-icon">☁</span>
                <p>Drag and drop images here or browse</p>
                <span className="upload-hint">Supports JPG, PNG, GIF, WebP (Max 10MB)</span>
              </div>
              <div className="image-previews">
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className="preview-box">
                    {images[i] ? (
                      <>
                        <img src={URL.createObjectURL(images[i])} alt="" />
                        <button type="button" className="remove-img" onClick={(e) => { e.stopPropagation(); removeImage(i) }}>×</button>
                      </>
                    ) : (
                      <span className="placeholder">+</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="form-section">
            <h2>5. Contact Information</h2>
            <div className="form-grid">
              <div className="form-group">
                <label>Your Name *</label>
                <input type="text" placeholder="John Doe" value={contactName} onChange={e => setContactName(e.target.value)} required minLength={2} maxLength={50} />
              </div>
              <div className="form-group">
                <label>Phone Number *</label>
                <input type="tel" placeholder="0712345678" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))} pattern="^07\d{8}$" required maxLength={10} inputMode="numeric" />
              </div>
            </div>
          </section>

          {error && <p className="error-msg">{error}</p>}
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit for Verification'}
          </button>
          <p className="terms-note">By submitting, you agree to our Terms of Service and Privacy Policy regarding pet listings.</p>
        </form>
      </main>

      <footer className="vol-footer">
        <p>© 2024 PetMatch Platform. All rights reserved.</p>
        <div>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/contact">Support</Link>
        </div>
      </footer>
    </div>
  )
}

export default VolunteerFormPage
