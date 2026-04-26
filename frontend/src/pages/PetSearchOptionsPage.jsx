import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { SuperAdminNavLinks } from '../components/SuperAdminNav'
import { isSuperAdminAccount } from '../utils/superAdminNav'
import './PetSearchOptionsPage.css'

/* Local assets in /public/images — reliable offline and no hotlink failures */
const HERO_IMAGE = '/images/pet-search-puppies.png'
const BROWSE_CARD_IMAGE = '/images/pet-search-puppies.png'
const AI_CARD_IMAGE = '/images/ai-recommendation-dog.jpg'

function PetSearchOptionsPage() {
  const { user, logout } = useAuth()

  return (
    <div className="pet-options-page">
      <header className="pet-options-header">
        <Link to="/" className="pet-options-logo">PetMatch</Link>
        <nav>
          {user && isSuperAdminAccount(user) ? (
            <SuperAdminNavLinks />
          ) : (
            <>
              <Link to="/">Home</Link>
              <Link to="/volunteer">Register Pet</Link>
              <Link to="/pet-search" className="active">Pet Search</Link>
              {user?.role === 'Admin' && <Link to="/seller-admin">Seller Admin</Link>}
              {user?.role === 'Admin' && <Link to="/adoption-admin">Adoption Admin</Link>}
              {user ? (
                <div className="pet-options-nav-user">
                  <span>{user.name}</span>
                  <button type="button" className="pet-options-logout" onClick={() => logout()}>Log out</button>
                </div>
              ) : (
                <Link to="/login">Sign In</Link>
              )}
            </>
          )}
        </nav>
      </header>

      <main className="pet-options-main">
        <section className="pet-options-hero" aria-label="Find your furry soulmate">
          <div
            className="pet-options-hero-bg"
            style={{ backgroundImage: `url(${HERO_IMAGE})` }}
            role="img"
            aria-label="Rescue puppies in a shelter pen"
          />
          <div className="pet-options-hero-overlay" />
          <div className="pet-options-hero-inner">
            <h1>Find your furry soulmate</h1>
            <p className="pet-options-hero-text">
              Discover your next companion in two exciting ways! Dive into <strong>Newly Registered Pets</strong>
              —these are the latest animals rescued by shelters or volunteers, and you can explore them directly in
              our live listings. Or let our <strong>AI matchmaker</strong> guide you: answer a few simple questions
              about your preferences, and we will recommend pets that fit you—no need to search every profile
              manually. Whether you browse or get a personalized recommendation, the perfect pet awaits—
              <em>no stress, just love!</em>
            </p>
          </div>
        </section>

        <section className="pet-options-cards-section" aria-label="Choose how to search">
          <div className="pet-options-cards-grid">
            <article className="pet-options-card">
              <div className="pet-options-card-image">
                <img src={BROWSE_CARD_IMAGE} alt="Young rescue puppies on straw in a wooden pen" loading="lazy" />
              </div>
              <div className="pet-options-card-body">
                <h2>Browse registered pets</h2>
                <p>
                  Explore the latest animals registered by shelters and volunteers—scroll, filter, and connect with
                  pets that catch your eye in our live listings.
                </p>
                <Link to="/pet-search/browse" className="pet-options-btn pet-options-btn--primary">
                  Browse registered pets
                </Link>
              </div>
            </article>

            <article className="pet-options-card">
              <div className="pet-options-card-image">
                <img src={AI_CARD_IMAGE} alt="Friendly dog representing personalized AI pet matching" loading="lazy" />
              </div>
              <div className="pet-options-card-body">
                <h2>Get AI recommendation</h2>
                <p>
                  Tell us about your lifestyle and preferences—age, breed, housing, and more—and we will steer you
                  toward pets that fit you, so you do not have to hunt through every profile alone.
                </p>
                <Link to="/pet-search/ai-recommendation" className="pet-options-btn pet-options-btn--outline">
                  Get AI recommendation
                </Link>
              </div>
            </article>
          </div>
        </section>
      </main>

      <footer className="pet-options-footer">
        <p>© PetMatch - Find your perfect furry companion</p>
      </footer>
    </div>
  )
}

export default PetSearchOptionsPage
