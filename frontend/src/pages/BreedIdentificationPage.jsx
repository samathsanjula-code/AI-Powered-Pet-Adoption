import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { SuperAdminNavLinks } from '../components/SuperAdminNav'
import { isSuperAdminAccount } from '../utils/superAdminNav'
import { API_BASE } from '../api'
import './BreedIdentificationPage.css'

const CONFIDENCE_OPTIONS = ['Very Low', 'Low', 'Medium', 'High', 'Very High']
const PET_CATEGORIES = ['Dog', 'Cat', 'Other']
const PET_SIZES = ['Small', 'Medium', 'Large', 'Unknown']
const BREED_GUESSES = ['Golden Retriever', 'Labrador', 'German Shepherd', 'Beagle', 'Poodle', 'Bulldog', 'Persian', 'Siamese', 'Maine Coon', 'Mixed Breed', 'Other']

const PHOTO_TIPS = [
  {
    title: 'Use good lighting',
    body: 'Ensure your pet is well-lit with even lighting so shadows do not hide facial details. Natural daylight works best, ideally with your pet facing the light source.'
  },
  {
    title: 'Frontal pose',
    body: 'Capture the image with your pet\'s face directed toward the camera. This helps reviewers and tools compare muzzle length, ears, and facial structure.'
  },
  {
    title: 'Single pet only',
    body: 'Include only one pet in the photo so breed clues are not mixed between animals.'
  },
  {
    title: 'Avoid obstructions',
    body: 'Keep collars, toys, and clothing minimal so coat pattern, ears, and face stay visible for identification.'
  }
]

const FAQ_ITEMS = [
  {
    q: 'How does breed identification work here?',
    a: 'You upload a clear photo and optional details (your breed guess, size, coat color, notes). Our team and records use these together with visible traits—ear shape, muzzle length, coat, and body proportions—to help categorize the pet, similar to how dedicated breed tools analyze breed-defining features.'
  },
  {
    q: 'What details help the most?',
    a: 'A sharp, well-lit image plus notes on coat color, size, and age improve accuracy. Clear facial structure and body proportions are especially useful when comparing to breed profiles.'
  },
  {
    q: 'Are my photos stored or shared?',
    a: 'Photos are used for your identification request and handled according to our service policies. Avoid uploading sensitive personal information in images.'
  },
  {
    q: 'Can I use a photo with multiple pets?',
    a: 'For best results use one pet per photo. Multiple animals in one frame can make traits harder to separate, as with many automated breed analyzers.'
  },
  {
    q: 'How can I improve accuracy?',
    a: 'Use a high-resolution, well-lit photo with your pet facing the camera, minimal accessories, and fill in the optional fields below the upload.'
  }
]

function BreedIdentificationPage() {
  const { user, logout } = useAuth()
  const fileInputRef = useRef(null)
  const editFileInputRef = useRef(null)

  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [openFaq, setOpenFaq] = useState(-1)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    guessedBreed: '',
    confidenceLevel: 'Medium',
    petCategory: 'Dog',
    petSize: 'Medium',
    coatColor: '',
    estimatedAge: '',
    additionalNotes: '',
    images: null
  })

  useEffect(() => {
    fetchRequests()
  }, [user?.email])

  const fetchRequests = async () => {
    try {
      const requesterEmail = user?.email ? `?requesterEmail=${encodeURIComponent(user.email)}` : ''
      const res = await fetch(`${API_BASE}/api/breed-identifications${requesterEmail}`)
      if (res.ok) {
        const data = await res.json()
        setRequests(data)
      }
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const resetForm = () => {
    setForm({
      guessedBreed: '',
      confidenceLevel: 'Medium',
      petCategory: 'Dog',
      petSize: 'Medium',
      coatColor: '',
      estimatedAge: '',
      additionalNotes: '',
      images: null
    })
    setEditingId(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (editFileInputRef.current) editFileInputRef.current.value = ''
  }

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || [])
    const valid = files.filter(f => f.size <= 10 * 1024 * 1024 && /\.(jpg|jpeg|png|gif|webp)$/i.test(f.name))
    setForm(f => ({ ...f, images: valid.length > 0 ? valid : null }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('guessedBreed', form.guessedBreed)
      formData.append('confidenceLevel', form.confidenceLevel)
      formData.append('petCategory', form.petCategory)
      formData.append('petSize', form.petSize)
      formData.append('coatColor', form.coatColor)
      formData.append('estimatedAge', form.estimatedAge)
      formData.append('additionalNotes', form.additionalNotes)
      formData.append('requesterName', user?.name || 'Guest User')
      formData.append('requesterEmail', user?.email || '')
      if (form.images && form.images.length > 0) {
        form.images.forEach(img => formData.append('images', img))
      }
      const url = editingId ? `${API_BASE}/api/breed-identifications/${editingId}` : `${API_BASE}/api/breed-identifications`
      const method = editingId ? 'PUT' : 'POST'
      const res = await fetch(url, { method, body: formData })
      const data = await res.json()
      if (res.ok) {
        if (editingId) {
          setRequests(prev => prev.map(r => r.id === editingId ? data : r))
        } else {
          setRequests(prev => [data, ...prev])
        }
        resetForm()
      } else {
        setError(data?.message || 'Unable to submit request. Please check your details.')
      }
    } catch (err) {
      console.error(err)
      setError('Unable to submit request. Please try again.')
    }
    setSubmitting(false)
  }

  const handleEdit = (req) => {
    setEditingId(req.id)
    setForm({
      guessedBreed: req.guessedBreed || '',
      confidenceLevel: req.confidenceLevel || 'Medium',
      petCategory: req.petCategory || 'Dog',
      petSize: req.petSize || 'Medium',
      coatColor: req.coatColor || '',
      estimatedAge: req.estimatedAge || '',
      additionalNotes: req.additionalNotes || '',
      images: null
    })
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this breed identification request?')) return
    try {
      const res = await fetch(`${API_BASE}/api/breed-identifications/${id}`, { method: 'DELETE' })
      if (res.ok) setRequests(prev => prev.filter(r => r.id !== id))
    } catch (e) {}
  }

  return (
    <div className="breed-id-page">
      <header className="breed-id-header">
        <Link to="/" className="breed-id-logo">PetMatch</Link>
        <nav>
          {user && isSuperAdminAccount(user) ? (
            <SuperAdminNavLinks />
          ) : (
            <>
              <Link to="/">Home</Link>
              <Link to="/pet-search">Pet Search</Link>
              <Link to="/breed-identification">Breed ID</Link>
              <Link to="/breed-identification/admin-support" className="active">Admin Support</Link>
              {(user?.role === 'PetAdmin' || user?.role === 'Admin') && <Link to="/breed-identification/admin">Breed Admin</Link>}
              {user ? (
                <div className="breed-id-nav-user">
                  <span>{user.name}</span>
                  <button type="button" className="breed-id-logout" onClick={() => logout()}>Log out</button>
                </div>
              ) : (
                <Link to="/login">Sign In</Link>
              )}
            </>
          )}
        </nav>
      </header>

      <section className="breed-id-hero">
        <div className="breed-id-hero-inner">
          <p className="breed-id-hero-eyebrow">Pet breed identifier</p>
          <h1>What breed is my pet?</h1>
          <p className="breed-id-hero-lead">
            Upload a photo and share what you know—our workflow helps document your best guess alongside size, coat, and
            notes for clearer breed identification.
          </p>
        </div>
      </section>

      <main className="breed-id-main">
        <section className="breed-id-tips" aria-labelledby="tips-heading">
          <h2 id="tips-heading">Tips to get the best results</h2>
          <p className="breed-id-tips-intro">
            If you are wondering what breed your dog or cat might be, maximize clarity with these simple steps—similar to
            dedicated photo-based breed tools.
          </p>
          <ul className="breed-id-tips-grid">
            {PHOTO_TIPS.map((tip) => (
              <li key={tip.title} className="breed-id-tip-card">
                <h3>{tip.title}</h3>
                <p>{tip.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="breed-id-form-section" id="identify-form">
          <div className="breed-id-form-head">
            <h2>{editingId ? 'Edit identification request' : 'New identification request'}</h2>
            <p className="breed-id-form-deck">
              Add a clear photo (required for new requests), then optional fields below—same fields as before, organized
              for quick scanning.
            </p>
          </div>
          {error && <p className="breed-id-empty" style={{ color: '#b91c1c' }}>{error}</p>}
          <form onSubmit={handleSubmit} className="breed-id-form">
            <div className="breed-id-form-row">
              <label>Pet photo <span className="breed-id-required">*</span></label>
              <div
                className="breed-id-upload"
                onClick={() => (editingId ? editFileInputRef.current : fileInputRef.current)?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); handleFileChange({ target: { files: e.dataTransfer.files } }) }}
              >
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} hidden />
                <input ref={editFileInputRef} type="file" accept="image/*" onChange={handleFileChange} hidden />
                <span className="breed-id-upload-icon" aria-hidden>📷</span>
                <p className="breed-id-upload-title">Drop an image here or click to upload</p>
                <p className="breed-id-upload-hint">JPG, PNG, GIF or WebP · max 10 MB</p>
                {(form.images && form.images[0]) && <span className="file-name">{form.images[0].name}</span>}
                {editingId && <span className="edit-hint">Leave empty to keep the current image</span>}
              </div>
            </div>

            <div className="breed-id-form-row">
              <label>Guessed breed</label>
              <select value={form.guessedBreed} onChange={e => setForm(f => ({ ...f, guessedBreed: e.target.value }))}>
                <option value="">Select or leave blank</option>
                {BREED_GUESSES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            <div className="breed-id-form-row">
              <label>Confidence level</label>
              <select value={form.confidenceLevel} onChange={e => setForm(f => ({ ...f, confidenceLevel: e.target.value }))}>
                {CONFIDENCE_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="breed-id-form-grid">
              <div className="breed-id-form-row">
                <label>Pet category</label>
                <select value={form.petCategory} onChange={e => setForm(f => ({ ...f, petCategory: e.target.value }))}>
                  {PET_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="breed-id-form-row">
                <label>Pet size</label>
                <select value={form.petSize} onChange={e => setForm(f => ({ ...f, petSize: e.target.value }))}>
                  {PET_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="breed-id-form-row">
              <label>Coat color</label>
              <input
                type="text"
                value={form.coatColor}
                onChange={e => setForm(f => ({ ...f, coatColor: e.target.value }))}
                placeholder="e.g. Golden, black, tabby"
              />
            </div>

            <div className="breed-id-form-row">
              <label>Estimated age</label>
              <input
                type="text"
                value={form.estimatedAge}
                onChange={e => setForm(f => ({ ...f, estimatedAge: e.target.value }))}
                placeholder="e.g. 2 years, puppy"
              />
            </div>

            <div className="breed-id-form-row">
              <label>Additional notes</label>
              <textarea
                value={form.additionalNotes}
                onChange={e => setForm(f => ({ ...f, additionalNotes: e.target.value }))}
                placeholder="Any other observations…"
                rows={3}
              />
            </div>

            <div className="breed-id-form-actions">
              <button type="submit" className="breed-id-btn-submit" disabled={submitting || (!form.images?.length && !editingId)}>
                {submitting ? 'Submitting…' : editingId ? 'Save changes' : 'Submit identification'}
              </button>
              {editingId && <button type="button" className="breed-id-btn-cancel" onClick={resetForm}>Cancel</button>}
            </div>
          </form>
        </section>

        <section className="breed-id-list-section">
          <h2>Your submissions</h2>
          {loading ? (
            <p className="breed-id-loading">Loading…</p>
          ) : requests.length === 0 ? (
            <p className="breed-id-empty">No submissions yet. Upload a photo above to get started.</p>
          ) : (
            <div className="breed-id-list">
              {requests.map(req => (
                <article key={req.id} className="breed-id-card">
                  <div className="breed-id-card-image">
                    {(req.imagePaths && req.imagePaths[0]) ? (
                      <img src={`${API_BASE}${req.imagePaths[0]}`} alt="Pet" />
                    ) : (
                      <div className="breed-id-placeholder">No image</div>
                    )}
                  </div>
                  <div className="breed-id-card-body">
                    <h3>{req.guessedBreed || 'Unknown breed'}</h3>
                    <div className="breed-id-card-meta">
                      {req.petCategory && <span>{req.petCategory}</span>}
                      {req.petSize && <span>• {req.petSize}</span>}
                      {req.confidenceLevel && <span>• {req.confidenceLevel}</span>}
                    </div>
                    {req.coatColor && <p>Coat: {req.coatColor}</p>}
                    {req.estimatedAge && <p>Est. age: {req.estimatedAge}</p>}
                    {req.additionalNotes && <p className="breed-id-notes">{req.additionalNotes}</p>}
                    <p><strong>Admin response:</strong> {req.adminResponse || 'Pending response from admin'}</p>
                    <div className="breed-id-card-actions">
                      <button type="button" className="breed-id-btn-edit" onClick={() => handleEdit(req)}>Edit</button>
                      <button type="button" className="breed-id-btn-delete" onClick={() => handleDelete(req.id)}>Delete</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="breed-id-faq" aria-labelledby="faq-heading">
          <h2 id="faq-heading">Frequently asked questions</h2>
          <div className="breed-id-faq-list">
            {FAQ_ITEMS.map((item, i) => (
              <div key={item.q} className={`breed-id-faq-item ${openFaq === i ? 'is-open' : ''}`}>
                <button
                  type="button"
                  className="breed-id-faq-q"
                  onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
                  aria-expanded={openFaq === i}
                >
                  <span>{item.q}</span>
                  <span className="breed-id-faq-chevron" aria-hidden>{openFaq === i ? '−' : '+'}</span>
                </button>
                {openFaq === i && <p className="breed-id-faq-a">{item.a}</p>}
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="breed-id-footer">
        <p>© PetMatch - Breed identification</p>
      </footer>
    </div>
  )
}

export default BreedIdentificationPage
