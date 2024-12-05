import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import apiConfig from '../apiconfig';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const AdminReports = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
  });

  // Fetch reports with POST method
  const fetchReports = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        toast.error('Vui lòng đăng nhập lại');
        return;
      }

      const response = await axios.post(
        `${apiConfig.baseURL}${apiConfig.endpoints.reports.adminAll}`,
        {},
        { 
          headers: {
            ...apiConfig.headers,
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        setReports(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
      if (error.response?.status === 401) {
        toast.error('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
        localStorage.removeItem('token');
      } else {
        toast.error('Không thể tải danh sách báo cáo');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle status update with token
  const handleStatusUpdate = async (reportId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        toast.error('Vui lòng đăng nhập lại');
        return;
      }

      const response = await axios.post(
        `${apiConfig.baseURL}${apiConfig.endpoints.reports.adminUpdate(reportId)}`,
        { status: newStatus },
        { 
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        setReports(prev => 
          prev.map(report => 
            report._id === reportId 
              ? { ...report, status: newStatus }
              : report
          )
        );
        toast.success('Đã cập nhật trạng thái báo cáo');
      }
    } catch (error) {
      console.error('Error updating report status:', error);
      if (error.response?.status === 401) {
        toast.error('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
        localStorage.removeItem('token');
      } else {
        toast.error('Không thể cập nhật trạng thái báo cáo');
      }
    }
  };

  // Delete report with token
  const handleDelete = async (reportId) => {
    if (!window.confirm('Bạn có chắc muốn xóa báo cáo này?')) return;

    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        toast.error('Vui lòng đăng nhập lại');
        return;
      }

      const response = await axios.delete(
        `${apiConfig.baseURL}${apiConfig.endpoints.reports.adminDelete(reportId)}`,
        { 
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        setReports(prev => prev.filter(report => report._id !== reportId));
        toast.success('Đã xóa báo cáo');
      }
    } catch (error) {
      console.error('Error deleting report:', error);
      if (error.response?.status === 401) {
        toast.error('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
        localStorage.removeItem('token');
      } else {
        toast.error('Không thể xóa báo cáo');
      }
    }
  };

  // Format reason for display
  const formatReason = (reason) => {
    const reasonMap = {
      spam: 'Spam',
      harassment: 'Quấy rối',
      inappropriate_content: 'Nội dung không phù hợp',
      violence: 'Bạo lực',
      hate_speech: 'Phát ngôn thù địch',
      false_information: 'Thông tin sai lệch',
      other: 'Khác'
    };
    return reasonMap[reason] || reason;
  };

  // Status badge component
  const StatusBadge = ({ status }) => {
    const statusStyles = {
      pending: 'bg-yellow-100 text-yellow-800',
      reviewing: 'bg-blue-100 text-blue-800',
      resolved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };

    const statusText = {
      pending: 'Chờ xử lý',
      reviewing: 'Đang xem xét',
      resolved: 'Đã xử lý',
      rejected: 'Từ chối'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[status]}`}>
        {statusText[status]}
      </span>
    );
  };

  // Initial load
  useEffect(() => {
    fetchReports();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Quản lý Báo cáo</h1>
      
      {/* Filters */}
      <div className="mb-6">
        <select
          value={filters.status}
          onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
          className="px-3 py-2 border rounded-lg"
        >
          <option value="">Tất cả trạng thái</option>
          {Object.values(apiConfig.reportStatus).map(status => (
            <option key={status} value={status}>
              {status === 'pending' && 'Chờ xử lý'}
              {status === 'reviewing' && 'Đang xem xét'}
              {status === 'resolved' && 'Đã xử lý'}
              {status === 'rejected' && 'Từ chối'}
            </option>
          ))}
        </select>
      </div>

      {/* Reports table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Người báo cáo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Loại
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lý do
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Trạng thái
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ngày tạo
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {reports.map(report => (
              <tr key={report._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <img
                      className="h-8 w-8 rounded-full"
                      src={report.reporter?.avatar || '/default-avatar.png'}
                      alt=""
                    />
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {report.reporter?.username}
                      </div>
                      <div className="text-sm text-gray-500">
                        {report.reporter?.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-900">
                    {report.itemType}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-900">
                    {formatReason(report.reason)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={report.status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {format(new Date(report.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => navigate(`/admin/reports/${report._id}`)}
                    className="text-indigo-600 hover:text-indigo-900 mr-4"
                  >
                    Chi tiết
                  </button>
                  <button
                    onClick={() => handleDelete(report._id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminReports;
