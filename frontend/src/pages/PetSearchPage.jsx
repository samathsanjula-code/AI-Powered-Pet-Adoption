import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { SuperAdminNavLinks } from '../components/SuperAdminNav'
import { isSuperAdminAccount } from '../utils/superAdminNav'
import { API_BASE } from '../api'
import './PetSearchPage.css'

const DEFAULT_PET_CLIPART = 'https://img.freepik.com/free-vector/group-cute-smiley-pets_23-2148512151.jpg?semt=ais_hybrid&w=740&q=80'

const BREEDS = ['Any', 'Local / Mixed Breed', 'Golden Retriever', 'Labrador', 'German Shepherd', 'Persian', 'Siamese', 'Other']
const PET_TYPES = ['Any', 'Dog', 'Cat', 'Rabbit', 'Bird']
const AGE_RANGES = [
  { value: 'any', label: 'Any Age' },
  { value: 'under1', label: 'Under 1 year' },
  { value: '1-3', label: '1–3 years' },
  { value: '3-7', label: '3–7 years' },
  { value: '7+', label: '7+ years' }
]
const VACCINATED_OPTIONS = [
  { value: 'any', label: 'Any' },
  { value: 'yes', label: 'Vaccinated' },
  { value: 'no', label: 'Not vaccinated' }
]
const PETS_PER_PAGE = 6

function monthsToYears(months) {
  if (months == null) return null
  const m = Number(months)
  if (!Number.isFinite(m) || m < 0) return null
  return m / 12
}

function formatAgeMonths(ageMonths) {
  const m = Number(ageMonths)
  if (!Number.isFinite(m) || m <= 0) return '—'
  const years = Math.floor(m / 12)
  const months = m % 12
  if (years > 0 && months > 0) return `${years}y ${months}m`
  if (years > 0) return `${years}y`
  return `${months}m`
}

function getPetImageSrc(pet) {
  if (pet?.imagePaths && pet.imagePaths[0]) return `${API_BASE}${pet.imagePaths[0]}`
  if (pet?.imageLocation) return pet.imageLocation
  return DEFAULT_PET_CLIPART
}

function isFlagEnabled(v) {
  return v === true || v === 'true' || Number(v) === 1
}

function healthLabel(v) {
  return Number(v) === 1 ? 'Healthy & Active' : 'Needs Care'
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

function PetSearchPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, logout } = useAuth()
  const defaultType = PET_TYPES.includes(searchParams.get('type') || '') ? searchParams.get('type') : 'Any'
  const defaultBreed = BREEDS.includes(searchParams.get('breed') || '') ? searchParams.get('breed') : 'Any'
  const defaultAge = AGE_RANGES.some(r => r.value === searchParams.get('age')) ? searchParams.get('age') : 'any'
  const [pets, setPets] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState(defaultType)
  const [filterBreed, setFilterBreed] = useState(defaultBreed)
  const [filterAge, setFilterAge] = useState(defaultAge)
  const [filterVaccinated, setFilterVaccinated] = useState('any')
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
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const filteredPets = useMemo(() => {
    return pets.filter(pet => {
      if (filterType !== 'Any' && pet.petType !== filterType) return false
      if (filterBreed !== 'Any' && pet.breed !== filterBreed) return false
      if (filterVaccinated !== 'any') {
        const v = isFlagEnabled(pet.vaccinated)
        if (filterVaccinated === 'yes' && !v) return false
        if (filterVaccinated === 'no' && v) return false
      }
      if (filterAge !== 'any') {
        const years = monthsToYears(pet.ageMonths)
        if (years === null) return false
        if (filterAge === 'under1' && years >= 1) return false
        if (filterAge === '1-3' && (years < 1 || years > 3)) return false
        if (filterAge === '3-7' && (years <= 3 || years > 7)) return false
        if (filterAge === '7+' && years <= 7) return false
      }
      return true
    })
  }, [pets, filterType, filterBreed, filterAge, filterVaccinated])

  const sortedFilteredPets = useMemo(() => {
    return [...filteredPets].sort((a, b) => {
      const aHasPhoto = Boolean(a?.imagePaths?.[0] || a?.imageLocation)
      const bHasPhoto = Boolean(b?.imagePaths?.[0] || b?.imageLocation)
      if (aHasPhoto !== bHasPhoto) return aHasPhoto ? -1 : 1
      const aId = Number(a?.id ?? a?.PetID ?? 0)
      const bId = Number(b?.id ?? b?.PetID ?? 0)
      return bId - aId
    })
  }, [filteredPets])

  const totalPages = Math.max(1, Math.ceil(sortedFilteredPets.length / PETS_PER_PAGE))

  useEffect(() => {
    setCurrentPage(1)
  }, [filterType, filterBreed, filterAge, filterVaccinated, pets.length])

  const paginatedPets = useMemo(() => {
    const page = Math.min(currentPage, totalPages)
    const start = (page - 1) * PETS_PER_PAGE
    return sortedFilteredPets.slice(start, start + PETS_PER_PAGE)
  }, [sortedFilteredPets, currentPage, totalPages])
  const paginationItems = useMemo(() => buildPaginationItems(totalPages, currentPage), [totalPages, currentPage])

  const handleAdopt = (pet) => {
    navigate(`/adoption-form?petId=${pet.id}`)
  }

  if (loading) {
    return (
      <div className="pet-search-page">
        <div className="pet-search-loading">Loading pets...</div>
      </div>
    )
  }

  return (
    <div className="pet-search-page">
      <header className="pet-search-header">
        <Link to="/" className="pet-search-logo">PetMatch</Link>
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
                <div className="pet-search-nav-user">
                  <span>{user.name}</span>
                  <button type="button" className="pet-search-logout" onClick={() => logout()}>Log out</button>
                </div>
              ) : (
                <Link to="/login">Sign In</Link>
              )}
            </>
          )}
        </nav>
      </header>

      <main className="pet-search-main">
        <h1>Find Your New Companion</h1>
        <p className="pet-search-sub">Browse adoptable pets from our community. All listings are from registered volunteers and shelters.</p>

        <div className="pet-search-filters">
          <div className="filter-group">
            <label>Pet Type</label>
            <select value={filterType} onChange={e => setFilterType(e.target.value)}>
              {PET_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label>Age</label>
            <select value={filterAge} onChange={e => setFilterAge(e.target.value)}>
              {AGE_RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label>Breed</label>
            <select value={filterBreed} onChange={e => setFilterBreed(e.target.value)}>
              {BREEDS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label>Vaccinated</label>
            <select value={filterVaccinated} onChange={e => setFilterVaccinated(e.target.value)}>
              {VACCINATED_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        <p className="pet-search-results">{sortedFilteredPets.length} pet{sortedFilteredPets.length !== 1 ? 's' : ''} found</p>

        {sortedFilteredPets.length === 0 ? (
          <div className="pet-search-empty">
            <p>No pets match your filters. Try adjusting your search criteria.</p>
            <button type="button" className="clear-filters-btn" onClick={() => { setFilterType('Any'); setFilterBreed('Any'); setFilterAge('any'); setFilterVaccinated('any') }}>
              Clear filters
            </button>
          </div>
        ) : (
          <>
          <div className="pet-search-grid">
            {paginatedPets.map(pet => (
              <article key={pet.id} className="pet-search-card">
                <div className="pet-search-card-image">
                  <img src={getPetImageSrc(pet)} alt={pet.petType || 'Pet'} loading="lazy" />
                  {pet.petType && <span className="pet-search-card-badge">{pet.petType}</span>}
                </div>
                <div className="pet-search-card-body">
                  <h3>{pet.petType || 'Pet'}</h3>
                  <div className="pet-search-card-meta">
                    {pet.breed && <span>{pet.breed}</span>}
                    {pet.ageMonths != null && <span>• {formatAgeMonths(pet.ageMonths)}</span>}
                    {pet.size && <span>• {pet.size}</span>}
                    {pet.weightKg != null && <span>• {Number(pet.weightKg).toFixed(2)} kg</span>}
                  </div>
                  <div className="pet-search-card-tags">
                    {isFlagEnabled(pet.vaccinated) && <span className="tag vaccinated">Vaccinated</span>}
                    <span className="tag">{healthLabel(pet.healthCondition)}</span>
                    {isFlagEnabled(pet.previousOwner) && <span className="tag">Previously owned</span>}
                  </div>
                  <button type="button" className="pet-search-adopt-btn" onClick={() => handleAdopt(pet)}>
                    Adopt
                  </button>
                </div>
              </article>
            ))}
          </div>
          <div className="pet-search-pagination">
            <button
              type="button"
              className="page-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            >
              Prev
            </button>
            {paginationItems.map((item, idx) => item === '...' ? (
              <span key={`ellipsis-${idx}`} className="page-ellipsis">...</span>
            ) : (
              <button
                key={item}
                type="button"
                className={`page-btn ${currentPage === item ? 'active' : ''}`}
                onClick={() => setCurrentPage(item)}
              >
                {item}
              </button>
            ))}
            <button
              type="button"
              className="page-btn"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
          </>
        )}
      </main>

      <footer className="pet-search-footer">
        <p>© PetMatch – Find your perfect furry companion</p>
      </footer>
    </div>
  )
}

export default PetSearchPage
