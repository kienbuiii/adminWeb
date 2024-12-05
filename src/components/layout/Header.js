import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { MdNotifications, MdAccountCircle, MdLogout } from 'react-icons/md';
import { database } from '../../firebaseConfig';
import { ref, onValue } from 'firebase/database';
import { toast } from 'react-toastify';
import apiConfig from '../../apiconfig';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [previousNotifications, setPreviousNotifications] = useState({});
  
  useEffect(() => {
    const adminId = localStorage.getItem('adminId');
    if (!adminId) return;

    const notificationsRef = ref(database, `notifications/${adminId}`);
    
    const unsubscribe = onValue(notificationsRef, (snapshot) => {
      if (snapshot.exists()) {
        const currentNotifications = snapshot.val();
        const notifications = Object.entries(currentNotifications).map(([id, notification]) => ({
          id,
          ...notification,
        }));
        
        // Lọc thông báo chưa đọc
        const unreadNotifications = notifications.filter(notification => !notification.read);
        setUnreadCount(unreadNotifications.length);

        // Kiểm tra và hiển thị thông báo mới (không ở trang notifications)
        if (location.pathname !== '/admin/notifications') {
          Object.entries(currentNotifications).forEach(([id, notification]) => {
            const isNewNotification = !previousNotifications[id];
            if (isNewNotification && !notification.read) {
              showNotificationToast(notification);
            }
          });
        }

        setPreviousNotifications(currentNotifications);
      } else {
        setUnreadCount(0);
        setPreviousNotifications({});
      }
    });

    return () => unsubscribe();
  }, [location.pathname]);

  const showNotificationToast = (notification) => {
    const toastContent = (
      <div className="flex items-start">
        <div className="flex-shrink-0 mr-3">
          {notification.senderAvatar ? (
            <img
              src={notification.senderAvatar}
              alt="Avatar"
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
              <MdNotifications className="text-gray-500" />
            </div>
          )}
        </div>
        <div className="flex-1">
          <p className="font-medium">
            {notification.senderName || 'Hệ thống'}
          </p>
          <p className="text-sm text-gray-600">
            {notification.message}
          </p>
        </div>
      </div>
    );

    toast(toastContent, {
      position: "top-right",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      className: "bg-white",
      onClick: () => navigate('/admin/notifications')
    });
  };

  const handleLogout = () => {
    apiConfig.clearToken();
    localStorage.removeItem('adminId');
    localStorage.removeItem('adminName');
    localStorage.removeItem('adminEmail');
    navigate('/login');
  };

  return (
    <header className="bg-white shadow-sm h-16 flex-shrink-0">
      <div className="h-full px-6">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-800">Admin Dashboard</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <Link
              to="/admin/notifications"
              className="p-1.5 rounded-full text-gray-400 hover:text-gray-500 hover:bg-gray-100 relative"
            >
              <MdNotifications className="h-6 w-6" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>

            <div className="flex items-center space-x-3">
              <div className="flex flex-col items-end">
                <span className="text-sm font-medium text-gray-700">
                  {localStorage.getItem('adminName')}
                </span>
                <span className="text-xs text-gray-500">
                  {localStorage.getItem('adminEmail')}
                </span>
              </div>
              <MdAccountCircle className="h-8 w-8 text-gray-400" />
              <button
                onClick={handleLogout}
                className="text-sm font-medium text-gray-500 hover:text-gray-700 flex items-center"
              >
                <MdLogout className="h-5 w-5 mr-1" />
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header; 