import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import apiConfig from '../apiconfig';

const AdminSocketContext = createContext();

export const useAdminSocket = () => {
  return useContext(AdminSocketContext);
};

export const useOnlineStatus = () => {
  const context = useContext(AdminSocketContext);
  if (!context) {
    throw new Error('useOnlineStatus must be used within an AdminSocketProvider');
  }
  return context.onlineUsers || [];
};

export const AdminSocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const connectSocket = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        const adminId = localStorage.getItem('adminId');

        if (!token || !adminId) {
          console.error('No admin token or ID found');
          return;
        }

        const newSocket = io(apiConfig.baseURL, {
          withCredentials: true,
          transports: ['websocket'],
          auth: {
            token: token,
            adminId: adminId
          }
        });

        // Basic socket events
        newSocket.on('connect', () => {
          console.log('Admin socket connected');
          setConnected(true);
          newSocket.emit('admin_connected', adminId);
        });

        // Enhanced online users handling
        newSocket.on('onlineUsers', (users) => {
          setOnlineUsers(users.map(user => ({
            ...user,
            isOnline: true
          })));
        });

        newSocket.on('user_status_changed', ({ userId, isOnline, username, avatar, lastActive }) => {
          setOnlineUsers(prev => {
            if (isOnline) {
              const exists = prev.some(u => u._id === userId);
              if (!exists) {
                return [...prev, { _id: userId, username, avatar, isOnline }];
              }
              return prev.map(u => u._id === userId ? { ...u, isOnline } : u);
            } else {
              return prev.map(u => u._id === userId ? { ...u, isOnline, lastActive } : u);
            }
          });
        });

        // Enhanced message handling
        newSocket.on('receive_message', (message) => {
          const formattedMessage = {
            ...message,
            sender: {
              ...message.sender,
              role: message.isAdminMessage ? 'admin' : 'user'
            }
          };
          
          newSocket.emit('new_message_received', formattedMessage);
        });

        newSocket.on('message_sent', (message) => {
          newSocket.emit('message_status_update', {
            status: 'sent',
            messageId: message._id,
            tempId: message.tempId,
            timestamp: new Date()
          });
        });

        newSocket.on('message_error', ({ error, tempId }) => {
          newSocket.emit('message_status_update', {
            status: 'error',
            tempId,
            error
          });
        });

        // Enhanced typing status handling
        newSocket.on('user_typing_status', ({ userId, isTyping }) => {
          newSocket.emit('typing_status_update', {
            userId,
            isTyping
          });
        });

        // Enhanced conversation updates
        newSocket.on('conversation_updated', (data) => {
          newSocket.emit('conversation_status_update', {
            ...data,
            timestamp: new Date()
          });
        });

        // Enhanced read status handling
        newSocket.on('messages_marked_read', ({ byUserId, forUserId }) => {
          newSocket.emit('messages_read_status_update', {
            byUserId,
            forUserId,
            timestamp: new Date()
          });
        });

        newSocket.on('messages_marked_read_success', ({ userId }) => {
          newSocket.emit('messages_read_confirmation', {
            userId,
            timestamp: new Date()
          });
        });

        setSocket(newSocket);

        return () => {
          if (newSocket) {
            newSocket.emit('admin_disconnect', adminId);
            newSocket.close();
          }
        };
      } catch (error) {
        console.error('Socket connection error:', error);
      }
    };

    connectSocket();
  }, []);

  // Enhanced message sending with proper error handling
  const sendAdminMessage = (messageData) => {
    if (!socket || !connected) {
      return Promise.reject(new Error('Socket not connected'));
    }
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        socket.off(`message_sent_${messageData.tempId}`);
        reject(new Error('Message sending timeout'));
      }, 30000); // Tăng timeout lên 30 giây

      // Lắng nghe event phản hồi cụ thể cho tin nhắn này
      socket.on(`message_sent_${messageData.tempId}`, (response) => {
        clearTimeout(timeout);
        socket.off(`message_sent_${messageData.tempId}`);
        if (response?.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });

      // Emit với callback
      socket.emit('admin_message', messageData, (ack) => {
        if (ack?.error) {
          clearTimeout(timeout);
          socket.off(`message_sent_${messageData.tempId}`);
          reject(new Error(ack.error));
        }
      });
    });
  };

  // Enhanced chat room joining
  const joinAdminChat = (userId) => {
    if (!socket || !connected) return;
    socket.emit('admin_join_chat', userId);
  };

  // Enhanced message read marking
  const markMessagesAsRead = (userId) => {
    if (!socket || !connected) return;
    
    const adminId = localStorage.getItem('adminId');
    socket.emit('admin_mark_read', {
      userId,
      adminId
    });
  };

  // Enhanced typing status
  const emitTyping = (userId, isTyping) => {
    if (!socket || !connected) return;
    socket.emit('admin_typing', { userId, isTyping });
  };

  // Thêm hàm xử lý gửi ảnh đơn
  const sendAdminImage = (imageData) => {
    if (!socket || !connected) {
      return Promise.reject(new Error('Socket not connected'));
    }
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        socket.off(`image_sent_${imageData.tempId}`);
        reject(new Error('Image sending timeout'));
      }, 60000); // Tăng timeout lên 60 giây cho upload ảnh

      // Lắng nghe event phản hồi cụ thể cho ảnh này
      socket.on(`image_sent_${imageData.tempId}`, (response) => {
        clearTimeout(timeout);
        socket.off(`image_sent_${imageData.tempId}`);
        if (response?.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });

      // Emit với callback
      socket.emit('admin_send_image', imageData, (ack) => {
        if (ack?.error) {
          clearTimeout(timeout);
          socket.off(`image_sent_${imageData.tempId}`);
          reject(new Error(ack.error));
        }
      });
    });
  };

  // Thêm hàm xử lý gửi nhiều ảnh
  const sendAdminMultipleImages = (imagesData) => {
    if (!socket || !connected) {
      return Promise.reject(new Error('Socket not connected'));
    }
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Images sending timeout'));
      }, 60000);

      socket.emit('admin_send_multiple_images', imagesData, (response) => {
        clearTimeout(timeout);
        if (response?.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  };

  const value = {
    socket,
    connected,
    onlineUsers,
    sendAdminMessage,
    sendAdminImage,
    sendAdminMultipleImages,
    joinAdminChat,
    markMessagesAsRead,
    emitTyping
  };

  return (
    <AdminSocketContext.Provider value={value}>
      {children}
    </AdminSocketContext.Provider>
  );
};

export default AdminSocketContext;