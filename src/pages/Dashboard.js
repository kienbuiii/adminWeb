import React, { useState, useEffect } from 'react';
import axios from 'axios';
import apiConfig from '../apiconfig';
import { FiUsers, FiFileText, FiUserPlus, FiMap, FiBarChart2, FiActivity } from 'react-icons/fi';

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
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="bg-red-50 p-4 rounded-lg max-w-lg w-full">
          <p className="text-red-500 text-center">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Tổng quan hệ thống</h1>
        </div>
        
        {/* Thống kê người dùng */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Người dùng</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatCard 
              title="Tổng người dùng" 
              value={stats?.users?.total || 0}
              icon={<FiUsers className="w-6 h-6" />}
              color="blue"
            />
            <StatCard 
              title="Người dùng mới (7 ngày)" 
              value={stats?.users?.new || 0}
              icon={<FiUserPlus className="w-6 h-6" />}
              color="green"
            />
          </div>
        </div>

        {/* Thống kê bài viết */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Bài viết</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard 
              title="Tổng bài viết" 
              value={stats?.posts?.total || 0}
              icon={<FiBarChart2 className="w-6 h-6" />}
              color="purple"
              subtitle={`Feeds: ${stats?.posts?.feeds?.total || 0} | Travel: ${stats?.posts?.travelPosts?.total || 0}`}
            />
            <StatCard 
              title="Bài Feed" 
              value={stats?.posts?.feeds?.total || 0}
              icon={<FiFileText className="w-6 h-6" />}
              color="orange"
              subtitle={`Mới: +${stats?.posts?.feeds?.new || 0} (7 ngày)`}
            />
            <StatCard 
              title="Bài Travel" 
              value={stats?.posts?.travelPosts?.total || 0}
              icon={<FiMap className="w-6 h-6" />}
              color="indigo"
              subtitle={`Mới: +${stats?.posts?.travelPosts?.new || 0} (7 ngày)`}
            />
          </div>
        </div>

        {/* Hoạt động mới */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Hoạt động mới (7 ngày qua)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard 
              title="Tổng bài viết mới" 
              value={stats?.posts?.new || 0}
              icon={<FiActivity className="w-6 h-6" />}
              color="teal"
              subtitle="Tổng Feed và Travel mới"
            />
          </div>
        </div>

        {stats?.lastUpdated && (
          <p className="text-sm text-gray-500 text-right mt-4">
            Cập nhật lần cuối: {new Date(stats.lastUpdated).toLocaleString('vi-VN')}
          </p>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, color, subtitle }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-500',
    green: 'bg-green-50 text-green-500',
    purple: 'bg-purple-50 text-purple-500',
    orange: 'bg-orange-50 text-orange-500',
    indigo: 'bg-indigo-50 text-indigo-500',
    teal: 'bg-teal-50 text-teal-500'
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-gray-600 text-sm font-medium">{title}</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {value.toLocaleString('vi-VN')}
          </p>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 