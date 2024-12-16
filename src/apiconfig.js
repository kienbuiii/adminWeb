// apiConfig.js
const apiConfig = {
  // Sử dụng trực tiếp URL của API
  baseURL: 'https://www.adminftravel.xyz' || 'http://localhost:3000',
  socketUR: 'https://www.adminftravel.xyz',

  headers: {
    'Content-Type': 'application/json',
    'Authorization': null
  },

  setAuthorizationToken(token) {
    if (token) {
      const tokenValue = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      this.headers.Authorization = tokenValue;
      localStorage.setItem('token', token);
    } else {
      delete this.headers.Authorization;
      localStorage.removeItem('token');
    }
  },

  initializeToken() {
    const token = localStorage.getItem('token');
    if (token) {
      this.setAuthorizationToken(token);
    }
  },

  clearToken() {
    this.setAuthorizationToken(null);
  },

  // Cập nhật endpoints cho chat
  endpoints: {
    login: '/api/admin/login',
    users: () => '/api/admin/users',
    stats: '/api/admin/dashboard-stats',
    getUserStatus: (userId) => `/api/admin/users/${userId}/status`,
    chatHistory: (userId) => `/api/admin/chat/${userId}`,

    allUsers: () => '/api/admin/users/all',
    userDetail: (id) => `/api/admin/users/detail/${id}`,
    userPosts: (id) => `/api/admin/users/${id}/posts`,
    userTravelPosts: (id) => `/api/admin/users/${id}/travel`,
    getStats: () => '/api/admin/dashboard-stats',
    searchUsers: () => '/api/admin/users/search',
    disableUser: (id) => `/api/admin/users/${id}/disable`,
    enableUser: (id) => `/api/admin/users/${id}/enable`,
    deleteUser: (id) => `/api/admin/users/${id}`,
    deletePost: (postId) => `/api/admin/deletePost/${postId}`,
    deleteTravelPost: (postId) => `/api/admin/travel/${postId}`,
    postDetail: (id) => `/api/admin/posts/${id}`,



    reports: {
      adminAll: '/api/reports/admin/all',
      adminUpdate: (id) => `/api/reports/admin/${id}`,
      adminDelete: (id) => `/api/reports/admin/${id}`,
      adminDetail: (id) => `/api/reports/admin/detail/${id}`
    },

    // Thêm notifications endpoints
    notifications: {
      getAll: '/api/admin/notifications',
      markAllRead: '/api/admin/notifications/mark-all-read',
      markRead: (id) => `/api/admin/notifications/${id}/mark-read`,
      delete: (id) => `/api/admin/notifications/${id}`,
      unreadCount: '/api/admin/notifications/unread-count'
    },


    onlineUsers: '/api/admin/online-users',


    chat: {

      sendImage: (userId) => `/api/admin/chat/send-image/${userId}`,
      sendMultipleImages: (userId) => `/api/admin/chat/send-multiple-images/${userId}`,

    },
  },

  // Report constants
  reportTypes: {
    USER: 'User',
    POST: 'Post',
    TRAVEL_POST: 'TravelPost',
    COMMENT: 'Comment'
  },

  reportReasons: {
    SPAM: 'spam',
    HARASSMENT: 'harassment',
    INAPPROPRIATE_CONTENT: 'inappropriate_content',
    VIOLENCE: 'violence',
    HATE_SPEECH: 'hate_speech',
    FALSE_INFORMATION: 'false_information',
    OTHER: 'other'
  },

  reportStatus: {
    PENDING: 'pending',
    REVIEWING: 'reviewing',
    RESOLVED: 'resolved',
    REJECTED: 'rejected'
  },

  // Socket events
  socketEvents: {
    connect: 'connect',
    adminConnected: 'adminConnected',
    receiveMessage: 'receive_message',
    messageSent: 'message_sent',
    userTyping: 'user_typing',
    userStopTyping: 'user_stop_typing',
    messageError: 'message_error',
    userStatusChanged: 'user_status_changed'
  }
};

apiConfig.initializeToken();

export default apiConfig;