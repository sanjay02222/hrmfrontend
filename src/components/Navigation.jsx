import { NavLink } from 'react-router-dom'
import '../styles/Navigation.css'

export default function Navigation() {
  return (
    <nav className="navigation">
      <div className="nav-container">
        <NavLink
          to="/employee"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <span className="nav-icon">👤</span>
          <span className="nav-text">Employee Portal</span>
        </NavLink>
        <NavLink
          to="/admin"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <span className="nav-icon">⚙️</span>
          <span className="nav-text">Admin Dashboard</span>
        </NavLink>
      </div>
    </nav>
  )
}
