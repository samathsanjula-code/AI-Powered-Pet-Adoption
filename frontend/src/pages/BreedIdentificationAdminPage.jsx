import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { SuperAdminNavLinks } from '../components/SuperAdminNav'
import { isSuperAdminAccount } from '../utils/superAdminNav'
import { API_BASE } from '../api'
import './BreedIdentificationAdminPage.css'

function BreedIdentificationAdminPage() {
  const { user, logout } = useAuth()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [responseDrafts, setResponseDrafts] = useState({})
  const [zoomImage, setZoomImage] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/breed-identifications`)
      if (res.ok) {
        const data = await res.json()
        setRequests(data)
        const drafts = {}
        data.forEach((r) => { drafts[r.id] = r.adminResponse || '' })
        setResponseDrafts(drafts)
      }
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const submitResponse = async (id) => {
    const adminResponse = (responseDrafts[id] || '').trim()
    if (!adminResponse) return alert('Please type identified breed before sending.')
    try {
      const res = await fetch(`${API_BASE}/api/breed-identifications/${id}/response`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminResponse })
      })
      if (res.ok) {
        const updated = await res.json()
        setRequests(prev => prev.map(r => (r.id === id ? updated : r)))
      } else {
        const err = await res.json().catch(() => ({ message: 'Could not submit response' }))
        alert(err.message || 'Could not submit response')
      }
    } catch (e) {
      console.error(e)
    }
  }

  const deleteRequest = async (id) => {
    if (!confirm('Delete this breed identification request?')) return
    try {
      const res = await fetch(`${API_BASE}/api/breed-identifications/${id}`, { method: 'DELETE' })
      if (res.ok) setRequests(prev => prev.filter(r => r.id !== id))
    } catch (e) {}
  }

  return (
    <div className="breed-admin-page">
      <header className="breed-admin-header">
        <Link to="/" className="breed-admin-logo">PetMatch</Link>
        <nav>
          {user && isSuperAdminAccount(user) ? (
            <SuperAdminNavLinks />
          ) : (
            <>
              <Link to="/">Home</Link>
              <Link to="/admin">Pet Admin</Link>
              <Link to="/breed-identification/admin" className="active">Breed Admin</Link>
              <div className="breed-admin-nav-user">
                <span>{user?.name}</span>
                <button type="button" onClick={() => logout()}>Logout</button>
              </div>
            </>
          )}
        </nav>
      </header>

      <main className="breed-admin-main">
        <h1>Breed Identification Requests</h1>
        <p>Review requests, inspect uploaded photos, and send/edit identified breed responses.</p>
        {loading ? <p>Loading...</p> : (
          <div className="breed-admin-list">
            {requests.map((req) => (
              <article key={req.id} className="breed-admin-card">
                <div className="breed-admin-meta">
                  <h2>Request #{req.id}</h2>
                  <span className={`status ${req.responseStatus === 'SUBMITTED' ? 'submitted' : 'pending'}`}>
                    {req.responseStatus === 'SUBMITTED' ? 'Response submitted' : 'Pending response'}
                  </span>
                </div>
                <p><strong>Requester:</strong> {req.requesterName || '—'} ({req.requesterEmail || '—'})</p>
                <p><strong>Guess:</strong> {req.guessedBreed || 'Unknown'} | {req.petCategory || '—'} | {req.petSize || '—'}</p>
                {req.additionalNotes && <p><strong>Notes:</strong> {req.additionalNotes}</p>}
                <div className="breed-admin-images">
                  {(req.imagePaths || []).length === 0 && <span>No image uploaded</span>}
                  {(req.imagePaths || []).map((p) => (
                    <button key={p} type="button" className="thumb-btn" onClick={() => setZoomImage(`${API_BASE}${p}`)}>
                      <img src={`${API_BASE}${p}`} alt="submitted pet" />
                    </button>
                  ))}
                </div>
                <div className="breed-admin-response">
                  <label>Breed response</label>
                  <input
                    type="text"
                    value={responseDrafts[req.id] || ''}
                    onChange={(e) => setResponseDrafts(prev => ({ ...prev, [req.id]: e.target.value }))}
                    placeholder="e.g. Labrador Retriever mix"
                  />
                </div>
                <div className="breed-admin-actions">
                  <button type="button" className="send-btn" onClick={() => submitResponse(req.id)}>
                    {req.responseStatus === 'SUBMITTED' ? 'Update response' : 'Send response'}
                  </button>
                  <button type="button" className="delete-btn" onClick={() => deleteRequest(req.id)}>Delete request</button>
                </div>
              </article>
            ))}
            {requests.length === 0 && <p>No breed identification requests yet.</p>}
          </div>
        )}
      </main>

      {zoomImage && (
        <div className="breed-admin-modal" onClick={() => setZoomImage('')}>
          <img src={zoomImage} alt="full size request" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  )
}

export default BreedIdentificationAdminPage
