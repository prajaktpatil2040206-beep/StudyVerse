import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiHome, FiAward, FiCpu, FiBarChart2, FiLogOut, FiMenu, FiX, FiBell } from 'react-icons/fi';
import './Navbar.css';

const navLinks = [
  { path: '/home', label: 'Home', icon: <FiHome /> },
  { path: '/gamification', label: 'Gamification', icon: <FiAward /> },
  { path: '/mentor', label: 'Mentor AI', icon: <FiCpu /> },
  { path: '/dashboard', label: 'Dashboard', icon: <FiBarChart2 /> },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return null;

  return (
    <nav className="navbar">
      <div className="navbar-inner container">
        <Link to="/home" className="navbar-brand">
          <img src="/weblogo.jpeg" alt="StudyVerse" className="brand-logo" />
          <span className="brand-text">StudyVerse</span>
        </Link>
        <div className={`navbar-links ${mobileOpen ? 'open' : ''}`}>
          {navLinks.map(link => (
            <Link
              key={link.path}
              to={link.path}
              className={`nav-link ${location.pathname === link.path ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              {link.icon}
              <span>{link.label}</span>
            </Link>
          ))}
        </div>
        <div className="navbar-actions">
          <button className="btn-icon nav-bell"><FiBell size={18} /></button>
          <div className="nav-user">
            <div className="nav-avatar">
              {user.profilePic ? (
                <img src={user.profilePic} alt="" />
              ) : (
                <span>{user.name?.charAt(0)?.toUpperCase() || 'U'}</span>
              )}
            </div>
            <span className="nav-username">{user.name?.split(' ')[0]}</span>
          </div>
          <button className="btn-icon nav-logout" onClick={logout} title="Logout"><FiLogOut size={16} /></button>
          <button className="btn-icon nav-toggle" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <FiX size={20} /> : <FiMenu size={20} />}
          </button>
        </div>
      </div>
    </nav>
  );
}
