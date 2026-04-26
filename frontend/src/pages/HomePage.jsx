import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { SuperAdminNavLinks } from '../components/SuperAdminNav'
import { isSuperAdminAccount } from '../utils/superAdminNav'
import './HomePage.css'

const HERO_IMAGES = [
  'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=1920',
  'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=1920',
  'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=1920',
  'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=1920'
]

function HomePage() {
  const { user, logout } = useAuth()
  const [slideIndex, setSlideIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setSlideIndex(i => (i + 1) % HERO_IMAGES.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="homepage">
      <header className="header">
        <Link to="/" className="logo">PetMatch</Link>
        <nav>
          {user ? (
            isSuperAdminAccount(user) ? (
              <SuperAdminNavLinks />
            ) : (
              <>
                {user.role !== 'PetAdmin' && <Link to="/volunteer">Register Pet</Link>}
                {user.role !== 'PetAdmin' && <Link to="/seller">Seller</Link>}
                {(user.role === 'Admin' || user.role === 'PetAdmin') && <Link to="/admin">Pet Admin</Link>}
                {(user.role === 'SellerAdmin' || user.role === 'Admin') && <Link to="/seller-admin">Seller Admin</Link>}
                {(user.role === 'AdoptionAdmin' || user.role === 'Admin') && <Link to="/adoption-admin">Adoption Admin</Link>}
                {(user.role === 'PetAdmin' || user.role === 'Admin') && <Link to="/breed-identification/admin">Breed Admin</Link>}
                  <div className="nav-user">
                      {/* User ගේ නම link එකක් කරමු profile එකට යන්න */}
                      <Link to="/profile" className="nav-user-link">
                          <span className="nav-user-name">Hi, {user.name}</span>
                      </Link>
                      <button type="button" className="nav-logout" onClick={() => logout()}>Log out</button>
                  </div>
              </>
            )
          ) : (
            <>
              <Link to="/login">Sign In</Link>
              <Link to="/register">Create Account</Link>
            </>
          )}
        </nav>
      </header>

      <section className="hero">
        <div className="hero-slider">
          {HERO_IMAGES.map((img, i) => (
            <div
              key={i}
              className={`hero-slide ${i === slideIndex ? 'active' : ''}`}
              style={{ backgroundImage: `url(${img})` }}
            />
          ))}
        </div>
        <div className="hero-overlay">
          <h1>Find your New Best Friend</h1>
          <p>Connect with thousands of pet lovers and shelters near you</p>
        </div>
      </section>

      <section className="action-buttons">
        <h2>How can we help you today?</h2>
        <div className="button-grid">
          <Link to="/volunteer" className="action-btn">
            <img src="https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=400" alt="Volunteer" />
            <span>Volunteer / Shelter</span>
          </Link>
          <Link to="/pet-search" className="action-btn">
            <img src="/images/pet-search-puppies.png" alt="Rescue puppies waiting for adoption" />
            <span>Pet Search</span>
          </Link>
          <Link to="/breed-identification" className="action-btn">
            <img src="https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400" alt="Pet Breed" />
            <span>Pet Breed Identification</span>
          </Link>
          <Link to="/seller" className="action-btn">
            <img src="https://images.unsplash.com/photo-1415369629372-26f2fe60c467?w=400" alt="Seller" />
            <span>Seller</span>
          </Link>
        </div>
      </section>

      <section className="info-section">
        <h2>Adoption Resources</h2>
        <div className="info-cards">
          <Link to="/checklist" className="info-card">
            <h3>Adoption Checklist</h3>
            <p>Prepare for your new pet</p>
          </Link>
          <Link to="/faq" className="info-card">
            <h3>Pet Adoption FAQs</h3>
            <p>Common questions answered</p>
          </Link>
          <Link to="/articles" className="info-card">
            <h3>Adoption Articles</h3>
            <p>Tips and guides</p>
          </Link>
        </div>
      </section>

      <footer className="footer">
        <p>© PetMatch - Find your perfect furry companion</p>
      </footer>
    </div>
  )
}

export default HomePage
