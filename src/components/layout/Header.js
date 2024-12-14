import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/Header.css';
import { MdLogout, MdNotifications } from 'react-icons/md';
import { useAdminSocket } from '../../context/AdminSocketContext';
import { database } from '../../firebaseConfig';
import { ref, onValue } from 'firebase/database';
import { toast } from 'react-toastify';

const Header = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastNotificationId, setLastNotificationId] = useState(null);

  useEffect(() => {
    const adminId = localStorage.getItem('adminId');
    if (!adminId) return;

    // Lắng nghe thay đổi từ Firebase
    const notificationsRef = ref(database, `notifications/${adminId}`);
    const unsubscribe = onValue(notificationsRef, (snapshot) => {
      if (snapshot.exists()) {
        const notifications = snapshot.val();
        const notificationsList = Object.entries(notifications).map(([id, notification]) => ({
          id,
          ...notification,
        }));

        // Sắp xếp theo thời gian tạo mới nhất
        notificationsList.sort((a, b) => b.createdAt - a.createdAt);

        // Đếm số thông báo chưa đọc
        const count = notificationsList.filter(notif => !notif.read).length;
        setUnreadCount(count);

        // Kiểm tra thông báo mới nhất
        const latestNotification = notificationsList[0];
        if (latestNotification && latestNotification.id !== lastNotificationId) {
          setLastNotificationId(latestNotification.id);
          // Hiển thị toast cho thông báo mới
          toast.info(
            <div onClick={() => navigate('/admin/notifications')}>
              <strong>{latestNotification.senderName || 'Hệ thống'}</strong>
              <p>{latestNotification.message}</p>
            </div>,
            {
              autoClose: 5000,
              position: "top-right",
              onClick: () => navigate('/admin/notifications')
            }
          );
        }
      } else {
        setUnreadCount(0);
      }
    });

    // Cleanup listener
    return () => unsubscribe();
  }, [navigate, lastNotificationId]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('adminId');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleNotificationClick = () => {
    navigate('/admin/notifications');
  };

  return (
    <header className="header">
      <div className="header-container">
        <div className="header-content">
          <div className="header-left">
            <button
              className="mobile-menu-button"
              onClick={onMenuClick}
              aria-label="Open menu"
            >
              <svg 
                className="mobile-menu-icon" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M4 6h16M4 12h16M4 18h16" 
                />
              </svg>
            </button>

            <div className="header-logo">
              Admin Panel
            </div>
          </div>

          <div className="header-right">
            {/* Notification Button */}
            <div className="notification-container">
              <button
                onClick={handleNotificationClick}
                className="notification-button"
                aria-label="Thông báo"
              >
                <MdNotifications className="notification-icon" />
                {unreadCount > 0 && (
                  <span className="notification-badge">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            </div>

            <button
              onClick={handleLogout}
              className="logout-button"
              aria-label="Đăng xuất"
            >
              <MdLogout className="logout-icon" />
              <span className="logout-text">Đăng xuất</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header; 