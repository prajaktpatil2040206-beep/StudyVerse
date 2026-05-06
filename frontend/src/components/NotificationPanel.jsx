import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { FiBell, FiX, FiCheck, FiTrash2, FiClock, FiAlertCircle, FiAward, FiCalendar } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import './NotificationPanel.css';

export default function NotificationPanel({ isOpen, onClose }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user?.uid) {
      loadNotifications();
    }
  }, [isOpen, user]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      console.log('📥 Loading notifications for user:', user.uid);
      const response = await fetch(`http://localhost:8000/api/notifications/user/${user.uid}`);
      console.log('📡 Response status:', response.status);
      const data = await response.json();
      console.log('📦 Notifications data:', data);
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch (error) {
      console.error('❌ Failed to load notifications:', error);
    }
    setLoading(false);
  };

  const markAsRead = async (notificationId) => {
    try {
      await fetch(`http://localhost:8000/api/notifications/mark-read/${notificationId}`, {
        method: 'PUT'
      });
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch(`http://localhost:8000/api/notifications/mark-all-read/${user.uid}`, {
        method: 'PUT'
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await fetch(`http://localhost:8000/api/notifications/${notificationId}`, {
        method: 'DELETE'
      });
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const clearAll = async () => {
    if (!confirm('Clear all notifications?')) return;
    try {
      await fetch(`http://localhost:8000/api/notifications/clear-all/${user.uid}`, {
        method: 'DELETE'
      });
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'task': return <FiCheck />;
      case 'score': return <FiAward />;
      case 'timetable': return <FiCalendar />;
      default: return <FiBell />;
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            className="notification-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div 
            className="notification-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            <div className="notification-header">
              <div className="notification-title">
                <FiBell size={20} />
                <h3>Notifications</h3>
                {unreadCount > 0 && (
                  <span className="unread-badge">{unreadCount}</span>
                )}
              </div>
              <button className="btn-icon" onClick={onClose}>
                <FiX size={20} />
              </button>
            </div>

            <div className="notification-actions">
              <button className="btn btn-secondary btn-sm" onClick={markAllAsRead} disabled={unreadCount === 0}>
                <FiCheck /> Mark all read
              </button>
              <button className="btn btn-secondary btn-sm" onClick={clearAll} disabled={notifications.length === 0}>
                <FiTrash2 /> Clear all
              </button>
            </div>

            <div className="notification-list">
              {loading ? (
                <div className="notification-loading">
                  <div className="loading-spinner" />
                  <p>Loading notifications...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="notification-empty">
                  <FiBell size={48} />
                  <p>No notifications yet</p>
                  <span>You're all caught up!</span>
                </div>
              ) : (
                notifications.map(notif => (
                  <motion.div 
                    key={notif.id}
                    className={`notification-item ${notif.read ? 'read' : 'unread'}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    onClick={() => !notif.read && markAsRead(notif.id)}
                  >
                    <div className="notification-icon" style={{ color: notif.read ? 'var(--muted)' : 'var(--accent)' }}>
                      {getIcon(notif.type)}
                    </div>
                    <div className="notification-content">
                      <h4>{notif.title}</h4>
                      <p>{notif.message}</p>
                      <div className="notification-meta">
                        <span className="notification-time">
                          <FiClock size={12} />
                          {formatTime(notif.timestamp)}
                        </span>
                        {notif.link && (
                          <a href={notif.link} className="notification-link">View details</a>
                        )}
                      </div>
                    </div>
                    <button 
                      className="notification-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notif.id);
                      }}
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
