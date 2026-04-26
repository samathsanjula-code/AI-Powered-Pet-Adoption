import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { SuperAdminNavLinks } from '../components/SuperAdminNav'
import { isSuperAdminAccount } from '../utils/superAdminNav'
import { API_BASE } from '../api'
import NotificationDropdown from '../components/NotificationDropdown'
import './SellerAdminDashboardPage.css'

const CATEGORIES = ['Pet Care', 'Food']
const ORDER_STATUSES = ['ORDER_CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']

function SellerAdminDashboardPage() {
  const { user, logout } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [orders, setOrders] = useState([])
  const [activeTab, setActiveTab] = useState('items')
  const fileInputRef = useRef(null)
  const editFileInputRef = useRef(null)
  const [formError, setFormError] = useState('')

  const [form, setForm] = useState({
    title: '',
    category: 'Pet Care',
    description: '',
    price: '',
    brand: '',
    quantityInStock: '',
    suitableFor: '',
    images: null
  })

  useEffect(() => {
    fetchItems()
    fetchOrders()
  }, [])

  const fetchItems = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/seller-items`)
      if (res.ok) {
        const data = await res.json()
        setItems(data)
      }
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const fetchOrders = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/seller-orders/admin`)
      if (res.ok) {
        const data = await res.json()
        setOrders(data)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const updateOrderStatus = async (orderId, status) => {
    try {
      const res = await fetch(`${API_BASE}/api/seller-orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      const data = await res.json()
      if (res.ok) {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? data : o)))
      } else {
        alert(data.message || 'Could not update status')
      }
    } catch (err) {
      alert('Request failed')
    }
  }

  const resetForm = () => {
    setFormError('')
    setForm({
      title: '',
      category: 'Pet Care',
      description: '',
      price: '',
      brand: '',
      quantityInStock: '',
      suitableFor: '',
      images: null
    })
    setEditingId(null)
    setShowForm(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (editFileInputRef.current) editFileInputRef.current.value = ''
  }

  const handleAddSubmit = async (e) => {
    e.preventDefault()
    setFormError('')

    const quantityNum = Number(form.quantityInStock)
    if (!Number.isFinite(quantityNum) || quantityNum <= 0) {
      setFormError('Quantity in stock cannot be zero. Please enter a value of at least 1.')
      return
    }

    const formData = new FormData()
    formData.append('title', form.title.trim())
    formData.append('category', form.category)
    formData.append('description', form.description.trim())
    formData.append('price', Number(form.price) || 0)
    formData.append('brand', form.brand.trim())
    formData.append('quantityInStock', quantityNum)
    formData.append('suitableFor', form.suitableFor.trim())
    if (form.images && form.images.length > 0) {
      for (let i = 0; i < form.images.length; i++) {
        formData.append('images', form.images[i])
      }
    }
    try {
      const res = await fetch(`${API_BASE}/api/seller-items`, {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      if (res.ok && data.id) {
        setItems(prev => [data, ...prev])
        resetForm()
      } else {
        alert(data.message || 'Failed to add item')
      }
    } catch (err) {
      alert('Request failed')
    }
  }

  const handleEdit = (item) => {
    setEditingId(item.id)
    setForm({
      title: item.title || '',
      category: item.category || 'Pet Care',
      description: item.description || '',
      price: item.price != null ? String(item.price) : '',
      brand: item.brand || '',
      quantityInStock: item.quantityInStock != null ? String(item.quantityInStock) : '',
      suitableFor: item.suitableFor || '',
      images: null
    })
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (!editingId) return
    setFormError('')

    const quantityNum = Number(form.quantityInStock)
    if (!Number.isFinite(quantityNum) || quantityNum <= 0) {
      setFormError('Quantity in stock cannot be zero. Please enter a value of at least 1.')
      return
    }

    const formData = new FormData()
    formData.append('title', form.title.trim())
    formData.append('category', form.category)
    formData.append('description', form.description.trim())
    formData.append('price', Number(form.price) || 0)
    formData.append('brand', form.brand.trim())
    formData.append('quantityInStock', quantityNum)
    formData.append('suitableFor', form.suitableFor.trim())
    if (form.images && form.images.length > 0) {
      for (let i = 0; i < form.images.length; i++) {
        formData.append('images', form.images[i])
      }
    }
    try {
      const res = await fetch(`${API_BASE}/api/seller-items/${editingId}`, {
        method: 'PUT',
        body: formData
      })
      const data = await res.json()
      if (res.ok && data.id) {
        setItems(prev => prev.map(p => p.id === editingId ? data : p))
        resetForm()
      } else {
        alert(data.message || 'Failed to update')
      }
    } catch (err) {
      alert('Request failed')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this item?')) return
    try {
      const res = await fetch(`${API_BASE}/api/seller-items/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setItems(prev => prev.filter(p => p.id !== id))
      }
    } catch (e) {}
  }

  const isEditing = editingId != null

  if (loading) {
    return (
      <div className="seller-admin-page">
        <p className="seller-admin-loading">Loading...</p>
      </div>
    )
  }

  return (
    <div className="seller-admin-page">
      <header className="seller-admin-header">
        <Link to="/" className="seller-admin-logo">PetMatch</Link>
        <nav>
          {user && isSuperAdminAccount(user) ? (
            <SuperAdminNavLinks />
          ) : (
            <>
              <Link to="/">Home</Link>
              <Link to="/seller">Seller</Link>
              <Link to="/seller-admin" className="active">Seller Admin</Link>
              <div className="seller-admin-user-group">
                <NotificationDropdown userId={user?.id} />
                <span className="seller-admin-user">{user?.name}</span>
                <button type="button" className="seller-admin-logout" onClick={() => logout()}>Logout</button>
              </div>
            </>
          )}
        </nav>
      </header>

      <main className="seller-admin-main">
        <div className="seller-admin-head">
          <div>
            <h1>Seller Admin Dashboard</h1>
            <p className="seller-admin-sub">Manage pet care items and foods. They appear on the Seller page for signed-in users.</p>
          </div>
          {!isEditing && activeTab === 'items' && (
            <button type="button" className="seller-admin-add-btn" onClick={() => { setShowForm(true); setForm({ title: '', category: 'Pet Care', description: '', price: '', brand: '', quantityInStock: '', suitableFor: '', images: null }); }}>
              + Add Item
            </button>
          )}
        </div>

        <div className="seller-admin-form-actions">
          <button type="button" className={activeTab === 'items' ? 'seller-admin-btn-primary' : 'seller-admin-btn-secondary'} onClick={() => setActiveTab('items')}>Manage Items</button>
          <button type="button" className={activeTab === 'orders' ? 'seller-admin-btn-primary' : 'seller-admin-btn-secondary'} onClick={() => setActiveTab('orders')}>Manage Orders</button>
        </div>

        {/* Add / Edit form */}
        {activeTab === 'items' && (showForm || isEditing) && (
          <section className="seller-admin-form-section">
            <h2>{isEditing ? 'Edit Item' : 'Add New Item'}</h2>
            {formError && <p className="error">{formError}</p>}
            <form onSubmit={isEditing ? handleEditSubmit : handleAddSubmit} className="seller-admin-form">
              <div className="seller-admin-form-row">
                <label>Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Organic Dog Food 5kg"
                  required
                />
              </div>
              <div className="seller-admin-form-row">
                <label>Category *</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="seller-admin-form-row">
                <label>Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Full product description..."
                  rows={4}
                />
              </div>
              <div className="seller-admin-form-grid">
                <div className="seller-admin-form-row">
                  <label>Price ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="seller-admin-form-row">
                  <label>Quantity in stock</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.quantityInStock}
                    onChange={e => setForm(f => ({ ...f, quantityInStock: e.target.value }))}
                    placeholder="1"
                  />
                </div>
              </div>
              <div className="seller-admin-form-row">
                <label>Brand</label>
                <input
                  type="text"
                  value={form.brand}
                  onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                  placeholder="Brand name"
                />
              </div>
              <div className="seller-admin-form-row">
                <label>Suitable for</label>
                <input
                  type="text"
                  value={form.suitableFor}
                  onChange={e => setForm(f => ({ ...f, suitableFor: e.target.value }))}
                  placeholder="e.g. Dogs, Cats, All pets"
                />
              </div>
              <div className="seller-admin-form-row">
                <label>Images</label>
                <input
                  ref={isEditing ? editFileInputRef : fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={e => setForm(f => ({ ...f, images: e.target.files }))}
                />
                {isEditing && <span className="seller-admin-form-hint">Leave empty to keep current images</span>}
              </div>
              <div className="seller-admin-form-actions">
                <button type="submit" className="seller-admin-btn-primary">{isEditing ? 'Save changes' : 'Add item'}</button>
                <button type="button" className="seller-admin-btn-secondary" onClick={resetForm}>Cancel</button>
              </div>
            </form>
          </section>
        )}

        {activeTab === 'items' ? (
          <section className="seller-admin-list">
            <h2>Current items</h2>
            {items.length === 0 ? (
              <p className="seller-admin-no-data">No items yet. Add one above.</p>
            ) : (
              <div className="seller-admin-table-wrap">
                <table className="seller-admin-table">
                  <thead>
                    <tr>
                      <th>Image</th>
                      <th>Title</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Stock</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => (
                      <tr key={item.id}>
                        <td>
                          {(item.imagePaths && item.imagePaths[0]) ? (
                            <img src={`${API_BASE}${item.imagePaths[0]}`} alt="" className="seller-admin-thumb" onError={e => e.target.style.display = 'none'} />
                          ) : (
                            <span className="seller-admin-no-img">—</span>
                          )}
                        </td>
                        <td>{item.title}</td>
                        <td>{item.category}</td>
                        <td>${Number(item.price).toFixed(2)}</td>
                        <td>{item.quantityInStock ?? '—'}</td>
                        <td>
                          <button type="button" className="seller-admin-btn-edit" onClick={() => handleEdit(item)}>Edit</button>
                          <button type="button" className="seller-admin-btn-delete" onClick={() => handleDelete(item.id)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : (
          <section className="seller-admin-list">
            <h2>Orders</h2>
            {orders.length === 0 ? (
              <p className="seller-admin-no-data">No orders yet.</p>
            ) : (
              <div className="seller-admin-table-wrap">
                <table className="seller-admin-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Customer</th>
                      <th>Items</th>
                      <th>Total</th>
                      <th>Current Status</th>
                      <th>Change Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id}>
                        <td>
                          #{order.id}
                          <br />
                          <small>{new Date(order.createdAt).toLocaleString()}</small>
                        </td>
                        <td>
                          {order.userName}
                          <br />
                          <small>{order.userEmail}</small>
                        </td>
                        <td>
                          {(order.items || []).map((i) => (
                            <div key={i.id}>{i.itemTitle} x {i.quantity}</div>
                          ))}
                        </td>
                        <td>${Number(order.totalAmount).toFixed(2)}</td>
                        <td>{order.status}</td>
                        <td>
                          <select value={order.status} onChange={(e) => updateOrderStatus(order.id, e.target.value)}>
                            {ORDER_STATUSES.map((status) => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>

      <footer className="seller-admin-footer">
        <p>© PetMatch Seller Admin</p>
      </footer>
    </div>
  )
}

export default SellerAdminDashboardPage
