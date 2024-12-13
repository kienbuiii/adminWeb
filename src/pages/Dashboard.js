import React, { useState, useEffect } from 'react';
import axios from 'axios';
import apiConfig from '../apiconfig';
import { FiUsers, FiFileText, FiUserPlus, FiMap, FiBarChart2, FiActivity } from 'react-icons/fi';
import '../styles/Dashboard.css';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 300000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.post(
        `${apiConfig.baseURL}${apiConfig.endpoints.getStats()}`,
        {},
        { headers: apiConfig.headers }
      );

      if (response.data.success) {
        setStats(response.data.data);
        setError('');
      } else {
        setError(response.data.message || 'Không thể tải dữ liệu thống kê');
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      if (error.response?.status === 401) {
        setError('Phiên làm việc đã hết hạn, vui lòng đăng nhập lại');
      } else {
        setError('Không thể tải dữ liệu thống kê');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-content">
        <h1 className="dashboard-title">Tổng quan hệ thống</h1>
        
        {/* Thống kê người dùng */}
        <div>
          <h2 className="section-title">Người dùng</h2>
          <div className="stats-grid-2">
            <StatCard 
              title="Tổng người dùng" 
              value={stats?.users?.total || 0}
              icon={<FiUsers className="w-5 h-5 sm:w-6 sm:h-6" />}
              color="blue"
            />
            <StatCard 
              title="Người dùng mới (7 ngày)" 
              value={stats?.users?.new || 0}
              icon={<FiUserPlus className="w-5 h-5 sm:w-6 sm:h-6" />}
              color="green"
            />
          </div>
        </div>

        {/* Thống kê bài viết */}
        <div>
          <h2 className="section-title">Bài viết</h2>
          <div className="stats-grid-3">
            <StatCard 
              title="Tổng bài viết" 
              value={stats?.posts?.total || 0}
              icon={<FiBarChart2 className="w-5 h-5 sm:w-6 sm:h-6" />}
              color="purple"
              subtitle={`Feeds: ${stats?.posts?.feeds?.total || 0} | Travel: ${stats?.posts?.travelPosts?.total || 0}`}
            />
            <StatCard 
              title="Bài Feed" 
              value={stats?.posts?.feeds?.total || 0}
              icon={<FiFileText className="w-5 h-5 sm:w-6 sm:h-6" />}
              color="orange"
              subtitle={`Mới: +${stats?.posts?.feeds?.new || 0} (7 ngày)`}
            />
            <StatCard 
              title="Bài Travel" 
              value={stats?.posts?.travelPosts?.total || 0}
              icon={<FiMap className="w-5 h-5 sm:w-6 sm:h-6" />}
              color="indigo"
              subtitle={`Mới: +${stats?.posts?.travelPosts?.new || 0} (7 ngày)`}
            />
          </div>
        </div>

        {/* Hoạt động mới */}
        <div>
          <h2 className="section-title">Hoạt động mới (7 ngày qua)</h2>
          <div className="stats-grid-3">
            <StatCard 
              title="Tổng bài viết mới" 
              value={stats?.posts?.new || 0}
              icon={<FiActivity className="w-5 h-5 sm:w-6 sm:h-6" />}
              color="teal"
              subtitle="Tổng Feed và Travel mới"
            />
          </div>
        </div>

        {stats?.lastUpdated && (
          <p className="last-updated">
            Cập nhật lần cuối: {new Date(stats.lastUpdated).toLocaleString('vi-VN')}
          </p>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, color, subtitle }) => {
  return (
    <div className="stat-card">
      <div className="stat-card-content">
        <div className="stat-card-info">
          <h3 className="stat-card-title">{title}</h3>
          <p className="stat-card-value">
            {value.toLocaleString('vi-VN')}
          </p>
          {subtitle && (
            <p className="stat-card-subtitle">{subtitle}</p>
          )}
        </div>
        <div className={`icon-container color-${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 