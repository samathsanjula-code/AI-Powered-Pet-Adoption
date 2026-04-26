import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { SuperAdminNavLinks } from '../components/SuperAdminNav'
import { isSuperAdminAccount } from '../utils/superAdminNav'
import { API_BASE } from '../api'
import './UserManagementAdminPage.css'

function UserManagementAdminPage() {
  const { user, logout } = useAuth()
  const [users, setUsers] = useState([])
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', email: '', role: '' })

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      const [usersRes, requestsRes] = await Promise.all([
        fetch(`${API_BASE}/api/users`),
        fetch(`${API_BASE}/api/users/forgot-password-requests`)
      ])

      if (!usersRes.ok || !requestsRes.ok) {
        setError('Could not load user management data')
        return
      }

      const usersData = await usersRes.json()
      const requestsData = await requestsRes.json()
      setUsers(usersData)
      setRequests(requestsData)
    } catch (err) {
      setError('Could not connect to server')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return users
    return users.filter((u) =>
      [u.name, u.email, u.role, String(u.id)].some((field) =>
        (field || '').toLowerCase().includes(query)
      )
    )
  }, [users, search])

  const startEdit = (u) => {
    setEditingId(u.id)
    setEditForm({
      name: u.name || '',
      email: u.email || '',
      role: u.role || 'Adopter'
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({ name: '', email: '', role: '' })
  }

  const saveEdit = async (id) => {
    setInfo('')
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || 'Could not update user')
        return
      }
      setUsers((prev) => prev.map((u) => (u.id === id ? data : u)))
      setInfo('User details updated')
      cancelEdit()
    } catch (err) {
      setError('Could not connect to server')
    }
  }

  const toggleActive = async (u) => {
    setInfo('')
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/users/${u.id}/active`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !u.active })
      })
      if (!res.ok) {
        setError('Could not update account status')
        return
      }
      const updated = await res.json()
      setUsers((prev) => prev.map((item) => (item.id === u.id ? updated : item)))
      setInfo(updated.active ? 'Account activated' : 'Account deactivated')
    } catch (err) {
      setError('Could not connect to server')
    }
  }

  const handleRequestAction = async (id, action) => {
    setInfo('')
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/users/${id}/${action}`, { method: 'POST' })
      if (!res.ok) {
        setError('Could not process password request')
        return
      }
      const updated = await res.json()
      setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)))
      setRequests((prev) => prev.filter((r) => r.id !== id))
      setInfo(action === 'approve-forgot-password' ? 'Password request approved' : 'Password request rejected')
    } catch (err) {
      setError('Could not connect to server')
    }
  }

  return (
    <div className="user-mgmt-page">
      <header className="user-mgmt-header">
        <Link to="/" className="user-mgmt-logo">PetMatch</Link>
        <nav>
          {user && isSuperAdminAccount(user) ? (
            <SuperAdminNavLinks />
          ) : (
            <>
              <Link to="/admin">Pet Dashboard</Link>
              <Link to="/admin/user-management" className="active">User Management</Link>
              <span className="user-name">{user?.name}</span>
              <button type="button" className="logout-btn" onClick={() => logout()}>Logout</button>
            </>
          )}
        </nav>
      </header>

      <main className="user-mgmt-main">
        <h1>User Management</h1>
        <p className="user-mgmt-sub">Approve password reset requests and manage user accounts.</p>

        {error && <p className="error">{error}</p>}
        {info && <p className="info">{info}</p>}

        <section className="panel">
          <div className="panel-head">
            <h2>Forgot Password Requests</h2>
            <button type="button" onClick={fetchData}>Refresh</button>
          </div>

          {loading ? (
            <p>Loading requests...</p>
          ) : requests.length === 0 ? (
            <p>No pending requests.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((u) => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td>{u.name || '-'}</td>
                    <td>{u.email}</td>
                    <td>{u.role || '-'}</td>
                    <td><span className="tag pending">Pending</span></td>
                    <td className="actions">
                      <button onClick={() => handleRequestAction(u.id, 'approve-forgot-password')}>Approve</button>
                      <button className="muted" onClick={() => handleRequestAction(u.id, 'reject-forgot-password')}>Reject</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>All Users</h2>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, role, or id"
            />
          </div>

          {loading ? (
            <p>Loading users...</p>
          ) : filteredUsers.length === 0 ? (
            <p>No users found.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Account Status</th>
                  <th>Password Reset</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id}>
                    {editingId === u.id ? (
                      <>
                        <td>{u.id}</td>
                        <td><input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} /></td>
                        <td><input value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} /></td>
                        <td>
                          <select value={editForm.role} onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}>
                            <option value="Adopter">Adopter</option>
                            <option value="Seller">Seller</option>
                            <option value="Volunteer/Shelter">Volunteer/Shelter</option>
                            <option value="Admin">Admin</option>
                            <option value="PetAdmin">PetAdmin</option>
                            <option value="SellerAdmin">SellerAdmin</option>
                            <option value="AdoptionAdmin">AdoptionAdmin</option>
                          </select>
                        </td>
                        <td>{u.active ? <span className="tag active">Active</span> : <span className="tag inactive">Inactive</span>}</td>
                        <td>{u.forgotPasswordRequested ? <span className="tag pending">Pending</span> : '-'}</td>
                        <td className="actions">
                          <button onClick={() => saveEdit(u.id)}>Save</button>
                          <button className="muted" onClick={cancelEdit}>Cancel</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{u.id}</td>
                        <td>{u.name || '-'}</td>
                        <td>{u.email}</td>
                        <td>{u.role || '-'}</td>
                        <td>{u.active ? <span className="tag active">Active</span> : <span className="tag inactive">Inactive</span>}</td>
                        <td>{u.forgotPasswordRequested ? <span className="tag pending">Pending</span> : '-'}</td>
                        <td className="actions">
                          <button onClick={() => startEdit(u)}>Rename/Edit</button>
                          <button className="muted" onClick={() => toggleActive(u)}>
                            {u.active ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </div>
  )
}

export default UserManagementAdminPage
