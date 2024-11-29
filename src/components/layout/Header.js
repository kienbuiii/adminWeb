import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MdNotifications, MdAccountCircle, MdLogout } from 'react-icons/md';
import apiConfig from '../../apiconfig';

const Header = () => {
  const navigate = useNavigate();
  
  const handleLogout = () => {
    apiConfig.clearToken();
    navigate('/login');
  };

  return (
    <header className="bg-white shadow-sm h-16 flex-shrink-0">
      <div className="h-full px-6">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-800">Admin Dashboard</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <button className="p-1.5 rounded-full text-gray-400 hover:text-gray-500 hover:bg-gray-100">
              <MdNotifications className="h-6 w-6" />
            </button>

            <div className="flex items-center space-x-3">
              <MdAccountCircle className="h-8 w-8 text-gray-400" />
              <button
                onClick={handleLogout}
                className="text-sm font-medium text-gray-500 hover:text-gray-700"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header; 