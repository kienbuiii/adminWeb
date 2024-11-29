import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import apiConfig from '../apiconfig';

const AdminSocketContext = createContext();

export const useAdminSocket = () => {
    const context = useContext(AdminSocketContext);
    if (!context) {
        throw new Error('useAdminSocket must be used within an AdminSocketProvider');
    }
    return context;
};

export const AdminSocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState(null);
    const [activeChats, setActiveChats] = useState([]);
    const [typing, setTyping] = useState({});

    const connectSocket = () => {
        const token = localStorage.getItem('token');
        const adminId = localStorage.getItem('adminId');

        if (!token || !adminId) {
            setError('Missing admin credentials');
            return null;
        }

        const socketOptions = {
            auth: {
                token: `Bearer ${token}`,
                adminId
            },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 3000,
            timeout: 20000
        };

        console.log('Connecting with options:', socketOptions);
        return io(apiConfig.socketURL, socketOptions);
    };

    useEffect(() => {
        let newSocket = connectSocket();
        if (!newSocket) return;

        newSocket.on('connect', () => {
            console.log('Admin socket connected with ID:', newSocket.id);
            setConnected(true);
            setError(null);

            // Emit adminConnected event with adminId
            const adminId = localStorage.getItem('adminId');
            newSocket.emit('adminConnected', adminId);
        });

        newSocket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
            setError('Lỗi kết nối socket: ' + error.message);
            setConnected(false);
        });

        newSocket.on('receiveMessage', (message) => {
            console.log('Received message:', message);
            // Callback sẽ được xử lý ở component AdminChat
        });

        newSocket.on('newMessage', ({ message }) => {
            console.log('New message received:', message);
            // Callback sẽ được xử lý ở component AdminChat
        });

        newSocket.on('adminStatusChanged', (status) => {
            console.log('Admin status changed:', status);
        });

        newSocket.on('messageError', (error) => {
            console.error('Message error:', error);
            setError(error.message);
        });

        newSocket.on('disconnect', (reason) => {
            console.log('Socket disconnected:', reason);
            setConnected(false);
        });

        setSocket(newSocket);

        return () => {
            if (newSocket) {
                console.log('Cleaning up socket connection');
                newSocket.disconnect();
            }
        };
    }, []);

    const adminMethods = {
        joinChat: (userId) => {
            if (socket && connected) {
                const adminId = localStorage.getItem('adminId');
                console.log('Joining chat:', { adminId, userId });
                socket.emit('adminJoinChat', { adminId, userId });
                setActiveChats(prev => [...prev, userId]);
            }
        },

        sendMessage: (messageData) => {
            if (socket && connected) {
                const adminId = localStorage.getItem('adminId');
                const { userId, text, type = 'text' } = messageData;
                
                console.log('Sending message:', {
                    adminId,
                    userId,
                    text,
                    type
                });

                socket.emit('adminSendMessage', {
                    adminId,
                    userId,
                    text,
                    type
                });
            }
        },

        startTyping: (userId) => {
            if (socket && connected) {
                const adminId = localStorage.getItem('adminId');
                socket.emit('adminTyping', { adminId, userId });
            }
        },

        stopTyping: (userId) => {
            if (socket && connected) {
                const adminId = localStorage.getItem('adminId');
                socket.emit('adminStopTyping', { adminId, userId });
            }
        },

        markRead: (userId) => {
            if (socket && connected) {
                const adminId = localStorage.getItem('adminId');
                socket.emit('adminMarkRead', { adminId, userId });
            }
        },

        leaveChat: (userId) => {
            if (socket && connected) {
                const adminId = localStorage.getItem('adminId');
                socket.emit('adminLeaveChat', { adminId, userId });
                setActiveChats(prev => prev.filter(id => id !== userId));
            }
        }
    };

    const contextValue = {
        socket,
        connected,
        error,
        activeChats,
        typing,
        ...adminMethods,
        isReady: () => socket && connected && !error
    };

    return (
        <AdminSocketContext.Provider value={contextValue}>
            {children}
        </AdminSocketContext.Provider>
    );
};

export default AdminSocketProvider;