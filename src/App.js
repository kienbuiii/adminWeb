import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './components/layout/AdminLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import PrivateRoute from './components/PrivateRoute';
import UserDetail from './pages/UserDetail';
import AdminReports from './pages/adminReports';
import AdminChat from './pages/AdminChat';
import { AdminSocketProvider } from './context/AdminSocketContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Notifications from './pages/Notifications';
import Header from './components/layout/Header';
import ReportDetail from './pages/ReportDetail';


function App() {
  return (
    <Router>
      <AdminSocketProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/admin" element={
            <PrivateRoute>
              <AdminLayout />
            </PrivateRoute>
          }>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="users" element={<Users />} />
            <Route path="users/:id" element={<UserDetail />} />
            
            <Route path="chat/:userId" element={<AdminChat />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="reports/:id" element={<ReportDetail />} />
            <Route path="notifications" element={<Notifications />} />
          </Route>

          <Route path="/" element={<Navigate to="/admin" replace />} />
        </Routes>
      </AdminSocketProvider>
      <ToastContainer 
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </Router>
  );
}

export default App;