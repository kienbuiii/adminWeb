import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import apiConfig from '../apiconfig';
import { toast } from 'react-toastify';

const AdminReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
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
                    onClick={() => setSelectedReport(report)}
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

      {/* Report detail modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Chi tiết báo cáo</h2>
              
              <div className="space-y-6">
                {/* Người báo cáo */}
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Người báo cáo</h3>
                  <div className="flex items-center">
                    <img
                      src={selectedReport.reporter?.avatar || '/default-avatar.png'}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover"
                    />
                    <div className="ml-3">
                      <p className="text-sm font-medium">{selectedReport.reporter?.username}</p>
                      <p className="text-sm text-gray-500">{selectedReport.reporter?.email}</p>
                    </div>
                  </div>
                </div>

                {/* Người/Nội dung bị báo cáo */}
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Đối tượng bị báo cáo</h3>
                  <div className="flex items-center">
                    <img
                      src={selectedReport.reportedItem?.avatar || '/default-avatar.png'}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover"
                    />
                    <div className="ml-3">
                      <p className="text-sm font-medium">
                        {selectedReport.reportedItem?.username || selectedReport.reportedItem?.name}
                      </p>
                      {selectedReport.reportedItem?.title && (
                        <p className="text-sm text-gray-500">{selectedReport.reportedItem.title}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Loại báo cáo và lý do */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium text-gray-700 mb-2">Loại báo cáo</h3>
                    <p className="text-sm bg-gray-100 p-2 rounded">
                      {selectedReport.itemType}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-700 mb-2">Lý do</h3>
                    <p className="text-sm bg-gray-100 p-2 rounded">
                      {formatReason(selectedReport.reason)}
                    </p>
                  </div>
                </div>

                {/* Mô tả chi tiết */}
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Nội dung báo cáo</h3>
                  <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm">{selectedReport.description}</p>
                  </div>
                </div>

                {/* Trạng thái */}
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Trạng thái</h3>
                  <select
                    value={selectedReport.status}
                    onChange={(e) => handleStatusUpdate(selectedReport._id, e.target.value)}
                    className="mt-2 block w-full px-3 py-2 border rounded-lg"
                  >
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
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setSelectedReport(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Đóng
                </button>
                <button
                  onClick={() => handleDelete(selectedReport._id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Xóa báo cáo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReports;
