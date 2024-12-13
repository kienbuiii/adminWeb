import React from 'react';

const MessageItem = ({ message, isAdmin }) => {
  const renderContent = () => {
    switch (message.type) {
      case 'image':
        return (
          <div className="image-message">
            <img src={message.content} alt="Sent" />
          </div>
        );
      default:
        return <div className="message-content">{message.content}</div>;
    }
  };

  return (
    <div className={`message ${isAdmin ? 'sent' : 'received'} ${message.type}`}>
      {renderContent()}
      <div className="message-meta">
        <span className="message-time">
          {new Date(message.createdAt).toLocaleTimeString()}
        </span>
        {message.read && isAdmin && <span className="read-status">✓</span>}
      </div>
    </div>
  );
};

export default MessageItem;