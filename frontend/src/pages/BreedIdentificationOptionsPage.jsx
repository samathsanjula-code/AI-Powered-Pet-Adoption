import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { SuperAdminNavLinks } from '../components/SuperAdminNav'
import { isSuperAdminAccount } from '../utils/superAdminNav'
import './BreedIdentificationOptionsPage.css'

const HERO_IMAGE = 'https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=1600'
const ADMIN_CARD_IMAGE = 'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=1200'
const AI_CARD_IMAGE = 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=1200'

function BreedIdentificationOptionsPage() {
  const { user, logout } = useAuth()

  return (
    <div className="breed-options-page">
      <header className="breed-options-header">
        <Link to="/" className="breed-options-logo">PetMatch</Link>
        <nav>
          {user && isSuperAdminAccount(user) ? (
            <SuperAdminNavLinks />
          ) : (
            <>
              <Link to="/">Home</Link>
              <Link to="/pet-search">Pet Search</Link>
              {(user?.role === 'PetAdmin' || user?.role === 'Admin') && <Link to="/breed-identification/admin">Breed Admin</Link>}
              <Link to="/breed-identification" className="active">Breed ID</Link>
              {user ? (
                <div className="breed-options-nav-user">
                  <span>{user.name}</span>
                  <button type="button" className="breed-options-logout" onClick={() => logout()}>Log out</button>
                </div>
              ) : (
                <Link to="/login">Sign In</Link>
              )}
            </>
          )}
        </nav>
      </header>

      <section className="breed-options-hero">
        <div className="breed-options-hero-bg" style={{ backgroundImage: `url(${HERO_IMAGE})` }} />
        <div className="breed-options-hero-overlay" />
        <div className="breed-options-hero-content">
          <h1>Choose your breed identification path</h1>
          <p>
            Need trusted human review or a fast AI preview? Pick the mode that fits you. Submit your pet photo with
            details and track the final result in one place.
          </p>
        </div>
      </section>

      <main className="breed-options-main">
        <section className="breed-options-cards">
          <article className="breed-options-card">
            <img src={ADMIN_CARD_IMAGE} alt="Dog portrait for human expert support" />
            <div className="breed-options-card-body">
              <h2>Get admin support for breed identification</h2>
              <p>
                Submit your request to the admin support desk. Admin can review your images, send a breed response,
                and update it later if needed.
              </p>
              <Link to="/breed-identification/admin-support" className="breed-options-btn primary">
                Get admin support
              </Link>
            </div>
          </article>

          <article className="breed-options-card">
            <img src={AI_CARD_IMAGE} alt="Cat portrait for AI breed identification" />
            <div className="breed-options-card-body">
              <h2>AI breed identification</h2>
              <p>
                Open the AI analyzer workspace styled like your existing processing console with upload, staged flow,
                and classification output placeholders.
              </p>
              <Link to="/breed-identification/ai" className="breed-options-btn secondary">
                AI breed identification
              </Link>
            </div>
          </article>
        </section>
      </main>
    </div>
  )
}

export default BreedIdentificationOptionsPage
