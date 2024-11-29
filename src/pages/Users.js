import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import apiConfig from '../apiconfig';
import { MdVerified, MdInfo, MdSearch, MdFilterList, MdBlock, MdPeople, MdCheckCircle } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import debounce from 'lodash/debounce';
import StatCard from '../components/StatCard';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    role: '',
    vohieuhoa: '',
    verified: '',
    gender: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();

  // Fetch tất cả users khi component mount
  const fetchAllUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.post(
        `${apiConfig.baseURL}${apiConfig.endpoints.users()}`,
        {},
        { headers: apiConfig.headers }
      );

      if (response.data.success) {
        setUsers(response.data.data || []);
        setError('');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Không thể tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  };

  // Tìm kiếm users
  const searchUsers = async (searchValue, currentFilters) => {
    if (!searchValue.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    try {
      setSearching(true);
      const response = await axios.post(
        `${apiConfig.baseURL}${apiConfig.endpoints.searchUsers()}`,
        {
          searchTerm: searchValue,
          filters: currentFilters
        },
        { headers: apiConfig.headers }
      );

      if (response.data.success) {
        setSearchResults(response.data.data.users);
      }
    } catch (error) {
      console.error('Search error:', error);
      setError('Lỗi khi tìm kiếm người dùng');
    } finally {
      setSearching(false);
    }
  };

  const debouncedSearch = useCallback(
    debounce((searchValue, filters) => {
      searchUsers(searchValue, filters);
    }, 500),
    []
  );

  useEffect(() => {
    fetchAllUsers();
  }, []);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (value.trim()) {
      debouncedSearch(value, {});
    } else {
      setSearchResults([]);
    }
  };

  // Hiển thị danh sách người dùng dựa trên trạng thái tìm kiếm
  const displayUsers = searchTerm ? searchResults : users;

  // Thêm hàm xử lý filter
  const handleFilterChange = (filterName, value) => {
    const newFilters = { ...filters, [filterName]: value };
    setFilters(newFilters);
    if (searchTerm) {
      debouncedSearch(searchTerm, newFilters);
    }
  };

  // Thêm hàm reset filters
  const resetFilters = () => {
    setFilters({
      status: '',
      role: '',
      vohieuhoa: '',
      verified: '',
      gender: ''
    });
    if (searchTerm) {
      debouncedSearch(searchTerm, {});
    }
  };

  const renderUsersList = () => {
    if (loading) {
      return (
        <tr>
          <td colSpan="5" className="px-6 py-4 text-center">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
            </div>
          </td>
        </tr>
      );
    }

    if (error) {
      return (
        <tr>
          <td colSpan="5" className="px-6 py-4 text-center text-red-500">
            {error}
          </td>
        </tr>
      );
    }

    if (!displayUsers.length) {
      return (
        <tr>
          <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
            {searchTerm ? 'Không tìm thấy người dùng phù hợp' : 'Không có người dùng nào'}
          </td>
        </tr>
      );
    }

    return displayUsers.map((user) => (
      <tr key={user._id} className="hover:bg-gray-50">
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center">
            <div className="flex-shrink-0 h-10 w-10">
              <img 
                className="h-10 w-10 rounded-full object-cover"
                src={user.avatar} 
                alt={user.username}
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/40';
                }}
              />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-900">
                {user.username}
              </div>
              <div className="text-sm text-gray-500">
                {user.email}
              </div>
            </div>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            user.xacMinhDanhTinh 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {user.xacMinhDanhTinh ? (
              <>
                <MdVerified className="mr-1" />
                Đã xác minh
              </>
            ) : (
              'Chưa xác minh'
            )}
          </span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            user.role === 'admin' 
              ? 'bg-purple-100 text-purple-800' 
              : 'bg-blue-100 text-blue-800'
          }`}>
            {user.role === 'admin' ? 'Quản trị viên' : 'Người dùng'}
          </span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            user.vohieuhoa 
              ? 'bg-red-100 text-red-800'  // Disabled
              : 'bg-green-100 text-green-800' // Active
          }`}>
            {user.vohieuhoa ? 'Đã vô hiệu hóa' : 'Hoạt động'}
          </span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
          <button
            onClick={() => navigate(`/admin/users/${user._id}`)}
            className="text-indigo-600 hover:text-indigo-900 inline-flex items-center"
          >
            <MdInfo className="h-5 w-5 mr-1" />
            Chi tiết
          </button>
        </td>
      </tr>
    ));
  };

  return (
    <div className="h-full">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Quản lý người dùng</h1>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-600 bg-white rounded-lg hover:bg-gray-50"
          >
            <MdFilterList className="w-5 h-5 mr-2" />
            {showFilters ? 'Ẩn bộ lọc' : 'Hiện bộ lọc'}
          </button>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          {/* Search bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Tìm kiếm theo tên, email, số điện thoại..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={handleInputChange}
            />
            {searching ? (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
              </div>
            ) : (
              <MdSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xl" />
            )}
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <select
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <option value="">Trạng thái</option>
                  <option value="active">Hoạt động</option>
                  <option value="inactive">Không hoạt động</option>
                  <option value="banned">Đã cấm</option>
                </select>

                <select
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={filters.role}
                  onChange={(e) => handleFilterChange('role', e.target.value)}
                >
                  <option value="">Vai trò</option>
                  <option value="user">Người dùng</option>
                  <option value="admin">Quản trị viên</option>
                </select>

                <select
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={filters.verified}
                  onChange={(e) => handleFilterChange('verified', e.target.value)}
                >
                  <option value="">Xác minh</option>
                  <option value="true">Đã xác minh</option>
                  <option value="false">Chưa xác minh</option>
                </select>

                <select
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={filters.vohieuhoa}
                  onChange={(e) => handleFilterChange('vohieuhoa', e.target.value)}
                >
                  <option value="">Trạng thái tài khoản</option>
                  <option value="true">Đã vô hiệu hóa</option>
                  <option value="false">Đang hoạt động</option>
                </select>

                <select
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={filters.gender}
                  onChange={(e) => handleFilterChange('gender', e.target.value)}
                >
                  <option value="">Giới tính</option>
                  <option value="male">Nam</option>
                  <option value="female">Nữ</option>
                  <option value="other">Khác</option>
                </select>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={resetFilters}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  Đặt lại bộ lọc
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Users table */}
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Người dùng
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Xác minh danh tính
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vai trò
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {renderUsersList()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Users;
