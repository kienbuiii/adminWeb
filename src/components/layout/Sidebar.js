import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  MdDashboard, 
  MdPeople, 
  MdFlag, 
  MdChat,
  MdMenu 
} from 'react-icons/md';
import '../../styles/Sidebar.css';

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  
  const menuItems = [
    { path: '/admin/dashboard', icon: MdDashboard, label: 'Dashboard' },
    { path: '/admin/users', icon: MdPeople, label: 'Quản lý Users' },
    { path: '/admin/reports', icon: MdFlag, label: 'Báo cáo' },
    { path: '/admin/chat', icon: MdChat, label: 'Chat' },
  ];

  return (
    <>
      <div className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <MdMenu className="sidebar-logo-icon" />
          <span className="sidebar-logo-text">Admin Panel</span>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-link ${isActive ? 'nav-link-active' : ''}`}
                onClick={() => window.innerWidth < 1024 && onClose()}
              >
                <Icon className="nav-icon" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Mobile overlay */}
      {isOpen && window.innerWidth < 1024 && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        />
      )}
    </>
  );
};

export default Sidebar; 