import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { acquireSocket, getSocket, releaseSocket } from '../../utils/socket';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const socket = getSocket();
  const isClientArea = window.location.pathname.startsWith('/client');
  const currentUser = useMemo(() => {
    try {
      const stored = localStorage.getItem(isClientArea ? 'client' : 'therapist');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, [isClientArea]);

  useEffect(() => {
    let mounted = true;
    const fetchNotifications = async () => {
      try {
        const res = await axiosInstance.get('/notifications');
        if (!mounted) return;
        setNotifications(Array.isArray(res.data?.notifications) ? res.data.notifications : []);
        setUnreadCount(Number(res.data?.unreadCount || 0));
        setError('');
      } catch (err) {
        if (mounted) setError(err.response?.data?.message || 'Could not load notifications.');
      }
    };
    fetchNotifications();
    const refreshTimer = window.setInterval(fetchNotifications, 30000);
    return () => { mounted = false; window.clearInterval(refreshTimer); };
  }, []);

  useEffect(() => {
    const token = isClientArea ? localStorage.getItem('clientToken') : localStorage.getItem('therapistToken') || localStorage.getItem('token');
    if (!token) return undefined;
    acquireSocket(token);
    const handleNewNotification = (notification) => {
      if (!currentUser || String(notification.recipientId) !== String(currentUser._id)) return;
      setNotifications((prev) => prev.some((item) => item._id === notification._id) ? prev : [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    };
    socket.on('new-notification', handleNewNotification);
    return () => {
      socket.off('new-notification', handleNewNotification);
      releaseSocket();
    };
  }, [currentUser, isClientArea, socket]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await axiosInstance.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not mark notifications as read.');
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      try {
        await axiosInstance.patch(`/notifications/${notification._id}/read`);
        setNotifications((prev) => prev.map((n) => n._id === notification._id ? { ...n, isRead: true } : n));
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        setError(err.response?.data?.message || 'Could not mark notification as read.');
        return;
      }
    }
    setOpen(false);
    if (notification.link) navigate(notification.link);
  };

  return (
    <div className="notification-wrap" ref={dropdownRef}>
      <button type="button" className="icon-btn" aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`} aria-expanded={open} onClick={() => setOpen((prev) => !prev)}>
        <span aria-hidden="true">🔔</span>
        {unreadCount > 0 && <span className="notification-count" aria-hidden="true">{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>
      {open && (
        <div className="notification-dropdown" role="dialog" aria-label="Notifications">
          <div className="notification-head"><strong>Notifications</strong>{unreadCount > 0 && <button type="button" className="link-button" onClick={handleMarkAllRead}>Mark all read</button>}</div>
          {error && <div className="error-msg" role="alert">{error}</div>}
          {notifications.length === 0 ? <p className="notification-empty">No notifications yet.</p> : notifications.map((notification) => (
            <button type="button" className={`notification-item ${notification.isRead ? '' : 'unread'}`} key={notification._id} onClick={() => handleNotificationClick(notification)}>
              <span>{notification.message}</span>
              <small>{notification.createdAt ? new Date(notification.createdAt).toLocaleString() : ''}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
