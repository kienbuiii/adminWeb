import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { format, isValid, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useAdminSocket } from '../context/AdminSocketContext';
import apiConfig from '../apiconfig';
import { MdSearch } from 'react-icons/md';
import debounce from 'lodash/debounce';

const AdminChat = () => {
  // States
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const { socket, connected } = useAdminSocket();
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const [adminId, setAdminId] = useState(null);
  const messagesContainerRef = useRef(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [lastActive, setLastActive] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [filters, setFilters] = useState({
    role: '',
    vohieuhoa: '',
    verified: '',
    gender: '',
    isOnline: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false
  });
  const [sortOptions, setSortOptions] = useState({
    sortBy: 'createdAt',
    sortOrder: -1
  });
  const [unreadCounts, setUnreadCounts] = useState({});

  // Get adminId on mount
  useEffect(() => {
    const storedAdminId = localStorage.getItem('adminId');
    if (storedAdminId) {
      setAdminId(storedAdminId);
    } else {
      console.error('No adminId found');
      setError('Vui lòng đăng nhập lại');
    }
  }, []);

  // Fetch users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Không tìm thấy token xác thực');
      }

      const response = await axios({
        method: 'post',
        url: `${apiConfig.baseURL}${apiConfig.endpoints.allUsers()}`,
        data: {
          search: searchTerm || '',
          sortBy: 'lastActive',
          sortOrder: -1
        },
        headers: {
          ...apiConfig.headers,
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        const { users: responseUsers } = response.data.data;
        setUsers(responseUsers);
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error('Error fetching users:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      if (error.response?.status === 401) {
        setError('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
      } else {
        setError('Không thể tải danh sách người dùng');
      }
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // Add pagination controls
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, page: newPage }));
      fetchUsers(newPage);
    }
  };

  // Add filter handling
  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
    // Reset to first page when filters change
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchUsers(1);
  };

  // Update useEffect for initial load and search
  useEffect(() => {
    const delayedFetch = setTimeout(() => {
      fetchUsers(1);
    }, 300); // Debounce time for search

    return () => clearTimeout(delayedFetch);
  }, [searchTerm, filters, sortOptions]);

  // Add pagination controls to the UI
  const renderPagination = () => (
    <div className="flex justify-center items-center space-x-2 mt-4 pb-4">
      <button
        onClick={() => handlePageChange(pagination.page - 1)}
        disabled={!pagination.hasPrevPage}
        className={`px-3 py-1 rounded ${
          pagination.hasPrevPage 
            ? 'bg-blue-500 text-white hover:bg-blue-600' 
            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
        }`}
      >
        Trước
      </button>
      <span className="text-sm text-gray-600">
        Trang {pagination.page} / {pagination.totalPages}
      </span>
      <button
        onClick={() => handlePageChange(pagination.page + 1)}
        disabled={!pagination.hasNextPage}
        className={`px-3 py-1 rounded ${
          pagination.hasNextPage 
            ? 'bg-blue-500 text-white hover:bg-blue-600' 
            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
        }`}
      >
        Sau
      </button>
    </div>
  );

  // Add filter controls to the UI (add this near the search input)
  const renderFilters = () => (
    <div className="flex flex-wrap gap-2 p-4 border-b border-gray-200">
      <select
        value={filters.role}
        onChange={(e) => handleFilterChange('role', e.target.value)}
        className="px-2 py-1 border rounded text-sm"
      >
        <option value="">Vai trò</option>
        <option value="user">User</option>
        <option value="admin">Admin</option>
      </select>
      
      <select
        value={filters.vohieuhoa}
        onChange={(e) => handleFilterChange('vohieuhoa', e.target.value)}
        className="px-2 py-1 border rounded text-sm"
      >
        <option value="">Trạng thái</option>
        <option value="true">Vô hiệu hóa</option>
        <option value="false">Hoạt động</option>
      </select>
      
      <select
        value={filters.verified}
        onChange={(e) => handleFilterChange('verified', e.target.value)}
        className="px-2 py-1 border rounded text-sm"
      >
        <option value="">Xác thực</option>
        <option value="true">Đã xác thực</option>
        <option value="false">Chưa xác thực</option>
      </select>
    </div>
  );

  // Fetch conversations
  const fetchConversations = async () => {
    try {
      const response = await axios.post(
        `${apiConfig.baseURL}${apiConfig.endpoints.conversations()}`,
        {},
        { headers: apiConfig.headers }
      );
      setConversations(response.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setError('Không thể tải danh sách cuộc trò chuyện');
      setLoading(false);
    }
  };

  // Fetch chat history
  const fetchChatHistory = async (userId) => {
    try {
      const response = await axios.post(
        `${apiConfig.baseURL}${apiConfig.endpoints.chatHistory(userId)}`,
        {},
        { method:'POST',
          headers: apiConfig.headers }
      );
      setMessages(response.data.data);
      scrollToBottom();
      
      // Mark messages as read
      await axios.patch(
        `${apiConfig.baseURL}${apiConfig.endpoints.markRead(userId)}`,
        {},
        { headers: apiConfig.headers }
      );
    } catch (error) {
      console.error('Error fetching chat history:', error);
      setError('Không thể tải tin nhắn');
    }
  };

 // Send message
const handleSendMessage = async () => {
  if (!newMessage.trim() || !selectedUser || !socket || !connected || !adminId) {
      console.log('Validation failed:', {
          message: newMessage,
          selectedUser: !!selectedUser,
          socket: !!socket,
          connected,
          adminId
      });
      return;
  }

  try {
      // Đơn giản hóa cấu trúc message data
      const messageData = {
          adminId,
          userId: selectedUser._id,
          text: newMessage.trim(),
          type: 'text'
      };

      console.log('Sending message data:', messageData);

      // Emit sự kiện gửi tin nhắn qua socket
      socket.emit('adminSendMessage', messageData);

      // Thêm tin nhắn vào state local ngay lập tức để UI responsive
      const localMessage = {
          _id: Date.now().toString(), // temporary ID
          content: newMessage.trim(),
          sender: {
              _id: adminId,
              role: 'admin'
          },
          receiver: {
              _id: selectedUser._id
          },
          createdAt: new Date().toISOString(),
          type: 'text'
      };

      setMessages(prev => [...prev, localMessage]);
      setNewMessage('');
      scrollToBottom();

  } catch (error) {
      console.error('Error in handleSendMessage:', error);
      setError('Không thể gửi tin nhắn');
  }
};
  // Socket events
useEffect(() => {
  if (!socket || !connected) {
      console.log('Socket not ready:', { socket: !!socket, connected });
      return;
  }

  // Lắng nghe tin nhắn mới
  socket.on('newMessage', (data) => {
      console.log('Received new message:', data);
      if (!data.message) return;
      
      const message = data.message;
      if (selectedUser?._id === message.sender?._id || 
          selectedUser?._id === message.receiver?._id) {
          setMessages(prev => {
              // Kiểm tra tin nhắn trùng lặp
              const exists = prev.some(m => 
                  m._id === message._id || 
                  (m.content === message.content && 
                   m.sender?._id === message.sender?._id && 
                   Math.abs(new Date(m.createdAt) - new Date(message.createdAt)) < 1000)
              );
              if (exists) return prev;
              return [...prev, message];
          });
          scrollToBottom();
      }
  });

  // Lắng nghe xác nhận tin nhắn đã gửi
  socket.on('messageSent', (data) => {
      console.log('Message sent confirmation:', data);
      if (!data.message) return;
      
      const message = data.message;
      setMessages(prev => {
          // Thay thế tin nhắn tạm thời bằng tin nhắn từ server
          return prev.map(m => {
              if (m.content === message.content && 
                  m.sender?._id === message.sender?._id && 
                  Math.abs(new Date(m.createdAt) - new Date(message.createdAt)) < 1000) {
                  return message;
              }
              return m;
          });
      });
  });

  // Lắng nghe lỗi gửi tin nhắn
  socket.on('messageError', (error) => {
      console.error('Socket message error:', error);
      setError(error.message || 'Không thể gửi tin nhắn');
  });

  return () => {
      socket.off('newMessage');
      socket.off('messageSent');
      socket.off('messageError');
  };
}, [socket, connected, selectedUser]);
  // Initial load
  useEffect(() => {
    fetchConversations();
  }, []);

  // Load chat history when user selected
  useEffect(() => {
    if (selectedUser?._id) {
      fetchChatHistory(selectedUser._id);
    }
  }, [selectedUser]);

  // Socket connection for real-time messages
  useEffect(() => {
    if (!socket || !connected) return;

    // Lắng nghe tin nhắn mới
    socket.on('receiveMessage', (message) => {
      console.log('Received message:', message);
      setMessages(prev => {
        // Kiểm tra tin nhắn trùng lặp
        const messageExists = prev.some(m => m._id === message._id);
        if (messageExists) return prev;
        
        // Chuẩn hóa cấu trúc tin nhắn
        const normalizedMessage = {
          _id: message._id,
          content: message.content || message.text,
          sender: message.sender || message.senderId,
          createdAt: message.createdAt,
          type: message.type
        };
        
        return [...prev, normalizedMessage];
      });
      scrollToBottom();
    });

    // Xử lý tin nhắn đã gửi
    socket.on('messageSent', (message) => {
      console.log('Message sent successfully:', message);
      setMessages(prev => {
        const normalizedMessage = {
          _id: message._id,
          content: message.content || message.text,
          sender: message.sender || message.senderId,
          createdAt: message.createdAt,
          type: message.type
        };
        return [...prev, normalizedMessage];
      });
      scrollToBottom();
    });

    // Lắng nghe lỗi gửi tin nhắn
    socket.on('messageError', (error) => {
      console.error('Message error:', error);
      setError('Không thể gửi tin nhn: ' + error.message);
    });

    // Lắng nghe trạng thái đang nhập
    socket.on('userTyping', ({ userId: typingUserId }) => {
      if (selectedUser && typingUserId === selectedUser._id) {
        setIsTyping(true);
      }
    });

    socket.on('userStopTyping', ({ userId: typingUserId }) => {
      if (selectedUser && typingUserId === selectedUser._id) {
        setIsTyping(false);
      }
    });

    return () => {
      socket.off('receiveMessage');
      socket.off('messageSent');
      socket.off('messageError');
      socket.off('userTyping');
      socket.off('userStopTyping');
    };
  }, [socket, connected, selectedUser]);

  // Admin connection
  useEffect(() => {
    if (!socket || !connected || !adminId) return;

    // Thông báo admin đã kết nối
    socket.emit('adminConnected', adminId);
    
    // Yêu cầu trạng thái của tất cả users
    users.forEach(user => {
      socket.emit('getUserStatus', user._id);
    });

    console.log('Admin connected:', adminId);

    return () => {
      socket.emit('adminDisconnected', adminId);
    };
  }, [socket, connected, adminId, users]);

  // Online status handling
  useEffect(() => {
    if (!socket || !connected) return;

    socket.on('onlineUsers', (usersList) => {
      console.log('Received online users:', usersList);
      setOnlineUsers(new Set(usersList));
    });

    socket.on('userStatusChanged', ({ userId, isOnline, lastActive }) => {
      console.log('User status changed:', { userId, isOnline, lastActive });
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        if (isOnline) {
          newSet.add(userId);
        } else {
          newSet.delete(userId);
        }
        return newSet;
      });
      
      if (!isOnline) {
        setLastActive(prev => ({
          ...prev,
          [userId]: lastActive
        }));
      }
    });

    socket.on('userStatus', ({ userId, isOnline, lastActive }) => {
      if (!isOnline && lastActive) {
        setLastActive(prev => ({
          ...prev,
          [userId]: lastActive
        }));
      }
    });

    return () => {
      socket.off('onlineUsers');
      socket.off('userStatusChanged');
      socket.off('userStatus');
    };
  }, [socket, connected]);
  // ... tiếp theo phần 2

  // Handle user selection
  const handleUserSelect = async (user) => {
    try {
      setSelectedUser(user);
      setLoading(true);
      setError(null);

      if (socket && connected && adminId) {
        // Join admin chat room
        socket.emit('adminJoinChat', { 
          adminId, 
          userId: user._id 
        });
      }

      // Fetch chat history
      const response = await axios.get(
        `${apiConfig.baseURL}/api/chat/admin/history/${user._id}`,
        { headers: apiConfig.headers }
      );

      if (response.data.success) {
        setMessages(response.data.messages);
        scrollToBottom();
        
        // Mark messages as read
        socket.emit('adminMarkRead', {
          adminId,
          userId: user._id
        });
      }
    } catch (error) {
      console.error('Error fetching chat history:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle typing
  const handleTyping = () => {
    if (!socket || !connected || !selectedUser || !adminId) return;

    socket.emit('adminTyping', { 
      adminId, 
      userId: selectedUser._id 
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('adminStopTyping', { 
        adminId, 
        userId: selectedUser._id 
      });
    }, 1000);
  };

  // Utility functions
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  };

  // Helper functions
  const formatMessageTime = (timestamp) => {
    try {
      if (!timestamp) return '';
      
      let date;
      if (typeof timestamp === 'string') {
        date = parseISO(timestamp);
      } else if (timestamp instanceof Date) {
        date = timestamp;
      } else {
        return '';
      }

      if (!isValid(date)) return '';
      
      return format(date, 'HH:mm', { locale: vi });
    } catch (error) {
      console.error('Error formatting message time:', error);
      return '';
    }
  };

  const formatLastActive = (timestamp) => {
    try {
      if (!timestamp) return 'Chưa hoạt động';
      
      let date;
      if (typeof timestamp === 'string') {
        date = parseISO(timestamp);
      } else if (timestamp instanceof Date) {
        date = timestamp;
      } else {
        return 'Chưa hoạt động';
      }

      if (!isValid(date)) return 'Chưa hoạt động';

      const now = new Date();
      const diffInMinutes = Math.floor((now - date) / 1000 / 60);

      if (diffInMinutes < 1) return 'Vừa mới truy cập';
      if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} giờ trước`;
      
      return format(date, 'dd/MM/yyyy HH:mm', { locale: vi });
    } catch (error) {
      console.error('Error formatting last active:', error);
      return 'Chưa hoạt động';
    }
  };

  const renderMessages = () => {
    return messages.map((message) => {
      console.log('Message data:', {
        id: message._id,
        createdAt: message.createdAt,
        content: message.content || message.text
      });

      return (
        <div
          key={message._id || Math.random()}
          className={`flex ${
            message.sender?._id === adminId || message.senderId?._id === adminId 
              ? 'justify-end' 
              : 'justify-start'
          }`}
        >
          <div className={`flex items-end space-x-2 max-w-[70%] ${
            message.sender?._id === adminId || message.senderId?._id === adminId 
              ? 'flex-row-reverse space-x-reverse' 
              : ''
          }`}>
            {(message.sender?._id !== adminId && message.senderId?._id !== adminId) && (
              <img
                src={selectedUser?.avatar || '/default-avatar.png'}
                alt=""
                className="w-6 h-6 rounded-full flex-shrink-0"
                loading="lazy"
              />
            )}
            <div className={`px-3 py-2 rounded-lg shadow-sm ${
              message.sender?._id === adminId || message.senderId?._id === adminId
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-800'
            }`}>
              <p className="text-sm whitespace-pre-wrap break-words">
                {message.content || message.text || ''}
              </p>
              <span className={`text-[10px] mt-1 block ${
                message.sender?._id === adminId || message.senderId?._id === adminId 
                  ? 'text-blue-100' 
                  : 'text-gray-400'
              }`}>
                {formatMessageTime(message.createdAt) || 'Vừa xong'}
              </span>
            </div>
          </div>
        </div>
      );
    });
  };

  // Search function with debounce
  const debouncedSearch = useCallback(
    debounce(async (searchTerm, searchFilters = filters) => {
      if (!searchTerm.trim() && !Object.values(searchFilters).some(v => v !== '')) {
        setSearchResults([]);
        return;
      }

      try {
        setIsSearching(true);
        const response = await axios.post(
          `${apiConfig.baseURL}${apiConfig.endpoints.searchUsers()}`,
          {
            searchTerm,
            filters: searchFilters,
            pagination: {
              page: pagination.page,
              limit: pagination.limit
            },
            sortOptions: {
              field: 'lastActive',
              order: 'desc'
            }
          },
          { headers: apiConfig.headers }
        );

        if (response.data.success) {
          const { users, pagination: newPagination } = response.data.data;
          setSearchResults(users);
          setPagination(prev => ({
            ...prev,
            total: newPagination.total,
            totalPages: newPagination.totalPages
          }));
        }
      } catch (error) {
        console.error('Error searching users:', error);
        setError('Không thể tìm kiếm người dùng');
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500),
    [filters, pagination.page, pagination.limit]
  );

  // Handle search input change
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    debouncedSearch(value);
  };

  // Render users list
  const renderUsersList = () => {
    const displayUsers = searchTerm || Object.values(filters).some(v => v !== '') 
      ? searchResults 
      : users;

    if (loading) {
      return (
        <div className="flex justify-center items-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      );
    }

    if (!Array.isArray(displayUsers) || displayUsers.length === 0) {
      return (
        <div className="p-4 text-center text-gray-500">
          {searchTerm ? 'Không tìm thy người dùng' : 'Không có người dùng nào'}
        </div>
      );
    }

    return displayUsers.map(user => (
      <div
        key={user._id}
        onClick={() => handleUserSelect(user)}
        className={`p-3 hover:bg-gray-50 cursor-pointer transition-colors duration-150 ${
          selectedUser?._id === user._id ? 'bg-blue-50' : ''
        }`}
      >
        <div className="flex items-center space-x-2">
          <div className="relative flex-shrink-0">
            <img
              src={user.avatar || '/default-avatar.png'}
              alt={user.username}
              className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
            />
            {onlineUsers.has(user._id) ? (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-white rounded-full"></span>
            ) : (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-gray-300 border-2 border-white rounded-full"></span>
            )}
            {user.verified && (
              <span className="absolute -top-1 -right-1">
                <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm3.707 6.293a1 1 0 00-1.414 0L9 11.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4a1 1 0 000-1.414z" />
                </svg>
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 truncate">
              {user.username}
              {user.vohieuhoa && (
                <span className="ml-1 text-xs text-red-500">(Vô hiệu hóa)</span>
              )}
            </h3>
            <p className="text-xs text-gray-500 truncate">
              {onlineUsers.has(user._id)
                ? 'Đang hoạt động'
                : formatLastActive(user.recentActivity?.lastLogin || lastActive[user._id])
              }
            </p>
          </div>
          {user.postsCount > 0 && (
            <div className="text-xs text-gray-400">
              {user.postsCount} bài viết
            </div>
          )}
        </div>
      </div>
    ));
  };

  // Main render
  if (loading && !users.length) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-gray-50">
      {/* Sidebar chat */}
      <div className="w-80 flex-shrink-0 flex flex-col bg-white border-r border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Tin nhắn</h2>
          <div className="mt-2 relative">
            <input
              type="search"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Tìm kiếm người dùng..."
              className="w-full pl-10 pr-4 py-2 rounded-full border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <MdSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          </div>
        </div>
        
        {renderFilters()}
        
        <div className="flex-1 overflow-y-auto">
          {renderUsersList()}
        </div>
        
        {renderPagination()}
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedUser ? (
          <>
            {/* Chat header */}
            <div className="h-16 px-6 flex items-center justify-between border-b border-gray-200 bg-white">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <img
                    src={selectedUser.avatar || '/default-avatar.png'}
                    alt={selectedUser.username}
                    className="w-9 h-9 rounded-full object-cover"
                  />
                  {onlineUsers.has(selectedUser._id) ? (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-white rounded-full"></span>
                  ) : (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-gray-300 border-2 border-white rounded-full"></span>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-semibold">{selectedUser.username}</h3>
                  <p className="text-xs text-gray-500">
                    {onlineUsers.has(selectedUser._id)
                      ? 'Đang hoạt động'
                      : formatLastActive(lastActive[selectedUser._id])
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Messages container */}
            <div 
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-6 space-y-4"
              style={{ height: 'calc(100vh - 160px)' }}
            >
              {renderMessages()}
              {isTyping && (
                <div className="flex items-center space-x-2 text-gray-500">
                  <div className="animate-bounce">.</div>
                  <div className="animate-bounce animation-delay-200">.</div>
                  <div className="animate-bounce animation-delay-400">.</div>
                </div>
              )}
            </div>

            {/* Input area */}
            <div className="h-16 px-6 py-3 border-t border-gray-200 bg-white">
              <div className="flex items-center space-x-3 h-full">
                <div className="flex-1">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      handleTyping();
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="w-full px-4 py-2 text-sm rounded-full border border-gray-300 focus:outline-none focus:border-blue-500"
                    placeholder="Nhập tin nhắn..."
                  />
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className={`p-2 rounded-full transition-all ${
                    newMessage.trim()
                      ? 'bg-blue-500 hover:bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900">Chưa chọn cuộc trò chuyện</h3>
              <p className="text-gray-500 mt-1">Chọn một người dùng để bắt đầu trò chuyện</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminChat;