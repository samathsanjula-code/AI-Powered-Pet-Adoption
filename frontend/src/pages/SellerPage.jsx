import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { SuperAdminNavLinks } from '../components/SuperAdminNav'
import { isSuperAdminAccount } from '../utils/superAdminNav'
import { API_BASE } from '../api'
import { addToSellerCart, getSellerCart } from '../utils/sellerCart'
import NotificationDropdown from '../components/NotificationDropdown'
import './SellerPage.css'

function SellerPage() {
  const { user, logout } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [cartCount, setCartCount] = useState(0)
  const [qtyMap, setQtyMap] = useState({})

  useEffect(() => {
    if (user) {
      fetchItems()
      const cart = getSellerCart(user.id)
      setCartCount(cart.reduce((sum, c) => sum + c.quantity, 0))
    } else {
      setLoading(false)
    }
  }, [user])

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

  const addToCart = (item) => {
    const qty = Math.max(1, Number(qtyMap[item.id]) || 1)
    const updated = addToSellerCart(user.id, item, qty)
    setCartCount(updated.reduce((sum, c) => sum + c.quantity, 0))
  }

  if (loading) {
    return (
      <div className="seller-page">
        <div className="seller-loading">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="seller-page seller-signin-required">
        <header className="seller-header">
          <Link to="/" className="seller-logo">PetMatch</Link>
          <nav>
            <Link to="/login?returnTo=/seller">Sign In</Link>
            <Link to="/">Home</Link>
          </nav>
        </header>
        <main className="seller-gate">
          <div className="seller-gate-card">
            <div className="seller-gate-icon">🔒</div>
            <h1>Sign in to view Seller items</h1>
            <p>Pet care products and foods are available to signed-in members. Sign in or create an account to browse.</p>
            <Link to="/login?returnTo=/seller" className="seller-gate-btn">Sign In</Link>
            <Link to="/register" className="seller-gate-link">Create account</Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="seller-page">
      <header className="seller-header">
        <Link to="/" className="seller-logo">PetMatch</Link>
        <nav>
          {user && isSuperAdminAccount(user) ? (
            <SuperAdminNavLinks />
          ) : (
            <>
              <Link to="/">Home</Link>
              <Link to="/seller/cart">Cart ({cartCount})</Link>
              <Link to="/seller/orders">My Orders</Link>
              {(user?.role === 'SellerAdmin' || user?.role === 'Admin') && <Link to="/seller-admin">Seller Admin</Link>}
              {user?.role === 'Admin' && <Link to="/adoption-admin">Adoption Admin</Link>}
              <div className="seller-nav-user">
                <NotificationDropdown userId={user.id} />
                <span>{user?.name}</span>
                <button type="button" className="seller-logout" onClick={() => logout()}>Log out</button>
              </div>
            </>
          )}
        </nav>
      </header>

      <main className="seller-main">
        <h1>Pet Care &amp; Food</h1>
        <p className="seller-sub">Browse pet care items and foods from our seller.</p>

        {items.length === 0 ? (
          <p className="seller-empty">No items listed yet. Check back later.</p>
        ) : (
          <div className="seller-grid">
            {items.map((item) => (
              <article key={item.id} className="seller-card">
                <div className="seller-card-image">
                  {(item.imagePaths && item.imagePaths.length > 0) ? (
                    <div className="seller-card-gallery">
                      {item.imagePaths.map((path, i) => (
                        <img key={i} src={`${API_BASE}${path}`} alt={`${item.title} ${i + 1}`} />
                      ))}
                    </div>
                  ) : (
                    <div className="seller-card-placeholder">No image</div>
                  )}
                  {item.category && <span className="seller-card-badge">{item.category}</span>}
                </div>
                <div className="seller-card-body">
                  <h3>{item.title}</h3>
                  {item.brand && <p className="seller-card-brand">Brand: {item.brand}</p>}
                  {item.description && (
                    <p className="seller-card-desc">{item.description}</p>
                  )}
                  {item.suitableFor && <p className="seller-card-for">Suitable for: {item.suitableFor}</p>}
                  <div className="seller-card-footer">
                    <span className="seller-card-price">${Number(item.price).toFixed(2)}</span>
                    {item.quantityInStock != null && (
                      <span className={`seller-card-stock ${item.quantityInStock <= 0 ? 'out' : ''}`}>
                        {item.quantityInStock <= 0 ? 'Out of stock' : `In stock: ${item.quantityInStock}`}
                      </span>
                    )}
                  </div>
                  <div className="seller-card-footer">
                    {(item.quantityInStock ?? 0) <= 0 ? (
                      <button
                        type="button"
                        className="seller-notify-btn"
                        onClick={async () => {
                          try {
                            const res = await fetch(`${API_BASE}/api/seller-items/${item.id}/subscribe`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ userId: user.id })
                            })
                            if (res.ok) alert('We will notify you when this item is restocked!')
                          } catch (e) {
                            console.error(e)
                          }
                        }}
                      >
                        Notify Me when Restocked
                      </button>
                    ) : (
                      <>
                        <input
                          className="seller-qty-input"
                          type="number"
                          min="1"
                          max={Math.max(1, Number(item.quantityInStock) || 1)}
                          value={qtyMap[item.id] || 1}
                          onChange={(e) => setQtyMap((m) => ({ ...m, [item.id]: e.target.value }))}
                        />
                        <button
                          type="button"
                          onClick={() => addToCart(item)}
                          className="seller-add-cart-btn"
                        >
                          Add to Cart
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      <footer className="seller-footer">
        <p>© PetMatch – Pet Care &amp; Food</p>
      </footer>
    </div>
  )
}

export default SellerPage
