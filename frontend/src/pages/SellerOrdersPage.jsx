import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { SuperAdminNavLinks } from '../components/SuperAdminNav'
import { isSuperAdminAccount } from '../utils/superAdminNav'
import { API_BASE } from '../api'
import NotificationDropdown from '../components/NotificationDropdown'
import './SellerOrdersPage.css'

function SellerOrdersPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const fetchOrders = async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/seller-orders/my/${user.id}`)
      if (!res.ok) {
        setError('Could not load orders')
        return
      }
      const data = await res.json()
      setOrders(data)
    } catch {
      setError('Could not connect to server')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [user?.id])

  const cancelOrder = async (orderId) => {
    const confirmed = window.confirm('Are you sure you want to cancel this order?')
    if (!confirmed) return
    try {
      const res = await fetch(`${API_BASE}/api/seller-orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, reason: 'Cancelled by user from orders page' })
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.message || 'Could not cancel')
        return
      }
      setMessage('Order cancelled successfully')
      setTimeout(() => setMessage(''), 1800)
      fetchOrders()
    } catch {
      setError('Could not connect to server')
    }
  }

  return (
    <div className="seller-orders-page">
      {user && isSuperAdminAccount(user) && (
        <header className="seller-orders-app-nav">
          <Link to="/" className="seller-orders-app-logo">PetMatch</Link>
          <nav>
            <SuperAdminNavLinks />
          </nav>
        </header>
      )}
      <header className="seller-orders-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/seller" className="orders-back-btn">Back to Seller</Link>
          <h1 style={{ margin: 0 }}>My Orders</h1>
        </div>
        <NotificationDropdown userId={user?.id} />
      </header>

      <main className="seller-orders-main">
        {message && <p className="orders-success">{message}</p>}
        {loading ? (
          <p>Loading...</p>
        ) : orders.length === 0 ? (
          <p>No orders yet.</p>
        ) : (
          orders.map((order) => (
            <section key={order.id} className="order-card">
              <div className="order-head">
                <div className="order-head-main">
                  <strong>Order #{order.id}</strong>
                  <p className="order-date">{new Date(order.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <span className={`order-status ${String(order.status).toLowerCase()}`}>{order.status}</span>
                </div>
              </div>

              <div className="order-items-block">
                <h4>Items</h4>
                <div className="order-lines">
                  {order.items?.map((line) => (
                    <div key={line.id} className="order-line">
                      <div className="order-line-title">{line.itemTitle}</div>
                      <div className="order-line-meta">Qty: {line.quantity}</div>
                      <div className="order-line-total">${Number(line.lineTotal).toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="order-meta-grid">
                <div className="order-meta-card">
                  <span className="meta-label">Total Amount</span>
                  <strong>${Number(order.totalAmount).toFixed(2)}</strong>
                </div>
                <div className="order-meta-card">
                  <span className="meta-label">Shipping Address</span>
                  <strong>{order.shippingAddress}</strong>
                </div>
                {order.cancellationReason && (
                  <div className="order-meta-card">
                    <span className="meta-label">Cancellation Reason</span>
                    <strong>{order.cancellationReason}</strong>
                  </div>
                )}
              </div>

              {['ORDER_CONFIRMED', 'PROCESSING'].includes(order.status) && (
                <div className="order-actions">
                  <button type="button" className="cancel-btn" onClick={() => cancelOrder(order.id)}>Cancel Order</button>
                </div>
              )}
            </section>
          ))
        )}
        {error && <p className="error">{error}</p>}
      </main>
    </div>
  )
}

export default SellerOrdersPage
