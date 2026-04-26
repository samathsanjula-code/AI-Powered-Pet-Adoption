import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { isSuperAdminAccount } from '../utils/superAdminNav'
import './SuperAdminNav.css'

const navLink = ({ isActive }) => (isActive ? 'active' : undefined)

/**
 * Full constant nav for admin@petmatch.com only.
 * Drop into existing <nav> — includes user name + log out.
 */
export function SuperAdminNavLinks() {
  const { user, logout } = useAuth()
  if (!user || !isSuperAdminAccount(user)) return null

  return (
    <>
      <NavLink to="/" end className={navLink}>
        Home
      </NavLink>
      <NavLink to="/pet-search" className={navLink}>
        Pet Search
      </NavLink>
      <NavLink to="/volunteer" className={navLink}>
        Register Pet
      </NavLink>
      <NavLink to="/seller" className={navLink}>
        Seller
      </NavLink>
      <NavLink to="/admin" end className={navLink}>
        Pet Admin
      </NavLink>
      <NavLink to="/seller-admin" className={navLink}>
        Seller Admin
      </NavLink>
      <NavLink to="/adoption-admin" className={navLink}>
        Adoption Admin
      </NavLink>
      <NavLink to="/admin/user-management" className={navLink}>
        User Management
      </NavLink>
      <NavLink to="/prompts" className={navLink}>
        Prompts
      </NavLink>
      <NavLink to="/breed-identification" className={navLink}>
        Breed ID
      </NavLink>
      <NavLink to="/breed-identification/admin" className={navLink}>
        Breed Admin
      </NavLink>
      <div className="super-admin-nav-user">
        <span className="super-admin-nav-name">{user.name}</span>
        <button type="button" className="super-admin-nav-logout" onClick={() => logout()}>
          Log out
        </button>
      </div>
    </>
  )
}
