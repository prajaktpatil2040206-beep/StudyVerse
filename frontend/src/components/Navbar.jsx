import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { FiHome, FiAward, FiCpu, FiBarChart2, FiLogOut, FiMenu, FiX, FiBell, FiMoon, FiSun, FiLayout, FiSearch } from 'react-icons/fi';
import NotificationPanel from './NotificationPanel';
import './Navbar.css';

const navLinks = [
  { path: '/home', label: 'Home', icon: <FiHome /> },
  { path: '/gamification', label: 'Gamification', icon: <FiAward /> },
  { path: '/mentor', label: 'Mentor AI', icon: <FiCpu /> },
  { path: '/dashboard', label: 'Dashboard', icon: <FiBarChart2 /> },
  { path: '/kanban', label: 'Kanban', icon: <FiLayout /> },
  { path: '/scraper', label: 'Scraper', icon: <FiSearch /> },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load unread notification count
  useEffect(() => {
    if (user?.uid) {
      loadUnreadCount();
      // Poll every 30 seconds
      const interval = setInterval(loadUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadUnreadCount = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/notifications/user/${user.uid}?unread_only=true`);
      const data = await response.json();
      setUnreadCount(data.unread_count || 0);
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  };

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
          <button className="btn-icon nav-theme" onClick={toggleTheme} title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}>
            {theme === 'dark' ? <FiSun size={18} /> : <FiMoon size={18} />}
          </button>
          <button className="btn-icon nav-bell" onClick={() => setNotificationOpen(true)}>
            <FiBell size={18} />
            {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
          </button>
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
      <NotificationPanel 
        isOpen={notificationOpen} 
        onClose={() => {
          setNotificationOpen(false);
          loadUnreadCount(); // Refresh count when panel closes
        }} 
      />
    </nav>
  );
}
