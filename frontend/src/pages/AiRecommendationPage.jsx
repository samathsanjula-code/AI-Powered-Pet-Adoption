import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { SuperAdminNavLinks } from '../components/SuperAdminNav'
import { isSuperAdminAccount } from '../utils/superAdminNav'
import { API_BASE } from '../api'
import './AiRecommendationPage.css'
import './PetSearchPage.css'

const RECOMMEND_URL = '/recommendation-api/api/recommend'
const HISTORY_API = `${API_BASE}/api/ai-recommendation/history`

const DEFAULT_PET_CLIPART = 'https://img.freepik.com/free-vector/group-cute-smiley-pets_23-2148512151.jpg?semt=ais_hybrid&w=740&q=80'

const PET_TYPES = ['Dog', 'Rabbit', 'Cat', 'Bird']
const LEVELS = ['Low', 'Medium', 'High']
const SPACE = ['Small', 'Medium', 'Large']
const TEMPERAMENT = ['Protective', 'Calm', 'Playful', 'Aggressive', 'Friendly']
const YES_NO = ['Yes', 'No']

const initialForm = {
  // Keep everything blank on first load (no default selections).
  PetType: '',
  Breed: '',
  activity_level: '',
  noise_level: '',
  grooming_needs: '',
  space_required: '',
  temperament: '',
  good_with_children: '',
  good_with_other_pets: ''
}

function formatAgeMonths(ageMonths) {
  const m = Number(ageMonths)
  if (!Number.isFinite(m) || m <= 0) return '—'
  const years = Math.floor(m / 12)
  const months = m % 12
  if (years > 0 && months > 0) return `${years}y ${months}m`
  if (years > 0) return `${years}y`
  return `${months}m`
}

function isFlagEnabled(v) {
  return v === true || v === 'true' || Number(v) === 1
}

function healthLabel(v) {
  return Number(v) === 1 ? 'Healthy & Active' : 'Needs Care'
}

function normalizeImagePaths(paths) {
  if (!paths) return null
  if (Array.isArray(paths)) return paths.filter(Boolean)
  if (typeof paths === 'string') return paths.split(',').map(s => s.trim()).filter(Boolean)
  return null
}

/** Align Flask / CSV / Mongo fields with pet-search listing shape; key by PetID for adopt flow */
function normalizeListingForCard(raw) {
  const id = raw.PetID ?? raw.id
  return {
    id,
    PetID: id,
    petType: raw.petType || raw.PetType || 'Pet',
    breed: raw.breed || raw.Breed,
    ageMonths: raw.ageMonths ?? raw.AgeMonths,
    size: raw.size || raw.Size,
    weightKg: raw.weightKg ?? raw.WeightKg,
    vaccinated: raw.vaccinated ?? raw.Vaccinated,
    healthCondition: raw.healthCondition ?? raw.HealthCondition,
    previousOwner: raw.previousOwner ?? raw.PreviousOwner,
    imagePaths: normalizeImagePaths(raw.imagePaths),
    imageLocation: raw.imageLocation
  }
}

function buildPreferenceSummary(pref) {
  if (!pref || typeof pref !== 'object') return '-'
  const parts = []
  if (pref.PetType) parts.push(`Type: ${pref.PetType}`)
  if (pref.Breed) parts.push(`Breed: ${pref.Breed}`)
  if (pref.activity_level) parts.push(`Activity: ${pref.activity_level}`)
  if (pref.space_required) parts.push(`Space: ${pref.space_required}`)
  if (pref.temperament) parts.push(`Temperament: ${pref.temperament}`)
  if (pref.good_with_children) parts.push(`Children: ${pref.good_with_children}`)
  if (pref.good_with_other_pets) parts.push(`Other pets: ${pref.good_with_other_pets}`)
  return parts.length ? parts.join(' • ') : '-'
}

function getPetImageSrc(pet) {
  if (pet?.imagePaths?.[0]) return `${API_BASE}${pet.imagePaths[0]}`
  if (pet?.imageLocation) return pet.imageLocation
  return DEFAULT_PET_CLIPART
}

function AiRecommendationPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState('')
  const [editingHistoryId, setEditingHistoryId] = useState(null)
  const [deletingHistoryId, setDeletingHistoryId] = useState(null)

  const fetchHistory = async () => {
    if (!user?.id) return
    setHistoryLoading(true)
    setHistoryError('')
    try {
      const res = await fetch(`${HISTORY_API}?userId=${user.id}`)
      if (!res.ok) return
      const data = await res.json()
      setHistory(Array.isArray(data) ? data : [])
    } catch (e) {
      setHistoryError('Could not load history.')
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [user?.id])

  const updateForm = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const saveHistory = async (recommendationData) => {
    if (!user?.id) return
    try {
      const petIds = Array.isArray(recommendationData?.petIds)
        ? recommendationData.petIds.map(v => Number(v)).filter(v => Number.isFinite(v))
        : []

      const payload = {
        userId: user.id,
        userEmail: user?.email,
        preferences: form,
        petIds
      }

      const isUpdating = editingHistoryId != null
      const endpoint = isUpdating ? `${HISTORY_API}/${editingHistoryId}` : HISTORY_API
      const method = isUpdating ? 'PUT' : 'POST'

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) return
      const saved = await res.json()
      if (isUpdating) {
        setHistory(prev => [saved, ...prev.filter(h => h.id !== saved.id)])
        setEditingHistoryId(null)
      } else {
        setHistory(prev => [saved, ...prev])
      }
    } catch (e) {}
  }

  const beginEditHistory = (historyItem) => {
    const pref = historyItem?.preferences || {}
    setForm({
      ...initialForm,
      PetType: String(pref.PetType ?? ''),
      Breed: String(pref.Breed ?? ''),
      activity_level: String(pref.activity_level ?? ''),
      noise_level: String(pref.noise_level ?? ''),
      grooming_needs: String(pref.grooming_needs ?? ''),
      space_required: String(pref.space_required ?? ''),
      temperament: String(pref.temperament ?? ''),
      good_with_children: String(pref.good_with_children ?? ''),
      good_with_other_pets: String(pref.good_with_other_pets ?? '')
    })
    setEditingHistoryId(historyItem?.id ?? null)
    setError('')
    setResult(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDeleteHistory = async (id) => {
    if (!id) return
    setDeletingHistoryId(id)
    try {
      const res = await fetch(`${HISTORY_API}/${id}`, { method: 'DELETE' })
      if (!res.ok) return
      setHistory(prev => prev.filter(h => h.id !== id))
      if (editingHistoryId === id) {
        setEditingHistoryId(null)
        setForm(initialForm)
      }
    } catch (e) {
      setHistoryError('Could not delete history item.')
    } finally {
      setDeletingHistoryId(null)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setResult(null)

    // Frontend validation so users don't submit empty preference fields.
    const requiredFields = [
      { key: 'PetType', label: 'Pet Type' },
      { key: 'Breed', label: 'Breed' },
      { key: 'activity_level', label: 'Activity level' },
      { key: 'noise_level', label: 'Noise level' },
      { key: 'grooming_needs', label: 'Grooming needs' },
      { key: 'space_required', label: 'Space required' },
      { key: 'temperament', label: 'Temperament' },
      { key: 'good_with_children', label: 'Good with children' },
      { key: 'good_with_other_pets', label: 'Good with other pets' }
    ]

    const missing = requiredFields
      .filter(({ key }) => String(form?.[key] ?? '').trim() === '')
      .map(({ label }) => label)

    if (missing.length > 0) {
      setError(`Please fill in: ${missing.join(', ')}`)
      return
    }

    setLoading(true)
    try {
      const res = await fetch(RECOMMEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setError(data.error || data.message || `Request failed (${res.status})`)
        return
      }
      setResult(data)
      await saveHistory(data)
    } catch (err) {
      setError(err?.message || 'Could not reach recommendation service. Is the Flask API running on port 5001?')
    } finally {
      setLoading(false)
    }
  }

  const handleAdopt = (pet) => {
    const id = pet.id ?? pet.PetID
    if (id == null) return
    navigate(`/adoption-form?petId=${id}`)
  }

  return (
    <div className="ai-recommendation-page">
      <header className="ai-recommendation-header">
        <Link to="/" className="ai-recommendation-logo">PetMatch</Link>
        <nav>
          {user && isSuperAdminAccount(user) ? (
            <SuperAdminNavLinks />
          ) : (
            <>
              <Link to="/">Home</Link>
              <Link to="/volunteer">Register Pet</Link>
              <Link to="/pet-search" className="active">Pet Search</Link>
              {user?.role === 'Admin' && <Link to="/seller-admin">Seller Admin</Link>}
              {user?.role === 'Admin' && <Link to="/adoption-admin">Adoption Admin</Link>}
              {user ? (
                <div className="ai-recommendation-nav-user">
                  <span>{user.name}</span>
                  <button type="button" className="ai-recommendation-logout" onClick={() => logout()}>Log out</button>
                </div>
              ) : (
                <Link to="/login">Sign In</Link>
              )}
            </>
          )}
        </nav>
      </header>

      <main className="ai-recommendation-main">
        <h1>AI Pet Match</h1>
        <p className="ai-recommendation-sub">
          Answer these questions so we can match your lifestyle to pets. Results appear below on this page.
        </p>
        
        {error && (
          <div className="ai-recommendation-error" role="alert">
            {error}
          </div>
        )}

        <form className="ai-recommendation-form" onSubmit={handleSubmit}>
          <div className="ai-recommendation-grid">
            <label>
              Pet Type
              <select value={form.PetType} onChange={e => updateForm('PetType', e.target.value)}>
                <option value="">Select pet type</option>
                {PET_TYPES.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </label>

            <label>
              Breed
              <input
                type="text"
                value={form.Breed}
                onChange={e => updateForm('Breed', e.target.value)}
                placeholder="e.g. Unknown, Labrador"
              />
            </label>

            <label>
              Activity level
              <select value={form.activity_level} onChange={e => updateForm('activity_level', e.target.value)}>
                <option value="">Select activity</option>
                {LEVELS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </label>

            <label>
              Noise level
              <select value={form.noise_level} onChange={e => updateForm('noise_level', e.target.value)}>
                <option value="">Select noise level</option>
                {LEVELS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </label>

            <label>
              Grooming needs
              <select value={form.grooming_needs} onChange={e => updateForm('grooming_needs', e.target.value)}>
                <option value="">Select grooming needs</option>
                {LEVELS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </label>

            <label>
              Space required
              <select value={form.space_required} onChange={e => updateForm('space_required', e.target.value)}>
                <option value="">Select space</option>
                {SPACE.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </label>

            <label>
              Temperament
              <select value={form.temperament} onChange={e => updateForm('temperament', e.target.value)}>
                <option value="">Select temperament</option>
                {TEMPERAMENT.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </label>

            <label>
              Good with children
              <select value={form.good_with_children} onChange={e => updateForm('good_with_children', e.target.value)}>
                <option value="">Select option</option>
                {YES_NO.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </label>

            <label>
              Good with other pets
              <select value={form.good_with_other_pets} onChange={e => updateForm('good_with_other_pets', e.target.value)}>
                <option value="">Select option</option>
                {YES_NO.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </label>
          </div>

          <div className="ai-recommendation-actions">
            <button type="button" className="secondary-btn" onClick={() => navigate('/pet-search')}>Back</button>
            {editingHistoryId != null && (
              <button
                type="button"
                className="secondary-btn"
                onClick={() => {
                  setEditingHistoryId(null)
                  setForm(initialForm)
                }}
              >
                Cancel Edit
              </button>
            )}
            <button type="submit" className="primary-btn" disabled={loading}>
              {loading ? 'Finding matches...' : (editingHistoryId != null ? 'Update Search' : 'Get My Matches')}
            </button>
          </div>
        </form>

        {user && (
          <section className="ai-history-section" aria-live="polite">
            <h2>Your Search History</h2>
            {historyLoading ? (
              <p className="ai-history-loading">Loading...</p>
            ) : historyError ? (
              <p className="ai-history-error">{historyError}</p>
            ) : history.length === 0 ? (
              <p className="ai-history-empty">No history yet. Submit your preferences to create a record.</p>
            ) : (
              <div className="ai-history-table-wrap">
                <table className="ai-history-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Pet Type</th>
                      <th>Preferences</th>
                      <th>Results</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(h => {
                      const pref = h.preferences || {}
                      const createdAtMs = h.createdAt
                      const dateLabel = createdAtMs ? new Date(createdAtMs).toLocaleString() : '-'
                      const petType = pref.PetType || '-'
                      const summary = buildPreferenceSummary(pref)
                      const ids = Array.isArray(h.petIds) ? h.petIds : []
                      const preview = ids.length ? ids.slice(0, 5).join(', ') : '-'
                      const more = ids.length > 5
                      return (
                        <tr key={h.id}>
                          <td>{dateLabel}</td>
                          <td>{petType}</td>
                          <td className="ai-history-pref-cell">{summary}</td>
                          <td className="ai-history-results-cell">
                            {ids.length ? `${ids.length} pets (${preview}${more ? ' ...' : ''})` : '—'}
                          </td>
                          <td className="ai-history-actions-cell">
                            <button
                              type="button"
                              className="ai-history-edit-btn"
                              onClick={() => beginEditHistory(h)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="ai-history-delete-btn"
                              onClick={() => handleDeleteHistory(h.id)}
                              disabled={deletingHistoryId === h.id}
                            >
                              {deletingHistoryId === h.id ? 'Deleting...' : 'Delete'}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {result?.listings?.length > 0 && (
          <section className="ai-recommendation-results ai-recommendation-results-listings" aria-live="polite">
            <h2>Top matches</h2>
            <p className="pet-search-results">
              {result.listings.length} listing{result.listings.length !== 1 ? 's' : ''} from PetIDs: {result.petIds?.join(', ')}
            </p>
            <div className="pet-search-grid">
              {result.listings.map((raw, idx) => {
                const pet = normalizeListingForCard(raw)
                return (
                  <article key={`${pet.PetID ?? idx}-${idx}`} className="pet-search-card">
                    <div className="pet-search-card-image">
                      <img src={getPetImageSrc(pet)} alt={pet.petType || 'Pet'} loading="lazy" />
                      {pet.petType && <span className="pet-search-card-badge">{pet.petType}</span>}
                    </div>
                    <div className="pet-search-card-body">
                      <h3>{pet.petType || 'Pet'}</h3>
                      <div className="pet-search-card-meta">
                        {pet.PetID != null && <span>ID {pet.PetID}</span>}
                        {pet.breed && <span>• {pet.breed}</span>}
                        {pet.ageMonths != null && <span>• {formatAgeMonths(pet.ageMonths)}</span>}
                        {pet.size && <span>• {pet.size}</span>}
                        {pet.weightKg != null && <span>• {Number(pet.weightKg).toFixed(2)} kg</span>}
                      </div>
                      <div className="pet-search-card-tags">
                        {isFlagEnabled(pet.vaccinated) && <span className="tag vaccinated">Vaccinated</span>}
                        <span className="tag">{healthLabel(pet.healthCondition)}</span>
                        {isFlagEnabled(pet.previousOwner) && <span className="tag">Previously owned</span>}
                      </div>
                      <button type="button" className="pet-search-adopt-btn" onClick={() => handleAdopt(pet)}>
                        Adopt
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
            {result.warnings?.length > 0 && (
              <div className="ai-recommendation-warnings">
                {result.warnings.map((w, i) => (
                  <p key={i}>{w}</p>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  )
}

export default AiRecommendationPage
