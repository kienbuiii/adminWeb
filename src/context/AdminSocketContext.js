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
        const token = localStorage.getItem('token');
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
          },
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });

        newSocket.on('connect', () => {
          console.log('Admin socket connected');
          setConnected(true);
          newSocket.emit('admin_connected', adminId);
        });

        newSocket.on('onlineUsers', (users) => {
          console.log('Received online users:', users);
          setOnlineUsers(users.map(user => user._id));
        });

        newSocket.on('user_status_changed', ({ userId, isOnline }) => {
          setOnlineUsers(prev => {
            if (isOnline) {
              return prev.includes(userId) ? prev : [...prev, userId];
            } else {
              return prev.filter(id => id !== userId);
            }
          });
        });

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

        newSocket.on('user_typing_status', ({ userId, isTyping }) => {
          newSocket.emit('typing_status_update', {
            userId,
            isTyping
          });
        });

        newSocket.on('conversation_updated', (data) => {
          newSocket.emit('conversation_status_update', {
            ...data,
            timestamp: new Date()
          });
        });

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

        newSocket.on('connect_error', (error) => {
          console.error('Connection error:', error);
          setConnected(false);
        });

        newSocket.on('disconnect', (reason) => {
          console.log('Socket disconnected:', reason);
          setConnected(false);
        });

        newSocket.on('reconnect', (attemptNumber) => {
          console.log('Socket reconnected after', attemptNumber, 'attempts');
          setConnected(true);
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
        setConnected(false);
      }
    };

    connectSocket();
  }, []);

  const sendAdminMessage = (messageData) => {
    if (!socket || !connected) {
      return Promise.reject(new Error('Socket not connected'));
    }
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        socket.off(`message_sent_${messageData.tempId}`);
        reject(new Error('Message sending timeout'));
      }, 30000);

      socket.on(`message_sent_${messageData.tempId}`, (response) => {
        clearTimeout(timeout);
        socket.off(`message_sent_${messageData.tempId}`);
        if (response?.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });

      socket.emit('admin_message', messageData, (ack) => {
        if (ack?.error) {
          clearTimeout(timeout);
          socket.off(`message_sent_${messageData.tempId}`);
          reject(new Error(ack.error));
        }
      });
    });
  };

  const joinAdminChat = (userId) => {
    if (!socket || !connected) return;
    socket.emit('admin_join_chat', userId);
  };

  const markMessagesAsRead = (userId) => {
    if (!socket || !connected) return;
    
    const adminId = localStorage.getItem('adminId');
    socket.emit('admin_mark_read', {
      userId,
      adminId
    });
  };

  const emitTyping = (userId, isTyping) => {
    if (!socket || !connected) return;
    socket.emit('admin_typing', { userId, isTyping });
  };

  const sendAdminImage = (imageData) => {
    if (!socket || !connected) {
      return Promise.reject(new Error('Socket not connected'));
    }
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        socket.off(`image_sent_${imageData.tempId}`);
        reject(new Error('Image sending timeout'));
      }, 60000);

      socket.on(`image_sent_${imageData.tempId}`, (response) => {
        clearTimeout(timeout);
        socket.off(`image_sent_${imageData.tempId}`);
        if (response?.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });

      socket.emit('admin_send_image', imageData, (ack) => {
        if (ack?.error) {
          clearTimeout(timeout);
          socket.off(`image_sent_${imageData.tempId}`);
          reject(new Error(ack.error));
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