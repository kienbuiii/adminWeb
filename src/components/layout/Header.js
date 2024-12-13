import React from 'react';
import '../../styles/Header.css';

const Header = ({ onMenuClick }) => {
  return (
    <header className="header">
      <div className="header-container">
        <div className="header-content">
          <div className="header-left">
            {/* Mobile menu button */}
            <button
              className="mobile-menu-button"
              onClick={onMenuClick}
              aria-label="Open menu"
            >
              <svg 
                className="mobile-menu-icon" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M4 6h16M4 12h16M4 18h16" 
                />
              </svg>
            </button>

            {/* Logo */}
            <div className="header-logo">
              Admin Panel
            </div>
          </div>

          <div className="header-right">
            {/* Add any additional header content here */}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header; 