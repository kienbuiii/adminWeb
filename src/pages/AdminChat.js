import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAdminSocket, useOnlineStatus } from '../context/AdminSocketContext';
import { format, parseISO, isValid } from 'date-fns';
import { vi } from 'date-fns/locale';
import { MdSearch, MdVerified } from 'react-icons/md';
import axios from 'axios';
import apiConfig from '../apiconfig';
import debounce from 'lodash/debounce';
import { IoSend } from 'react-icons/io5';
import { MdOutlineMarkUnreadChatAlt } from 'react-icons/md';
import styles from '../styles/components/AdminChat.module.css';

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
  const isAdmin = true;
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
      // Chỉ sắp xếp theo trạng thái online
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;
      
      // Nếu cùng trạng thái online, sắp xếp theo thời gian hoạt động
      return new Date(b.lastActive) - new Date(a.lastActive);
    });

    return sortedUsers.map(user => (
      <UserListItem
        key={user._id}
        user={user}
        isSelected={selectedUser?._id === user._id}
        onClick={() => handleUserSelect(user)}
        isOnline={user.isOnline}
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
    }
  };

 return (
    <div className={styles.container}>
      {/* Sidebar */}
      <div className={styles.sidebar}>
        {/* Search Header */}
        <div className={styles.header}>
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Tìm kiếm người dùng..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <MdSearch className="absolute left-3 top-2.5 text-gray-400 h-5 w-5" />
          </div>
          
          {/* Online Stats */}
          <div className="mt-4">
            <div className="bg-blue-50 p-2 rounded-lg text-center">
              <div className="font-semibold text-blue-600">{onlineStats.totalOnline}</div>
              <div className="text-gray-600">Đang online</div>
            </div>
          </div>
        </div>

        {/* Users List */}
        <div className={styles.messageList}>
          {renderUsersList()}
        </div>
      </div>

      {/* Chat Area */}
      <div className={styles.chatArea}>
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className={styles.header}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <img
                      src={selectedUser.avatar || '/default-avatar.png'}
                      alt={selectedUser.username}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <span 
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                        onlineUsers.includes(selectedUser._id) ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    />
                  </div>
                  <div>
                    <div className="font-medium">{selectedUser.username}</div>
                    <span className="text-sm text-gray-500">
                      {onlineUsers.includes(selectedUser._id) ? 'Đang hoạt động' : 'Không hoạt động'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div 
              ref={messagesContainerRef}
              className={styles.messageList}
            >
              {messages.map(message => (
                <div 
                  key={message._id || message.tempId}
                  className={`${styles.messageContainer} ${
                    message.sender?.role === 'admin' ? styles.justifyEnd : styles.justifyStart
                  }`}
                >
                  <div className={`${styles.message} ${
                    message.sender?.role === 'admin' ? styles.adminMessage : styles.userMessage
                  }`}>
                    <div className={styles.messageContent}>
                      {message.content}
                    </div>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="text-gray-500 text-sm">Đang nhập tin nhắn...</div>
              )}
            </div>

            {/* Input Area */}
            <div className={styles.inputArea}>
              <div className={styles.inputContainer}>
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
                  placeholder="Nhập tin nhắn..."
                  className="flex-1 px-4 py-2 border rounded-full focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-blue-500 transition-colors"
                >
                  <IoSend className="h-5 w-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MdOutlineMarkUnreadChatAlt className="h-12 w-12 mx-auto text-gray-400" />
              <p className="mt-2">Chọn một người dùng để bắt đầu trò chuyện</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// UserListItem Component
const UserListItem = ({ user, isSelected, onClick, isOnline }) => {
  return (
    <div
      onClick={onClick}
      className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
        isSelected ? 'bg-blue-50' : ''
      }`}
    >
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
            <div className="flex items-center">
              <span className="font-medium text-gray-900">{user.username}</span>
            </div>
            <div className="text-sm text-gray-500 flex items-center space-x-1">
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span>{isOnline ? 'Đang hoạt động' : 'Không hoạt động'}</span>
            </div>
          </div>
        </div>
        {user.unreadCount > 0 && (
          <div className="flex items-center text-blue-500">
            <MdOutlineMarkUnreadChatAlt className="w-5 h-5" />
            <span className="ml-1 text-sm">{user.unreadCount}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminChat;