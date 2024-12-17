import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { database } from '../firebaseConfig';
import { ref, onValue, update, remove } from 'firebase/database';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { MdNotifications, MdDelete, MdDeleteSweep } from 'react-icons/md';
import { toast } from 'react-toastify';

const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const adminId = localStorage.getItem('adminId');
    if (!adminId) {
      console.error('Admin ID not found in localStorage');
      setLoading(false);
      return;
    }

    const notificationsRef = ref(database, `notifications/${adminId}`);
    const unsubscribe = onValue(notificationsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const notificationsList = Object.entries(data)
          .map(([id, notification]) => ({
            id,
            ...notification,
          }))
          .sort((a, b) => b.createdAt - a.createdAt);
        
        setNotifications(notificationsList);
      } else {
        setNotifications([]);
      }
      setLoading(false);
      setError(null);
    }, (error) => {
      console.error('Firebase error:', error);
      setError(error.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleDeleteNotification = async (notificationId) => {
    try {
      const adminId = localStorage.getItem('adminId');
      if (!adminId) return;

      await remove(ref(database, `notifications/${adminId}/${notificationId}`));
      toast.success('Đã xóa thông báo');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Không thể xóa thông báo');
    }
  };

  const handleDeleteAllNotifications = async () => {
    try {
      const adminId = localStorage.getItem('adminId');
      if (!adminId) return;

      const notificationsRef = ref(database, `notifications/${adminId}`);
      await remove(notificationsRef);
      toast.success('Đã xóa tất cả thông báo');
    } catch (error) {
      console.error('Error deleting all notifications:', error);
      toast.error('Không thể xóa tất cả thông báo');
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      const adminId = localStorage.getItem('adminId');
      if (!adminId) return;

      await update(ref(database, `notifications/${adminId}/${notificationId}`), {
        read: true
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Không thể đánh dấu đã đọc');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const adminId = localStorage.getItem('adminId');
      if (!adminId) return;

      const updates = {};
      notifications.forEach(notification => {
        if (!notification.read) {
          updates[`notifications/${adminId}/${notification.id}/read`] = true;
        }
      });

      if (Object.keys(updates).length > 0) {
        await update(ref(database), updates);
        toast.success('Đã đánh dấu tất cả là đã đọc');
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Không thể đánh dấu tất cả là đã đọc');
    }
  };

  const handleNotificationNavigation = (notification) => {
    try {
      if (notification.type === 'new_report') {
        navigate(`/admin/reports/${notification.reports}`);
      }
    } catch (error) {
      console.error('Navigation error:', error);
      toast.error('Không thể mở nội dung này');
      
    }
  };

  const handleNotificationPress = async (notification) => {
    try {
      if (!notification.read) {
        await handleMarkAsRead(notification._id);
      }
      handleNotificationNavigation(notification);
    } catch (error) {
      console.error('Notification Press Error:', error);
      toast.error('Không thể xử lý thông báo');
    }
  };

  return (
    <div className="notifications-container p-4 max-w-2xl mx-auto">
      <button
        onClick={handleDeleteAllNotifications}
        style={{ marginLeft: '200px' }}
        className=" mb-4 px-5 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors "
      >
        Xóa tất cả thông báo
      </button>
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-8">
          <MdNotifications className="mx-auto text-4xl text-gray-400 mb-2" />
          <p className="text-gray-500">Không có thông báo nào</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification, index) => (
            <div
              key={`${notification._id}-${index}`}
              className={`p-4 rounded-lg shadow-sm bg-white 
                ${notification.read ? 'opacity-75' : 'opacity-100'}
                transition-all duration-200 hover:shadow-md cursor-pointer`}
              onClick={() => handleNotificationPress(notification)}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  {notification.senderAvatar ? (
                    <img
                      src={notification.senderAvatar}
                      alt="Avatar"
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <MdNotifications className="text-gray-500" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">
                        {notification.senderName || 'Hệ thống'}
                      </p>
                      <span className="text-xs text-gray-500">
                        {notification.createdAt ? (
                          format(new Date(notification.createdAt), 'HH:mm - dd/MM/yyyy', { locale: vi })
                        ) : (
                          'Thời gian không hợp lệ'
                        )}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Bạn có chắc chắn muốn xóa thông báo này?')) {
                          handleDeleteNotification(notification._id);
                        }
                      }}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <MdDelete className="h-5 w-5" />
                    </button>
                  </div>
                  <p className="text-gray-600 mt-1">
                    {notification.type === 'new_report' && 'Có báo cáo mới cần xử lý'}
                    {notification.type === 'user_report' && 'Báo cáo về người dùng'}
                    {notification.type === 'post_report' && 'Báo cáo về bài viết'}
                    {notification.type === 'comment_report' && 'Báo cáo về bình luận'}
                  </p>
                  {!notification.read && (
                    <span className="inline-block mt-2 text-xs text-blue-600">
                      Nhấn để xem chi tiết
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications; 