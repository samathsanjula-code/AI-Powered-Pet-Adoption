import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { SuperAdminNavLinks } from '../components/SuperAdminNav'
import { isSuperAdminAccount } from '../utils/superAdminNav'
import { API_BASE } from '../api'
import './AdoptionAdminDashboardPage.css'

function AdoptionAdminDashboardPage() {
  const { user, logout } = useAuth()
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => {
    fetchApplications()
  }, [])

  const fetchApplications = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/adoption-applications`)
      if (res.ok) {
        const data = await res.json()
        setApplications(data)
      }
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const handleStatus = async (id, status) => {
    try {
      const res = await fetch(`${API_BASE}/api/adoption-applications/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      if (res.ok) {
        const data = await res.json()
        setApplications(prev => prev.map(a => a.id === id ? data : a))
      }
    } catch (e) {}
  }

  const filtered = filterStatus === 'all'
    ? applications
    : applications.filter(a => a.status === filterStatus)

  if (loading) return <div className="adoption-admin-page"><p className="loading">Loading...</p></div>

  return (
    <div className="adoption-admin-page">
      <header className="adoption-admin-header">
        <Link to="/" className="adoption-admin-logo">PetMatch</Link>
        <nav>
          {user && isSuperAdminAccount(user) ? (
            <SuperAdminNavLinks />
          ) : (
            <>
              <Link to="/">Home</Link>
              <Link to="/pet-search">Pet Search</Link>
              <Link to="/adoption-admin" className="active">Adoption Admin</Link>
              <div className="adoption-admin-nav-user">
                <span>{user?.name}</span>
                <button type="button" className="logout-btn" onClick={() => logout()}>Logout</button>
              </div>
            </>
          )}
        </nav>
      </header>

      <main className="adoption-admin-main">
        <h1>Adoption Applications</h1>
        <p className="adoption-admin-sub">Review and approve or reject adoption requests.</p>

        <div className="adoption-admin-filters">
          <label>Status:</label>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">All</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        <div className="adoption-admin-table-wrap">
          <table className="adoption-admin-table">
            <thead>
              <tr>
                <th>App ID</th>
                <th>Pet</th>
                <th>Applicant</th>
                <th>Contact</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(app => (
                <tr key={app.id}>
                  <td><code>{app.applicationId}</code></td>
                  <td>{app.petName || '—'} ({app.petCategory || '—'})</td>
                  <td>{app.applicantName}</td>
                  <td>{app.applicantEmail}<br />{app.applicantPhone || '—'}</td>
                  <td>
                    <span className={`status-badge status-${app.status.toLowerCase()}`}>{app.status}</span>
                  </td>
                  <td>
                    {app.status === 'PENDING' && (
                      <>
                        <button type="button" className="btn-approve" onClick={() => handleStatus(app.id, 'APPROVED')}>Approve</button>
                        <button type="button" className="btn-reject" onClick={() => handleStatus(app.id, 'REJECTED')}>Reject</button>
                      </>
                    )}
                    {app.status !== 'PENDING' && <span className="no-action">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && <p className="no-data">No applications match the filter.</p>}
      </main>

      <footer className="adoption-admin-footer">
        <p>© PetMatch Adoption Admin</p>
      </footer>
    </div>
  )
}

export default AdoptionAdminDashboardPage
