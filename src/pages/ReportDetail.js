import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import apiConfig from '../apiconfig';
import { toast } from 'react-toastify';

const ReportDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [reporter, setReporter] = useState(null);
  const [reportedItem, setReportedItem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReportDetails = async () => {
      try {
        apiConfig.initializeToken();
        const token = localStorage.getItem('token');
        
        if (!token) {
          toast.error('Vui lòng đăng nhập lại');
          navigate('/login');
          return;
        }

        const headers = {
          ...apiConfig.headers,
          'Authorization': `Bearer ${token}`
        };

        // Fetch report detail
        const reportResponse = await axios.post(
          `${apiConfig.baseURL}${apiConfig.endpoints.reports.adminDetail(id)}`,
          {},
          { headers }
        );

        if (reportResponse.data.success) {
          const reportData = reportResponse.data.data;
          setReport(reportData);

          // Fetch reporter details
          try {
            const reporterResponse = await axios.post(
              `${apiConfig.baseURL}${apiConfig.endpoints.userDetail(reportData.reporter)}`,
              {},
              { headers }
            );
            
            if (reporterResponse.data.success) {
              setReporter(reporterResponse.data.data);
            }
          } catch (error) {
            console.error('Error fetching reporter details:', error);
          }

          // Fetch reported item details based on type
          try {
            if (reportData.itemType === 'User') {
              const reportedItemResponse = await axios.post(
                `${apiConfig.baseURL}${apiConfig.endpoints.userDetail(reportData.reportedItem)}`,
                {},
                { headers }
              );
              
              if (reportedItemResponse.data.success) {
                setReportedItem({
                  ...reportedItemResponse.data.data,
                  type: 'User'
                });
              }
            } else if (reportData.itemType === 'Post') {
              const reportedItemResponse = await axios.post(
                `${apiConfig.baseURL}${apiConfig.endpoints.postDetail(reportData.reportedItem)}`,
                {},
                { headers }
              );
              
              if (reportedItemResponse.data.success) {
                setReportedItem({
                  ...reportedItemResponse.data.data,
                  type: 'Post'
                });
              }
            }
          } catch (error) {
            console.error('Error fetching reported item details:', error);
            toast.error('Không thể tải thông tin đối tượng bị báo cáo');
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Không thể tải thông tin báo cáo');
      } finally {
        setLoading(false);
      }
    };

    fetchReportDetails();
  }, [id, navigate]);

  // Handle status update
  const handleStatusUpdate = async (newStatus) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Vui lòng đăng nhập lại');
        return;
      }

      const response = await axios.post(
        `${apiConfig.baseURL}${apiConfig.endpoints.reports.adminUpdate(id)}`,
        { status: newStatus },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        setReport(prev => ({ ...prev, status: newStatus }));
        toast.success('Đã cập nhật trạng thái báo cáo');
      }
    } catch (error) {
      console.error('Error updating report status:', error);
      toast.error('Không thể cập nhật trạng thái báo cáo');
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!window.confirm('Bạn có chắc muốn xóa báo cáo này?')) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Vui lòng đăng nhập lại');
        return;
      }

      const response = await axios.delete(
        `${apiConfig.baseURL}${apiConfig.endpoints.reports.adminDelete(id)}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        toast.success('Đã xóa báo cáo');
        navigate('/admin/reports');
      }
    } catch (error) {
      console.error('Error deleting report:', error);
      toast.error('Không thể xóa báo cáo');
    }
  };

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

  const renderReportedItem = () => {
    if (!reportedItem) return null;

    if (reportedItem.type === 'User') {
      return (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center space-x-4">
            <img
              src={reportedItem.avatar || '/default-avatar.png'}
              alt=""
              className="h-16 w-16 rounded-full object-cover border-2 border-gray-200"
            />
            <div>
              <h4 className="text-lg font-semibold">{reportedItem.username || 'Không có thông tin'}</h4>
              <p className="text-gray-600">{reportedItem.email || 'Không có thông tin'}</p>
              <div className="mt-2 flex space-x-2">
                <span className="px-2 py-1 bg-gray-100 rounded-full text-sm">
                  {reportedItem.status === 'active' ? 'Đang hoạt động' : 'Đã khóa'}
                </span>
                <span className="px-2 py-1 bg-gray-100 rounded-full text-sm">
                  Tham gia: {new Date(reportedItem.createdAt).toLocaleDateString('vi-VN')}
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (reportedItem.type === 'Post') {
      return (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Header của bài viết */}
          <div className="p-4 border-b">
            <div className="flex items-center space-x-3">
              <img
                src={reportedItem.user?.avatar || '/default-avatar.png'}
                alt=""
                className="h-10 w-10 rounded-full object-cover"
              />
              <div>
                <p className="font-semibold">{reportedItem.user?.username || 'Không có thông tin'}</p>
                <p className="text-xs text-gray-500">
                  {format(new Date(reportedItem.createdAt), 'HH:mm - dd/MM/yyyy', { locale: vi })}
                </p>
              </div>
            </div>
          </div>

          {/* Nội dung bài viết */}
          <div className="p-4 space-y-3">
            {reportedItem.title && (
              <h3 className="text-lg font-semibold">{reportedItem.title}</h3>
            )}
            
            {reportedItem.content && (
              <p className="text-gray-700 whitespace-pre-wrap">{reportedItem.content}</p>
            )}

            {/* Hiển thị hình ảnh */}
            {reportedItem.images && reportedItem.images.length > 0 && (
              <div className="mt-4">
                {reportedItem.images.length === 1 ? (
                  <img
                    src={reportedItem.images[0]}
                    alt="Post content"
                    className="w-full h-auto rounded-lg max-h-96 object-cover"
                  />
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {reportedItem.images.map((image, index) => (
                      <div key={index} className="relative aspect-square">
                        <img
                          src={image}
                          alt={`Post image ${index + 1}`}
                          className="absolute inset-0 w-full h-full object-cover rounded-lg"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Thông tin thêm */}
            <div className="mt-4 flex flex-wrap gap-2">
              {reportedItem.category && (
                <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm">
                  {reportedItem.category}
                </span>
              )}
              <span className="px-3 py-1 bg-gray-50 text-gray-600 rounded-full text-sm">
                {reportedItem.likes?.length || 0} lượt thích
              </span>
              <span className="px-3 py-1 bg-gray-50 text-gray-600 rounded-full text-sm">
                {reportedItem.comments?.length || 0} bình luận
              </span>
            </div>
          </div>
        </div>
      );
    }

    return <p className="text-sm text-gray-500">Không có thông tin</p>;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="bg-gray-50 rounded-lg shadow-lg p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Chi tiết báo cáo</h1>
            {report?.createdAt && (
              <p className="text-sm text-gray-500 mt-1">
                Được báo cáo vào {format(new Date(report.createdAt), 'HH:mm - dd/MM/yyyy', { locale: vi })}
              </p>
            )}
          </div>
          <button
            onClick={() => navigate('/admin/reports')}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center space-x-2"
          >
            <span>←</span>
            <span>Quay lại</span>
          </button>
        </div>

        {report && (
          <div className="space-y-6">
            {/* Người báo cáo */}
            <div className="bg-white rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-4">Người báo cáo</h3>
              <div className="flex items-center space-x-4">
                <img
                  src={reporter?.avatar || '/default-avatar.png'}
                  alt=""
                  className="h-12 w-12 rounded-full object-cover border-2 border-gray-200"
                />
                <div>
                  <p className="font-medium">{reporter?.username || 'Không có thông tin'}</p>
                  <p className="text-sm text-gray-500">{reporter?.email || 'Không có thông tin'}</p>
                </div>
              </div>
            </div>

            {/* Đối tượng bị báo cáo */}
            <div>
              <h3 className="font-medium text-gray-900 mb-4">Đối tượng bị báo cáo</h3>
              {renderReportedItem()}
            </div>

            {/* Thông tin báo cáo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Loại báo cáo</h3>
                <p className="text-sm bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full inline-block">
                  {report?.itemType || 'Không có thông tin'}
                </p>
              </div>
              <div className="bg-white rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Lý do</h3>
                <p className="text-sm bg-red-50 text-red-600 px-3 py-1.5 rounded-full inline-block">
                  {formatReason(report?.reason) || 'Không có thông tin'}
                </p>
              </div>
            </div>

            {/* Mô tả chi tiết */}
            <div className="bg-white rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">Nội dung báo cáo</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                {report?.description || 'Không có thông tin'}
              </p>
            </div>

            {/* Trạng thái */}
            <div className="bg-white rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">Trạng thái xử lý</h3>
              <select
                value={report?.status}
                onChange={(e) => handleStatusUpdate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
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

            {/* Actions */}
            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Xóa báo cáo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportDetail; 