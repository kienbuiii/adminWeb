import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAdminSocket, useOnlineStatus } from '../context/AdminSocketContext';
import { format, parseISO, isValid } from 'date-fns';
import { vi } from 'date-fns/locale';
import { MdSearch, MdVerified } from 'react-icons/md';
import axios from 'axios';
import apiConfig from '../apiconfig';
import ImageUploader from '../components/ImageUploader';
import debounce from 'lodash/debounce';
import { IoSend, IoImageOutline } from 'react-icons/io5';
import { BsEmojiSmile } from 'react-icons/bs';
import { MdOutlineMarkUnreadChatAlt } from 'react-icons/md';

const AdminChat = () => {
  // States
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [onlineStats, setOnlineStats] = useState({
    totalOnline: 0,
    verifiedCount: 0,
    normalUserCount: 0
  });

  // Refs
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // Socket Context
  const { 
    socket, 
    connected, 
    sendAdminMessage,
    sendAdminImage,
    sendAdminMultipleImages,
    joinAdminChat, 
    markMessagesAsRead,
    emitTyping 
  } = useAdminSocket();

  const onlineUsers = useOnlineStatus();

  // Di chuyển scrollToBottom lên đầu
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      const scrollHeight = messagesContainerRef.current.scrollHeight;
      const height = messagesContainerRef.current.clientHeight;
      const maxScrollTop = scrollHeight - height;
      
      messagesContainerRef.current.scrollTo({
        top: maxScrollTop,
        behavior: 'smooth'
      });
    }
  };

  // Auto scroll when messages change
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  // Fetch users và online status
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const [usersResponse, onlineUsersResponse] = await Promise.all([
        axios.post(
          `${apiConfig.baseURL}${apiConfig.endpoints.onlineUsers}`,
          { search: searchTerm },
          { headers: apiConfig.headers }
        ),
        axios.post(
          `${apiConfig.baseURL}${apiConfig.endpoints.onlineUsers}`,
          {},
          { headers: apiConfig.headers }
        )
      ]);

      if (usersResponse.data.success && onlineUsersResponse.data.success) {
        const allUsers = usersResponse.data.data.users;
        const onlineUserIds = onlineUsersResponse.data.data.users.map(user => user._id);
        
        // Merge online status with users
        const usersWithOnlineStatus = allUsers.map(user => ({
          ...user,
          isOnline: onlineUserIds.includes(user._id)
        }));

        setUsers(usersWithOnlineStatus);
        setOnlineStats(onlineUsersResponse.data.data.statistics);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Không thể tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchUsers();
  }, []);

  // Fetch periodically
  useEffect(() => {
    const interval = setInterval(fetchUsers, 30000); // every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Handle search with debounce
  useEffect(() => {
    if (searchTerm !== '') {
      const handler = setTimeout(() => {
        fetchUsers();
      }, 500);
      return () => clearTimeout(handler);
    }
  }, [searchTerm]);

  // Enhance socket message handling
  useEffect(() => {
    if (!socket || !connected) return;

    const handleNewMessage = (message) => {
      if (selectedUser?._id === message.sender._id || 
          selectedUser?._id === message.receiver) {
        // Kiểm tra tin nhắn đã tồn tại chưa
        setMessages(prev => {
          const messageExists = prev.some(msg => 
            msg._id === message._id || msg.tempId === message.tempId
          );
          if (messageExists) return prev;
          return [...prev, message];
        });
        
        scrollToBottom();
        
        // Tự động đánh dấu đã đọc tin nhắn từ user
        if (!message.isAdminMessage) {
          markMessagesAsRead(selectedUser._id);
        }
      }
    };

    const handleMessageSent = (message) => {
      setMessages(prev => {
        // Xóa tin nhắn tạm và thêm tin nhắn đã gửi
        const filteredMessages = prev.filter(msg => msg.tempId !== message.tempId);
        // Kiểm tra tin nhắn đã tồn tại chưa
        const messageExists = filteredMessages.some(msg => msg._id === message._id);
        if (messageExists) return filteredMessages;
        return [...filteredMessages, {
          ...message,
          status: 'sent',
          read: false
        }];
      });
      scrollToBottom();
    };

    const handleMessageError = ({ error, tempId }) => {
      setMessages(prev => prev.map(msg => 
        msg.tempId === tempId 
          ? { ...msg, status: 'error', error: error } 
          : msg
      ));
    };

    socket.on('receive_message', handleNewMessage);
    socket.on('message_sent', handleMessageSent);
    socket.on('message_error', handleMessageError);
    socket.on('admin_typing_status', ({ isTyping }) => {
      setIsTyping(isTyping);
    });

    return () => {
      socket.off('receive_message', handleNewMessage);
      socket.off('message_sent', handleMessageSent);
      socket.off('message_error', handleMessageError);
      socket.off('admin_typing_status');
    };
  }, [socket, connected, selectedUser, markMessagesAsRead]);

  // Enhance message sending
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedUser) return;

    const tempId = Date.now().toString();
    const messageData = {
      userId: selectedUser._id,
      text: newMessage.trim(),
      type: 'text',
      adminId: localStorage.getItem('adminId'),
      tempId
    };

    // Add optimistic message
    const optimisticMessage = {
      tempId,
      _id: tempId,
      content: newMessage.trim(),
      sender: {
        _id: localStorage.getItem('adminId'),
        role: 'admin'
      },
      receiver: selectedUser._id,
      createdAt: new Date().toISOString(),
      type: 'text',
      status: 'pending',
      isAdminMessage: true
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage('');
    scrollToBottom();

    try {
      const response = await sendAdminMessage(messageData);
      // Cập nhật tin nhắn với thông tin từ server
      setMessages(prev => prev.map(msg => 
        msg.tempId === tempId ? { ...response, status: 'sent' } : msg
      ));
    } catch (error) {
      console.error('Error sending message:', error);
      // Cập nhật trạng thái lỗi cho tin nhắn
      setMessages(prev => prev.map(msg => 
        msg.tempId === tempId 
          ? { ...msg, status: 'error', error: error.message || 'Lỗi gửi tin nhắn' } 
          : msg
      ));
    }
  };

  // Thêm hàm helper để xử lý URL Cloudinary
  const getOptimizedImageUrl = (url) => {
    if (!url) return '';
    
    // Kiểm tra nếu là URL Cloudinary
    if (url.includes('cloudinary.com')) {
      // Thêm các tham số tối ưu hình ảnh
      const baseUrl = url.split('/upload/')[0];
      const imageId = url.split('/upload/')[1];
      return `${baseUrl}/upload/q_auto,f_auto/${imageId}`;
    }
    
    return url;
  };

  // Cập nhật phần render message để xử lý ảnh
  const renderMessage = (message) => {
    const isAdmin = message.sender?.role === 'admin';
    const messageStatus = message.status || 'sent';

    return (
      <div key={message._id || message.tempId} 
           className={`flex ${isAdmin ? 'justify-end' : 'justify-start'} mb-3`}>
        <div className={`max-w-[70%] flex items-end ${
          isAdmin ? 'flex-row-reverse' : 'flex-row'
        } space-x-2`}>
          {!isAdmin && (
            <img
              src={selectedUser?.avatar || '/default-avatar.png'}
              alt=""
              className="w-8 h-8 rounded-full flex-shrink-0"
            />
          )}
          <div>
            <div className={`text-xs mb-1 ${
              isAdmin ? 'text-right text-gray-500' : 'text-left text-gray-500'
            }`}>
              {isAdmin ? 'Admin' : selectedUser?.username}
            </div>
            
            <div className={`relative px-4 py-2.5 rounded-2xl shadow-sm ${
              isAdmin 
                ? 'bg-[#0084ff] text-white' 
                : 'bg-white text-gray-800'
            } ${
              isAdmin ? 'rounded-br-sm' : 'rounded-bl-sm'
            }`}>
              {message.type === 'image' ? (
                <div className="relative">
                  <img 
                    src={getOptimizedImageUrl(message.content)}
                    alt="Sent image"
                    className="max-w-full rounded-lg cursor-pointer"
                    onClick={() => window.open(message.content, '_blank')}
                    onError={(e) => {
                      console.error('Image loading error:', e);
                      e.target.src = '/default-image.png'; // Fallback image
                    }}
                    loading="lazy"
                  />
                  {messageStatus === 'pending' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              )}
              
              <div className={`flex items-center justify-end space-x-2 mt-1 text-xs ${
                isAdmin ? 'text-blue-50' : 'text-gray-500'
              }`}>
                <span>{formatMessageTime(message.createdAt)}</span>
                {messageStatus === 'pending' && (
                  <span>Đang gửi...</span>
                )}
                {messageStatus === 'error' && (
                  <span className="text-red-500">
                    Lỗi gửi tin nhắn
                    <button 
                      onClick={() => handleResendMessage(message)}
                      className="ml-2 text-blue-500 hover:underline"
                    >
                      Gửi lại
                    </button>
                  </span>
                )}
                {message.read && isAdmin && (
                  <span className="text-blue-50">✓✓</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Move useEffect and useCallback hooks before any conditional returns
  useEffect(() => {
    if (!socket || !connected) return;

    // Chỉ lắng nghe receive_message cho tin nhắn từ user
    socket.on('receive_message', (message) => {
      if (selectedUser?._id === message.sender._id) {
        setMessages(prev => [...prev, message]);
        scrollToBottom();
        markMessagesAsRead(selectedUser._id);
      }
    });

    // Xử lý message_sent cho tin nhắn của admin
    socket.on('message_sent', (message) => {
      // Xóa tin nhắn tạm (nếu có) và thêm tin nhắn đã được xác nhận
      setMessages(prev => {
        const filteredMessages = prev.filter(msg => msg.tempId !== message.tempId);
        return [...filteredMessages, message];
      });
      scrollToBottom();
    });

    // Handle message errors
    socket.on('message_error', ({ error, tempId }) => {
      console.error('Message sending failed:', error);
      // You could update the UI to show the error state of the message
      setMessages(prev => prev.map(msg => 
        msg.tempId === tempId 
          ? { ...msg, error: true } 
          : msg
      ));
    });

    // Handle conversation updates
    socket.on('conversation_updated', (update) => {
      // Update the conversation list if needed
      if (selectedUser?._id === update.senderId || 
          selectedUser?._id === update.receiverId) {
        // You might want to update the last message preview
      }
    });

    socket.on('admin_typing_status', ({ isTyping }) => {
      if (selectedUser) {
        setIsTyping(isTyping);
      }
    });

    socket.on('messages_marked_read_success', ({ userId }) => {
      if (selectedUser?._id === userId) {
        setMessages(prev => 
          prev.map(msg => ({...msg, read: true}))
        );
      }
    });

    return () => {
      socket.off('receive_message');
      socket.off('message_sent');
      socket.off('message_error');
      socket.off('conversation_updated');
      socket.off('admin_typing_status');
      socket.off('messages_marked_read_success');
    };
  }, [socket, connected, selectedUser, markMessagesAsRead]);

  // Move debouncedSearch before conditional returns
  const debouncedSearch = useCallback(
    debounce((term) => {
      fetchUsers(term);
    }, 500),
    []
  );

  // Add useEffect to handle URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('userId');
    
    if (userId) {
      // Chỉ tìm user trong danh sách users hiện có
      const user = users.find(u => u._id === userId);
      if (user) {
        setSelectedUser(user);
        joinAdminChat(userId);
        fetchChatHistory(userId);
      }
    }
  }, [users]); // Add users to dependency array

  // Update URL when selecting user
  useEffect(() => {
    if (selectedUser) {
      const newUrl = `${window.location.pathname}?userId=${selectedUser._id}`;
      window.history.pushState({ userId: selectedUser._id }, '', newUrl);
    }
  }, [selectedUser]);

  // Handle popstate event (browser back/forward)
  useEffect(() => {
    const handlePopState = (event) => {
      const urlParams = new URLSearchParams(window.location.search);
      const userId = urlParams.get('userId');
      
      if (userId) {
        const user = users.find(u => u._id === userId);
        if (user) {
          handleUserSelect(user);
        }
      } else {
        setSelectedUser(null);
        setMessages([]);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [users]);

  // Loading state
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">ĐĐang tải danh sách người dùng...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center text-red-500">
          <p>{error}</p>
          <button 
            onClick={fetchUsers}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  // Fetch chat history
  const fetchChatHistory = async (userId) => {
    try {
      const response = await axios.post(
        `${apiConfig.baseURL}${apiConfig.endpoints.chatHistory(userId)}`,
        {},
        { headers: apiConfig.headers }
      );

      if (response.data.success) {
        // Đảm bảo mỗi tin nhắn có đầy đủ thông tin về sender
        const formattedMessages = response.data.data.map(message => ({
          ...message,
          sender: {
            ...message.sender,
            role: message.sender._id === localStorage.getItem('adminId') ? 'admin' : 'user'
          }
        }));
        setMessages(formattedMessages);
        scrollToBottom();
        markMessagesAsRead(userId);
      }
    } catch (error) {
      console.error('Error fetching chat history:', error);
      setError('Không thể tải tin nhắn');
    }
  };

  // Handle user selection
  const handleUserSelect = async (user) => {
    setSelectedUser(user);
    joinAdminChat(user._id);
    await fetchChatHistory(user._id);
  };

  // Handle typing
  const handleTyping = () => {
    if (!selectedUser) return;
    
    emitTyping(selectedUser._id, true);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      emitTyping(selectedUser._id, false);
    }, 1000);
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    debouncedSearch(value);
  };

  // Format message time
  const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    const date = parseISO(timestamp);
    return isValid(date) ? format(date, 'HH:mm', { locale: vi }) : '';
  };

  // Render messages
  const renderMessages = () => {
    return messages.map(message => {
      // Kiểm tra chính xác role của người gửi
      const isAdmin = message.sender?.role === 'admin' || message.sender?._id === localStorage.getItem('adminId');
      const isPending = message.pending;
      
      return (
        <div
          key={message._id || message.tempId}
          className={`flex ${isAdmin ? 'justify-end' : 'justify-start'} mb-3`}
        >
          <div className={`max-w-[70%] flex items-end ${
            isAdmin ? 'flex-row-reverse' : 'flex-row'
          } space-x-2`}>
            {!isAdmin && (
              <img
                src={selectedUser?.avatar || '/default-avatar.png'}
                alt=""
                className="w-8 h-8 rounded-full flex-shrink-0"
              />
            )}
            <div>
              <div className={`text-xs mb-1 ${
                isAdmin ? 'text-right text-gray-500' : 'text-left text-gray-500'
              }`}>
                {isAdmin ? 'Admin' : selectedUser?.username}
              </div>
              
              <div 
                className={`relative px-4 py-2.5 rounded-2xl shadow-sm ${
                  isAdmin 
                    ? 'bg-[#0084ff] text-white' 
                    : 'bg-white text-gray-800'
                } ${
                  isAdmin ? 'rounded-br-sm' : 'rounded-bl-sm'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <div className={`flex items-center justify-end space-x-2 mt-1 text-xs ${
                  isAdmin ? 'text-blue-50' : 'text-gray-500'
                }`}>
                  <span>{formatMessageTime(message.createdAt)}</span>
                  {isPending && (
                    <span className={isAdmin ? 'text-blue-50' : 'text-gray-500'}>Đang gửi...</span>
                  )}
                  {message.read && isAdmin && (
                    <span className="text-blue-50">✓✓</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    });
  };

  // Thêm hàm lọc và hiển thị users online
  const renderUsersList = () => {
    const sortedUsers = [...users].sort((a, b) => {
      // Sắp xếp theo trạng thái online
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;
      
      // Nếu cùng trạng thái online, sắp xếp theo verified
      if (a.verified && !b.verified) return -1;
      if (!a.verified && b.verified) return 1;
      
      // Nếu cùng trạng thái verified, sắp xếp theo thời gian hoạt động
      return new Date(b.lastActive) - new Date(a.lastActive);
    });

    return sortedUsers.map(user => (
      <UserListItem
        key={user._id}
        user={user}
        isSelected={selectedUser?._id === user._id}
        onClick={() => handleUserSelect(user)}
      />
    ));
  };

  // Add handleResendMessage function
  const handleResendMessage = async (failedMessage) => {
    if (failedMessage.type === 'image') {
      // Cập nhật trạng thái tin nhắn thành pending
      setMessages(prev => prev.map(msg => 
        msg.tempId === failedMessage.tempId 
          ? { ...msg, status: 'pending', error: null } 
          : msg
      ));

      try {
        await sendAdminImage({
          userId: selectedUser._id,
          image: failedMessage.content,
          adminId: localStorage.getItem('adminId'),
          tempId: failedMessage.tempId
        });
      } catch (error) {
        console.error('Error resending image:', error);
        setMessages(prev => prev.map(msg => 
          msg.tempId === failedMessage.tempId 
            ? { ...msg, status: 'error', error: 'Lỗi khi gửi lại ảnh' } 
            : msg
        ));
      }
    } else {
      // Xử lý gửi lại tin nhắn text như cũ
      // ... existing resend message code ...
    }
  };

  // Thêm hàm xử lý upload ảnh
  const handleImageUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    const validFiles = files.filter(file => 
      validImageTypes.includes(file.type) && file.size <= maxSize
    );

    if (validFiles.length === 0) {
      alert('Vui lòng chọn ảnh có định dạng JPG, PNG hoặc GIF và kích thước dưới 5MB');
      return;
    }

    try {
      for (const file of validFiles) {
        const tempId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        
        // Tạo optimistic message
        const optimisticMessage = {
          tempId,
          content: URL.createObjectURL(file),
          type: 'image',
          sender: {
            _id: localStorage.getItem('adminId'),
            role: 'admin'
          },
          receiver: selectedUser._id,
          createdAt: new Date().toISOString(),
          status: 'pending',
          isAdminMessage: true
        };

        setMessages(prev => [...prev, optimisticMessage]);
        scrollToBottom();

        try {
          const reader = new FileReader();
          const imageDataPromise = new Promise((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          const base64Image = await imageDataPromise;
          const response = await sendAdminImage({
            userId: selectedUser._id,
            image: base64Image,
            adminId: localStorage.getItem('adminId'),
            tempId
          });

          // Cập nhật tin nhắn với URL ảnh từ server
          setMessages(prev => prev.map(msg => 
            msg.tempId === tempId ? { ...response, status: 'sent' } : msg
          ));
        } catch (error) {
          console.error('Error sending image:', error);
          setMessages(prev => prev.map(msg => 
            msg.tempId === tempId 
              ? { ...msg, status: 'error', error: error.message || 'Lỗi gửi ảnh' } 
              : msg
          ));
        }
      }
    } catch (error) {
      console.error('Error processing images:', error);
      alert('Có lỗi xảy ra khi xử lý ảnh');
    } finally {
      event.target.value = '';
    }
  };

  // Thêm hàm xử lý gửi nhiều ảnh (nếu cần)
  const handleMultipleImagesUpload = async (files) => {
    // Similar to handleImageUpload but uses sendAdminMultipleImages
    // ...
  };

  return (
    <div className="flex h-full bg-[#f5f7fb]">
      {/* Sidebar Users List */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
        {/* Search Header */}
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Tìm kiếm người dùng..."
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg pr-10 
              focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <MdSearch className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xl" />
          </div>
          
          {/* Online Stats */}
          <div className="mt-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Thống kê trực tuyến</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white p-3 rounded-lg shadow-sm">
                <div className="text-xs text-gray-500">Tổng online</div>
                <div className="text-lg font-semibold text-green-500">{onlineStats.totalOnline}</div>
              </div>
              <div className="bg-white p-3 rounded-lg shadow-sm">
                <div className="text-xs text-gray-500">Đã xác minh</div>
                <div className="text-lg font-semibold text-blue-500">{onlineStats.verifiedCount}</div>
              </div>
              <div className="bg-white p-3 rounded-lg shadow-sm">
                <div className="text-xs text-gray-500">Thường</div>
                <div className="text-lg font-semibold text-gray-600">{onlineStats.normalUserCount}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Users List */}
        <div className="flex-1 overflow-y-auto">
          {users.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {renderUsersList()}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Không tìm thấy người dùng nào
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      {selectedUser ? (
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          {/* Chat Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <img
                    src={selectedUser.avatar || '/default-avatar.png'}
                    alt=""
                    className="w-12 h-12 rounded-full object-cover border-2 border-gray-100"
                  />
                  <span 
                    className={`absolute bottom-0 right-0 w-3.5 h-3.5 border-2 border-white rounded-full
                      ${selectedUser.isOnline ? 'bg-green-500' : 'bg-gray-300'}`}
                  />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-lg font-medium text-gray-900">{selectedUser.username}</h2>
                    {selectedUser.verified && (
                      <MdVerified className="w-5 h-5 text-blue-500" />
                    )}
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <span className={`w-2 h-2 rounded-full ${
                      selectedUser.isOnline ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                    <span>{selectedUser.isOnline ? 'Đang hoạt động' : 'Không hoạt động'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50" ref={messagesContainerRef}>
            <div className="space-y-4">
              {messages.map(message => {
                // Kiểm tra chính xác role của người gửi
                const isAdmin = message.sender?.role === 'admin' || message.sender?._id === localStorage.getItem('adminId');
                const isPending = message.pending;
                
                return (
                  <div
                    key={message._id || message.tempId}
                    className={`flex ${isAdmin ? 'justify-end' : 'justify-start'} mb-3`}
                  >
                    <div className={`max-w-[70%] flex items-end ${
                      isAdmin ? 'flex-row-reverse' : 'flex-row'
                    } space-x-2`}>
                      {!isAdmin && (
                        <img
                          src={selectedUser?.avatar || '/default-avatar.png'}
                          alt=""
                          className="w-8 h-8 rounded-full flex-shrink-0"
                        />
                      )}
                      <div>
                        <div className={`text-xs mb-1 ${
                          isAdmin ? 'text-right text-gray-500' : 'text-left text-gray-500'
                        }`}>
                          {isAdmin ? 'Admin' : selectedUser?.username}
                        </div>
                        
                        <div 
                          className={`relative px-4 py-2.5 rounded-2xl shadow-sm ${
                            isAdmin 
                              ? 'bg-[#0084ff] text-white' 
                              : 'bg-white text-gray-800'
                          } ${
                            isAdmin ? 'rounded-br-sm' : 'rounded-bl-sm'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          <div className={`flex items-center justify-end space-x-2 mt-1 text-xs ${
                            isAdmin ? 'text-blue-50' : 'text-gray-500'
                          }`}>
                            <span>{formatMessageTime(message.createdAt)}</span>
                            {isPending && (
                              <span className={isAdmin ? 'text-blue-50' : 'text-gray-500'}>Đang gửi...</span>
                            )}
                            {message.read && isAdmin && (
                              <span className="text-blue-50">✓✓</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {isTyping && (
                <div className="flex items-center space-x-2 text-gray-500">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" />
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce delay-100" />
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce delay-200" />
                  </div>
                  <span className="text-sm">Đang nhập...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <div className="px-6 py-4 border-t border-gray-200 bg-white">
            <div className="flex items-center space-x-4">
              <button className="text-gray-400 hover:text-blue-500 transition-colors">
                <BsEmojiSmile className="w-6 h-6" />
              </button>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                id="image-upload"
                onChange={handleImageUpload}
              />
              <label 
                htmlFor="image-upload"
                className="text-gray-400 hover:text-blue-500 transition-colors cursor-pointer"
              >
                <IoImageOutline className="w-6 h-6" />
              </label>
              <div className="flex-1">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleTyping();
                  }}
                  placeholder="Nhập tin nhắn..."
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg
                  focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  onKeyPress={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                />
              </div>
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                className={`p-2.5 rounded-lg ${
                  newMessage.trim()
                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                } transition-colors`}
              >
                <IoSend className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center text-gray-500">
            <div className="mb-4">
              <MdOutlineMarkUnreadChatAlt className="w-16 h-16 mx-auto text-gray-300" />
            </div>
            <p className="text-lg">Chọn một người dùng để bắt đầu trò chuyện</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Sub-components
const UserListItem = ({ user, isSelected, onClick }) => {
  const isOnline = user.isOnline;
  
  return (
    <div
      onClick={onClick}
      className={`p-4 cursor-pointer hover:bg-gray-50 ${
        isSelected ? 'bg-blue-50' : ''
      } border-b border-gray-100`}
    >
      <div className="flex items-center space-x-3">
        <div className="relative">
          <img
            src={user.avatar || '/default-avatar.png'}
            alt={user.username}
            className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
          />
          <span 
            className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${
              isOnline ? 'bg-green-500' : 'bg-gray-300'
            }`} 
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1">
              <span className="font-medium truncate">{user.username}</span>
              {user.verified && (
                <MdVerified className="h-4 w-4 text-blue-500" title="Đã xác minh" />
              )}
            </div>
            {user.vohieuhoa && (
              <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-600">
                Đã khóa
              </span>
            )}
          </div>
          
          <div className="text-sm text-gray-500 truncate">
            {user.email}
          </div>
          
          <div className="flex items-center space-x-2 mt-1">
            <span className={`text-xs ${
              isOnline ? 'text-green-500' : 'text-gray-500'
            }`}>
              {isOnline ? '● Đang hoạt động' : '○ Không hoạt động'}
            </span>
            {user.lastActive && !isOnline && (
              <span className="text-xs text-gray-400">
                {formatLastActive(user.lastActive)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Thêm hàm format thời gian
const formatLastActive = (lastActive) => {
  try {
    const lastActiveDate = new Date(lastActive);
    const now = new Date();
    const diffInMinutes = Math.floor((now - lastActiveDate) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Vừa mới truy cập';
    if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} giờ trước`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} ngày trước`;
    
    return lastActiveDate.toLocaleDateString('vi-VN');
  } catch (error) {
    console.error('Error formatting last active time:', error);
    return 'Không xác định';
  }
};

const ChatHeader = ({ user }) => {
  const onlineUsers = useOnlineStatus();
  const isOnline = onlineUsers.some(onlineUser => onlineUser._id === user._id);
  
  return (
    <div className="p-4 border-b bg-white shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <img
              src={user.avatar || '/default-avatar.png'}
              alt={user.username}
              className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
            />
            <span 
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                isOnline ? 'bg-green-500' : 'bg-gray-300'
              }`} 
            />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-900">{user.username}</span>
              {user.verified && (
                <MdVerified className="h-4 w-4 text-blue-500" />
              )}
            </div>
            <div className="text-sm text-gray-500 flex items-center space-x-1">
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span>{isOnline ? 'Đang hoạt động' : 'Không hoạt động'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {user.unreadCount > 0 && (
            <div className="flex items-center text-blue-500">
              <MdOutlineMarkUnreadChatAlt className="w-5 h-5" />
              <span className="ml-1 text-sm">{user.unreadCount}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ChatInput = ({ value, onChange, onSend }) => {
  const [showEmoji, setShowEmoji] = useState(false);
  const inputRef = useRef(null);

  return (
    <div className="p-4 border-t bg-white">
      <div className="flex items-center space-x-2">
        <button 
          className="p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
          onClick={() => setShowEmoji(!showEmoji)}
        >
          <BsEmojiSmile className="w-5 h-5" />
        </button>
        <button className="p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors">
          <IoImageOutline className="w-5 h-5" />
        </button>
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={onChange}
            placeholder="Nhập tin nhắn..."
            className="w-full px-4 py-2 border rounded-full focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            onKeyPress={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
          />
        </div>
        <button
          onClick={onSend}
          disabled={!value.trim()}
          className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-blue-500 transition-colors"
        >
          <IoSend className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default AdminChat;