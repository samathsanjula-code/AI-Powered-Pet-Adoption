import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { SuperAdminNavLinks } from '../components/SuperAdminNav'
import { isSuperAdminAccount } from '../utils/superAdminNav'
import { API_BASE } from '../api'
import './PromptsAdminPage.css'

const HISTORY_ALL_API = `${API_BASE}/api/ai-recommendation/history/all`
const HISTORY_DELETE_API = `${API_BASE}/api/ai-recommendation/history`

function escapeCsvValue(v) {
  const str = v == null ? '' : String(v)
  // Escape quotes by doubling them
  const escaped = str.replace(/"/g, '""')
  return `"${escaped}"`
}

function downloadCsv(filename, rows, headers) {
  const lines = []
  lines.push(headers.map(escapeCsvValue).join(','))
  for (const row of rows) {
    lines.push(headers.map(h => escapeCsvValue(row[h])).join(','))
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function PromptsAdminPage() {
  const { user, logout } = useAuth()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchAll = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(HISTORY_ALL_API)
      if (!res.ok) {
        setError('Could not load prompts history.')
        return
      }
      const data = await res.json()
      setHistory(Array.isArray(data) ? data : [])
    } catch (e) {
      setError('Could not connect to server.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const preferencesRows = useMemo(() => {
    return history.map(h => {
      const pref = h.preferences || {}
      const createdAtIso = h.createdAt ? new Date(h.createdAt).toISOString() : ''
      return {
        id: h.id,
        createdAt: createdAtIso,
        userEmail: h.userEmail || h.userId || '',
        petType: pref.PetType || '',
        breed: pref.Breed || '',
        activity_level: pref.activity_level || '',
        noise_level: pref.noise_level || '',
        grooming_needs: pref.grooming_needs || '',
        space_required: pref.space_required || '',
        temperament: pref.temperament || '',
        good_with_children: pref.good_with_children || '',
        good_with_other_pets: pref.good_with_other_pets || '',
        petIds: Array.isArray(h.petIds) ? h.petIds.join(', ') : ''
      }
    })
  }, [history])

  const handleDelete = async (id) => {
    if (!confirm('Delete this prompt history entry?')) return
    try {
      const res = await fetch(`${HISTORY_DELETE_API}/${id}`, { method: 'DELETE' })
      if (!res.ok) return
      setHistory(prev => prev.filter(h => h.id !== id))
    } catch (e) {}
  }

  const handleExportCsv = () => {
    const headers = [
      'id',
      'createdAt',
      'userEmail',
      'petType',
      'breed',
      'activity_level',
      'noise_level',
      'grooming_needs',
      'space_required',
      'temperament',
      'good_with_children',
      'good_with_other_pets',
      'petIds'
    ]
    downloadCsv(`ai_prompts_${new Date().toISOString().slice(0, 10)}.csv`, preferencesRows, headers)
  }

  return (
    <div className="prompts-admin-page">
      <header className="prompts-admin-header">
        <Link to="/" className="prompts-admin-logo">PetMatch</Link>
        <nav>
          {user && isSuperAdminAccount(user) ? (
            <SuperAdminNavLinks />
          ) : (
            <>
              <Link to="/admin">Pet Dashboard</Link>
              <span className="user-name">{user?.name}</span>
              <button type="button" className="logout-btn" onClick={() => logout()}>Logout</button>
            </>
          )}
        </nav>
      </header>

      <main className="prompts-admin-main">
        <h1>Prompts (AI Recommendation History)</h1>
        <p className="prompts-admin-sub">View submitted AI form details. Delete entries or export as CSV.</p>

        <div className="prompts-admin-actions">
          <button type="button" onClick={fetchAll} className="secondary-btn">
            Refresh
          </button>
          <button type="button" onClick={handleExportCsv} className="primary-btn" disabled={history.length === 0}>
            Export CSV
          </button>
        </div>

        {error && <p className="error">{error}</p>}

        {loading ? (
          <p>Loading prompts...</p>
        ) : history.length === 0 ? (
          <p className="muted">No prompt submissions yet.</p>
        ) : (
          <div className="prompts-admin-table-wrap">
            <table className="prompts-admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Date</th>
                  <th>User</th>
                  <th>Pet Type</th>
                  <th>Breed</th>
                  <th>Activity</th>
                  <th>Noise</th>
                  <th>Grooming</th>
                  <th>Space</th>
                  <th>Temperament</th>
                  <th>Children</th>
                  <th>Other Pets</th>
                  <th>Pet IDs</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {preferencesRows.map(row => {
                  const createdAtMs = row.createdAt
                  const dateLabel = createdAtMs ? new Date(createdAtMs).toLocaleString() : '-'
                  return (
                    <tr key={row.id}>
                      <td><code>{row.id}</code></td>
                      <td>{dateLabel}</td>
                      <td>{row.userEmail}</td>
                      <td>{row.petType || '-'}</td>
                      <td>{row.breed || '-'}</td>
                      <td>{row.activity_level || '-'}</td>
                      <td>{row.noise_level || '-'}</td>
                      <td>{row.grooming_needs || '-'}</td>
                      <td>{row.space_required || '-'}</td>
                      <td>{row.temperament || '-'}</td>
                      <td>{row.good_with_children || '-'}</td>
                      <td>{row.good_with_other_pets || '-'}</td>
                      <td className="ai-petids">{row.petIds || '-'}</td>
                      <td className="actions">
                        <button type="button" className="btn-delete" onClick={() => handleDelete(row.id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}

export default PromptsAdminPage

