import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const AdminLayout = () => {
  const location = useLocation();
  const isChatPage = location.pathname.includes('/admin/chat');

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 max-w-[calc(100vw-256px)]">
        <Header />
        <main className={`flex-1 overflow-x-hidden overflow-y-auto bg-gray-200 ${
          isChatPage ? 'p-0' : 'p-6'
        }`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;