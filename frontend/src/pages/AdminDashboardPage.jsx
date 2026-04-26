import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { SuperAdminNavLinks } from '../components/SuperAdminNav'
import { isSuperAdminAccount } from '../utils/superAdminNav'
import './AdminDashboardPage.css'

import { API_BASE } from '../api'

const DEFAULT_PET_CLIPART = 'https://img.freepik.com/free-vector/group-cute-smiley-pets_23-2148512151.jpg?semt=ais_hybrid&w=740&q=80'
const PETS_PER_PAGE = 10

function getPetImageSrc(pet) {
  if (pet?.imagePaths && pet.imagePaths[0]) return `${API_BASE}${pet.imagePaths[0]}`
  if (pet?.imageLocation) return pet.imageLocation
  return DEFAULT_PET_CLIPART
}

function isFlagEnabled(v) {
  return v === true || v === 'true' || Number(v) === 1
}

function ageMonthsToParts(ageMonths) {
  const m = Number(ageMonths)
  if (!Number.isFinite(m) || m < 0) return { years: '', months: '' }
  return { years: String(Math.floor(m / 12)), months: String(m % 12) }
}

function buildPaginationItems(totalPages, currentPage) {
  if (totalPages <= 6) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const items = [1]
  const start = Math.max(2, currentPage - 1)
  const end = Math.min(totalPages - 1, currentPage + 1)

  if (start > 2) items.push('...')
  for (let p = start; p <= end; p += 1) items.push(p)
  if (end < totalPages - 1) items.push('...')
  items.push(totalPages)

  return items
}

function AdminDashboardPage() {
  const { user, logout } = useAuth()
  const [pets, setPets] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [editError, setEditError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    fetchPets()
  }, [])

  const fetchPets = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/pets`)
      if (res.ok) {
        const data = await res.json()
        setPets(data)
      }
    } catch (e) {}
    setLoading(false)
  }

  // Backend already sorts by newest first, but we also sort here to guarantee
  // newly added pets always appear on top.
  const sortedPets = useMemo(() => {
    return [...pets].sort((a, b) => {
      const aId = Number(a?.id ?? a?.PetID ?? 0)
      const bId = Number(b?.id ?? b?.PetID ?? 0)
      return bId - aId
    })
  }, [pets])

  const totalPages = Math.max(1, Math.ceil(sortedPets.length / PETS_PER_PAGE))

  const paginatedPets = useMemo(() => {
    const page = Math.min(currentPage, totalPages)
    const start = (page - 1) * PETS_PER_PAGE
    return sortedPets.slice(start, start + PETS_PER_PAGE)
  }, [sortedPets, currentPage, totalPages])

  const paginationItems = useMemo(() => buildPaginationItems(totalPages, currentPage), [totalPages, currentPage])

  useEffect(() => {
    setCurrentPage(p => Math.min(p, totalPages))
  }, [totalPages])

  const handleDelete = async (id) => {
    if (!confirm('Delete this pet registration?')) return
    try {
      const res = await fetch(`${API_BASE}/api/pets/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setPets(prev => prev.filter(p => p.id !== id))
      }
    } catch (e) {}
  }

  const startEdit = (pet) => {
    setEditingId(pet.id)
    setEditError('')
    const ageParts = ageMonthsToParts(pet.ageMonths)
    setEditForm({
      registrationType: pet.registrationType || 'Home Pet',
      petType: pet.petType || 'Dog',
      breed: pet.breed || '',
      ageYears: ageParts.years,
      ageMonths: ageParts.months,
      color: pet.color || '',
      size: pet.size || 'Medium',
      weightKg: pet.weightKg != null ? String(pet.weightKg) : '',
      vaccinated: isFlagEnabled(pet.vaccinated) ? 'yes' : 'no',
      previousOwner: isFlagEnabled(pet.previousOwner) ? 'yes' : 'no',
      imageLocation: pet.imageLocation || '',
      contactName: pet.contactName || '',
      phoneNumber: pet.phoneNumber || '',
      healthCondition: Number(pet.healthCondition) === 1 ? 'Healthy & Active' : 'Needs Care'
    })
  }

  const handleEditSave = async () => {
    if (!editingId) return
    setEditError('')
    const breed = (editForm.breed || '').trim()
    const color = (editForm.color || '').trim()
    const contactName = (editForm.contactName || '').trim()
    const phoneNumber = (editForm.phoneNumber || '').trim()
    const yearsNum = Number(editForm.ageYears)
    const monthsNum = Number(editForm.ageMonths)
    const weightNum = Number(editForm.weightKg)
    const totalMonths = yearsNum * 12 + monthsNum

    if (!breed || !color || !contactName || !phoneNumber) {
      setEditError('Breed, color, contact name, and phone number are required.')
      return
    }
    if (!Number.isInteger(yearsNum) || yearsNum < 0 || !Number.isInteger(monthsNum) || monthsNum < 0 || monthsNum > 11) {
      setEditError('Age must be valid. Years must be 0 or more, and months must be 0-11.')
      return
    }
    if (totalMonths <= 0) {
      setEditError('Pet age must be greater than 0 months.')
      return
    }
    if (!Number.isFinite(weightNum) || weightNum <= 0 || weightNum > 200) {
      setEditError('Weight must be a valid number between 0.01 and 200 KG.')
      return
    }
    if (!/^0\d{9}$/.test(phoneNumber)) {
      setEditError('Phone number must be 10 digits and start with 0.')
      return
    }
    if (!['Healthy & Active', 'Needs Care'].includes(editForm.healthCondition)) {
      setEditError('Please select a valid health condition.')
      return
    }

    try {
      const formData = new FormData()
      formData.append('registrationType', editForm.registrationType || 'Home Pet')
      formData.append('petType', editForm.petType || 'Dog')
      formData.append('breed', breed)
      formData.append('ageYears', String(yearsNum))
      formData.append('ageMonths', String(monthsNum))
      formData.append('color', color)
      formData.append('size', editForm.size || 'Medium')
      formData.append('weightKg', String(weightNum))
      formData.append('vaccinated', editForm.vaccinated === 'yes' ? 'yes' : 'no')
      formData.append('previousOwner', editForm.previousOwner === 'yes' ? 'yes' : 'no')
      formData.append('healthCondition', editForm.healthCondition)
      formData.append('contactName', contactName)
      formData.append('phoneNumber', phoneNumber)
      if ((editForm.imageLocation || '').trim()) formData.append('imageLocation', editForm.imageLocation.trim())

      const res = await fetch(`${API_BASE}/api/pets/${editingId}`, {
        method: 'PUT',
        body: formData
      })
      if (res.ok) {
        const updated = await res.json()
        setPets(prev => prev.map(p => p.id === editingId ? updated : p))
        setEditingId(null)
      } else {
        setEditError('Could not save changes. Please check values and try again.')
      }
    } catch (e) {
      setEditError('Could not save changes. Please check values and try again.')
    }
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditError('')
  }

  if (loading) return <div className="admin-page"><p className="loading">Loading...</p></div>

  return (
    <div className="admin-page">
      <header className="admin-header">
        <Link to="/" className="admin-logo">PetMatch</Link>
        <nav>
          {user && isSuperAdminAccount(user) ? (
            <SuperAdminNavLinks />
          ) : (
            <>
              <Link to="/">Home</Link>
              <Link to="/volunteer">Register</Link>
              <Link to="/admin" className="active">Admin</Link>
              {user?.role === 'Admin' && <Link to="/admin/user-management">User Management</Link>}
              <span className="user-name">{user?.name}</span>
              <button type="button" className="logout-btn" onClick={() => logout()}>Logout</button>
            </>
          )}
        </nav>
      </header>

      <main className="admin-main">
        <h1>Pet Registrations Dashboard</h1>
        <p className="admin-sub">View and manage all pet registration submissions</p>

        <div className="pets-table-wrap">
          <table className="pets-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Photo</th>
                <th>Type</th>
                <th>Pet Type</th>
                <th>Breed</th>
                <th>Age (Months)</th>
                <th>Color</th>
                <th>Size</th>
                <th>Weight (KG)</th>
                <th>Health</th>
                <th>Vaccinated</th>
                <th>Previously Owned</th>
                <th>Registered By</th>
                <th>Contact</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPets.map(pet => (
                <tr key={pet.id}>
                  {editingId === pet.id ? (
                    <td colSpan={15} className="admin-edit-cell">
                      <div className="admin-edit-panel">
                        <div className="admin-edit-head">
                          <strong>Editing Pet #{pet.id}</strong>
                          <div className="admin-edit-head-right">
                            <span>Registered by: {pet.userName || '-'}</span>
                            <div className="admin-edit-actions top-corner">
                              <button className="btn-save" onClick={handleEditSave}>Save</button>
                              <button className="btn-cancel" onClick={cancelEdit}>Cancel</button>
                            </div>
                          </div>
                        </div>

                        <div className="admin-edit-grid">
                          <label>Registration Type
                            <select className="admin-field-select" value={editForm.registrationType || 'Home Pet'} onChange={e => setEditForm(f => ({ ...f, registrationType: e.target.value }))}>
                              <option value="Home Pet">Home Pet</option>
                              <option value="Rescued Stray">Rescued Stray</option>
                            </select>
                          </label>
                          <label>Pet Type
                            <select className="admin-field-select" value={editForm.petType || 'Dog'} onChange={e => setEditForm(f => ({ ...f, petType: e.target.value }))}>
                              <option value="Dog">Dog</option>
                              <option value="Cat">Cat</option>
                              <option value="Rabbit">Rabbit</option>
                              <option value="Bird">Bird</option>
                            </select>
                          </label>
                          <label>Breed
                            <input value={editForm.breed || ''} onChange={e => setEditForm(f => ({ ...f, breed: e.target.value }))} placeholder="Breed" />
                          </label>
                          <label>Age (Years)
                            <input type="number" min="0" step="1" value={editForm.ageYears || ''} onChange={e => setEditForm(f => ({ ...f, ageYears: e.target.value }))} placeholder="Years" />
                          </label>
                          <label>Age (Months)
                            <input type="number" min="0" max="11" step="1" value={editForm.ageMonths || ''} onChange={e => setEditForm(f => ({ ...f, ageMonths: e.target.value }))} placeholder="Months (0-11)" />
                          </label>
                          <label>Color
                            <input value={editForm.color || ''} onChange={e => setEditForm(f => ({ ...f, color: e.target.value }))} placeholder="Color" />
                          </label>
                          <label>Size
                            <select className="admin-field-select" value={editForm.size || 'Medium'} onChange={e => setEditForm(f => ({ ...f, size: e.target.value }))}>
                              <option value="Small">Small</option>
                              <option value="Medium">Medium</option>
                              <option value="Large">Large</option>
                            </select>
                          </label>
                          <label>Weight (KG)
                            <input type="number" min="0.01" max="200" step="0.01" value={editForm.weightKg || ''} onChange={e => setEditForm(f => ({ ...f, weightKg: e.target.value }))} placeholder="e.g. 5.25" />
                          </label>
                          <label>Health Condition
                            <select className="admin-field-select" value={editForm.healthCondition || ''} onChange={e => setEditForm(f => ({ ...f, healthCondition: e.target.value }))}>
                              <option value="">Select health</option>
                              <option value="Healthy & Active">Healthy & Active</option>
                              <option value="Needs Care">Needs Care</option>
                            </select>
                          </label>
                          <label>Vaccinated
                            <select className="admin-field-select" value={editForm.vaccinated || 'no'} onChange={e => setEditForm(f => ({ ...f, vaccinated: e.target.value }))}>
                              <option value="yes">Yes</option>
                              <option value="no">No</option>
                            </select>
                          </label>
                          <label>Previously Owned
                            <select className="admin-field-select" value={editForm.previousOwner || 'no'} onChange={e => setEditForm(f => ({ ...f, previousOwner: e.target.value }))}>
                              <option value="yes">Yes</option>
                              <option value="no">No</option>
                            </select>
                          </label>
                          <label>Contact Name
                            <input value={editForm.contactName} onChange={e => setEditForm(f => ({ ...f, contactName: e.target.value }))} placeholder="Contact name" />
                          </label>
                          <label>Phone Number
                            <input value={editForm.phoneNumber} onChange={e => setEditForm(f => ({ ...f, phoneNumber: e.target.value.replace(/\D/g, '').slice(0, 10) }))} placeholder="0712345678" inputMode="numeric" />
                          </label>
                          <label>Image location
                            <input value={editForm.imageLocation || ''} onChange={e => setEditForm(f => ({ ...f, imageLocation: e.target.value }))} placeholder={DEFAULT_PET_CLIPART} />
                          </label>
                        </div>
                        {editError && <p className="admin-edit-error">{editError}</p>}
                      </div>
                    </td>
                  ) : (
                    <>
                      <td>{pet.id}</td>
                      <td>
                        <img src={getPetImageSrc(pet)} alt="" className="thumb" onError={e => { e.currentTarget.src = DEFAULT_PET_CLIPART }} />
                      </td>
                      <td>{pet.registrationType}</td>
                      <td>{pet.petType || '-'}</td>
                      <td>{pet.breed || '-'}</td>
                      <td>{pet.ageMonths != null ? pet.ageMonths : '-'}</td>
                      <td>{pet.color || '-'}</td>
                      <td>{pet.size || '-'}</td>
                      <td>{pet.weightKg != null ? Number(pet.weightKg).toFixed(2) : '-'}</td>
                      <td>{Number(pet.healthCondition) === 1 ? 'Healthy & Active' : 'Needs Care'}</td>
                      <td>{isFlagEnabled(pet.vaccinated) ? 'Yes' : 'No'}</td>
                      <td>{isFlagEnabled(pet.previousOwner) ? 'Yes' : 'No'}</td>
                      <td>{pet.userName || '-'}</td>
                      <td>{pet.contactName} / {pet.phoneNumber}</td>
                      <td className="actions-col">
                        <button className="btn-edit" onClick={() => startEdit(pet)}>Edit</button>
                        <button className="btn-delete" onClick={() => handleDelete(pet.id)}>Delete</button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pets.length === 0 && <p className="no-data">No pet registrations yet.</p>}

        {pets.length > 0 && totalPages > 1 && (
          <div className="admin-pagination">
            <button
              type="button"
              className="admin-page-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            >
              Prev
            </button>

            {paginationItems.map((item, idx) => item === '...' ? (
              <span key={`ellipsis-${idx}`} className="admin-page-ellipsis">...</span>
            ) : (
              <button
                key={item}
                type="button"
                className={`admin-page-btn ${currentPage === item ? 'active' : ''}`}
                onClick={() => setCurrentPage(item)}
              >
                {item}
              </button>
            ))}

            <button
              type="button"
              className="admin-page-btn"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        )}
      </main>

      <footer className="admin-footer">
        <p>© 2024 PetMatch Platform. All rights reserved.</p>
      </footer>
    </div>
  )
}

export default AdminDashboardPage
