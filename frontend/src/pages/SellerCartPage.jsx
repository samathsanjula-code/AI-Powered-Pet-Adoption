import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { SuperAdminNavLinks } from '../components/SuperAdminNav'
import { isSuperAdminAccount } from '../utils/superAdminNav'
import { API_BASE } from '../api'
import { clearSellerCart, getSellerCart, removeFromSellerCart, updateSellerCartQty } from '../utils/sellerCart'
import './SellerCartPage.css'

function SellerCartPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [cartItems, setCartItems] = useState([])
  const [stockMap, setStockMap] = useState({})
  const [step, setStep] = useState(1)
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [placing, setPlacing] = useState(false)
  const [placedOrder, setPlacedOrder] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!user?.id) return
    setCartItems(getSellerCart(user.id))
  }, [user?.id])

  useEffect(() => {
    const loadStock = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/seller-items`)
        if (!res.ok) return
        const items = await res.json()
        const map = {}
        items.forEach((i) => {
          map[i.id] = i.quantityInStock ?? 0
        })
        setStockMap(map)
      } catch {}
    }
    loadStock()
  }, [])

  const totals = useMemo(() => {
    const subtotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0)
    const shippingFee = subtotal > 0 ? 3.99 : 0
    const tax = subtotal * 0.05
    return {
      subtotal,
      shippingFee,
      tax,
      total: subtotal + shippingFee + tax
    }
  }, [cartItems])

  const updateQty = (itemId, qty) => {
    const updated = updateSellerCartQty(user.id, itemId, qty)
    setCartItems([...updated])
    setNotice('Cart updated')
    setTimeout(() => setNotice(''), 1400)
  }

  const removeItem = (itemId) => {
    const updated = removeFromSellerCart(user.id, itemId)
    setCartItems([...updated])
    setNotice('Item removed')
    setTimeout(() => setNotice(''), 1400)
  }

  const placeOrder = async () => {
    setError('')
    if (!address.trim()) {
      setError('Shipping address is required')
      return
    }
    if (cartItems.length === 0) {
      setError('Your cart is empty')
      return
    }

    setPlacing(true)
    try {
      const payload = {
        userId: user.id,
        userName: user.name || 'Customer',
        userEmail: user.email || '',
        shippingAddress: address.trim(),
        contactPhone: phone.trim(),
        notes: notes.trim(),
        items: cartItems.map((i) => ({
          sellerItemId: i.itemId,
          quantity: i.quantity
        }))
      }

      const res = await fetch(`${API_BASE}/api/seller-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || 'Could not place order')
        return
      }
      setPlacedOrder(data)
      clearSellerCart(user.id)
      setCartItems([])
      setStep(4)
    } catch {
      setError('Could not connect to server')
    } finally {
      setPlacing(false)
    }
  }

  if (!user) return <div className="seller-cart-page"><p>Please sign in.</p></div>

  return (
    <div className="seller-cart-page">
      {user && isSuperAdminAccount(user) && (
        <header className="seller-cart-app-nav">
          <Link to="/" className="seller-cart-app-logo">PetMatch</Link>
          <nav>
            <SuperAdminNavLinks />
          </nav>
        </header>
      )}
      <header className="seller-cart-header">
        <div className="seller-cart-head-left">
          <Link to="/seller" className="seller-cart-back-btn">Back to Seller</Link>
          <h1>Cart & Checkout</h1>
        </div>
        <div className="seller-cart-steps">
          <span className={step === 1 ? 'active' : ''}>1. Cart</span>
          <span className={step === 2 ? 'active' : ''}>2. Details</span>
          <span className={step === 3 ? 'active' : ''}>3. Summary</span>
          <span className={step === 4 ? 'active' : ''}>4. Confirmed</span>
        </div>
      </header>
      {notice && <div className="seller-cart-notice">{notice}</div>}

      {step === 1 && (
        <main className="seller-cart-main">
          <h1>Your Cart</h1>
          {cartItems.length === 0 ? (
            <p>Your cart is empty. <Link to="/seller">Browse items</Link></p>
          ) : (
            <>
              {cartItems.map((item) => (
                <div key={item.itemId} className="cart-line">
                  <div>
                    <strong>{item.title}</strong>
                    <p>${item.price.toFixed(2)} each</p>
                    <small>Available stock: {stockMap[item.itemId] ?? '-'}</small>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max={Math.max(1, stockMap[item.itemId] ?? 99)}
                    value={item.quantity}
                    onChange={(e) => updateQty(item.itemId, e.target.value)}
                  />
                  <span>${(item.price * item.quantity).toFixed(2)}</span>
                <button type="button" className="danger" onClick={() => removeItem(item.itemId)}>Remove</button>
                </div>
              ))}
              <div className="cart-footer">
                <h3>Total: ${totals.total.toFixed(2)}</h3>
                <button type="button" onClick={() => setStep(2)}>Proceed to Checkout</button>
              </div>
            </>
          )}
        </main>
      )}

      {step === 2 && (
        <main className="seller-cart-main">
          <h1>Shipping Details</h1>
          <label>Shipping Address</label>
          <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={4} />
          <label>Phone Number</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} />
          <label>Order Notes (optional)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          <div className="cart-actions">
            <button type="button" className="muted" onClick={() => setStep(1)}>Back</button>
            <button type="button" onClick={() => setStep(3)}>Review Order</button>
          </div>
        </main>
      )}

      {step === 3 && (
        <main className="seller-cart-main">
          <h1>Order Summary</h1>
          {cartItems.map((item) => (
            <p key={item.itemId}>{item.title} x {item.quantity} = ${(item.quantity * item.price).toFixed(2)}</p>
          ))}
          <hr />
          <p>Subtotal: ${totals.subtotal.toFixed(2)}</p>
          <p>Shipping: ${totals.shippingFee.toFixed(2)}</p>
          <p>Tax: ${totals.tax.toFixed(2)}</p>
          <h3>Grand Total: ${totals.total.toFixed(2)}</h3>
          <p><strong>Ship to:</strong> {address || '-'}</p>
          <p><strong>Contact:</strong> {phone || '-'}</p>
          {error && <p className="error">{error}</p>}
          <div className="cart-actions">
            <button type="button" className="muted" onClick={() => setStep(2)}>Back</button>
            <button type="button" disabled={placing} onClick={placeOrder}>
              {placing ? 'Placing...' : 'Place Order'}
            </button>
          </div>
        </main>
      )}

      {step === 4 && (
        <main className="seller-cart-main">
          <div className="order-success-icon">✓</div>
          <h1>Order Placed Successfully</h1>
          <p>Your items are confirmed and will be prepared soon.</p>
          <p><strong>Order ID:</strong> #{placedOrder?.id}</p>
          <p><strong>Status:</strong> {placedOrder?.status}</p>
          <p><strong>Total Paid:</strong> ${Number(placedOrder?.totalAmount || 0).toFixed(2)}</p>
          <div className="cart-actions">
            <button type="button" onClick={() => navigate('/seller/orders')}>View My Orders</button>
            <button type="button" className="muted" onClick={() => navigate('/seller')}>Continue Shopping</button>
          </div>
        </main>
      )}
    </div>
  )
}

export default SellerCartPage
