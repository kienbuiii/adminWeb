import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import apiConfig from '../apiconfig';
import { MdVerified, MdLocationOn, MdPhone, MdEmail, MdPerson, MdFavoriteBorder, MdComment, MdVisibility, MdDateRange, MdImage, MdShare, MdArticle, MdTravelExplore,MdClose ,MdFavorite } from 'react-icons/md';
import UserActionMenu from './UserActionMenu';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '../components/ui/alert-dialog';

const UserDetail = () => {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [activeTab, setActiveTab] = useState('posts');
  const [travelPosts, setTravelPosts] = useState([]);
  const [travelLoading, setTravelLoading] = useState(true);
  const [postsInitialized, setPostsInitialized] = useState(false);
  const [travelInitialized, setTravelInitialized] = useState(false);
  const [totalPostsCount, setTotalPostsCount] = useState(0);
  const [totalTravelPostsCount, setTotalTravelPostsCount] = useState(0);

  // Fetch regular posts
  const fetchRegularPosts = async (page) => {
    try {
      setPostsLoading(true);
      apiConfig.initializeToken(); // Ensure token is set
      
      const response = await axios.post(
        `${apiConfig.baseURL}${apiConfig.endpoints.userPosts(id)}`,
        { 
          page, 
          limit: 5,
          sortBy: 'createdAt',
          sortOrder: -1
        },
        { headers: apiConfig.headers }
      );

      if (response.data.success) {
        setPosts(response.data.data.posts);
        setPagination(response.data.data.pagination);
        setCurrentPage(page);
        setTotalPostsCount(response.data.data.pagination.totalPosts);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      if (error.response?.status === 401) {
        setError('Phiên đăng nhập đã hết hạn');
      } else {
        setError('Không thể tải bài viết');
      }
    } finally {
      setPostsLoading(false);
    }
  };

  // Fetch travel posts
  const fetchTravelPosts = async () => {
    try {
      setTravelLoading(true);
      apiConfig.initializeToken(); // Ensure token is set
      
      const response = await axios.post(
        `${apiConfig.baseURL}${apiConfig.endpoints.userTravelPosts(id)}`,
        {
          page: 1,
          limit: 10
        },
        { headers: apiConfig.headers }
      );

      if (response.data.success) {
        setTravelPosts(response.data.data.travelPosts);
        setTotalTravelPostsCount(response.data.data.travelPosts.length);
      }
    } catch (error) {
      console.error('Error fetching travel posts:', error);
      if (error.response?.status === 401) {
        setError('Phiên đăng nhập đã hết hạn');
      } else {
        setError('Không thể tải bài viết du lịch');
      }
    } finally {
      setTravelLoading(false);
    }
  };

  // Tách riêng useEffect cho việc fetch user detail
  useEffect(() => {
    const fetchUserDetail = async () => {
      try {
        setLoading(true);
        apiConfig.initializeToken();
        
        const response = await axios.post(
          `${apiConfig.baseURL}${apiConfig.endpoints.userDetail(id)}`,
          {},
          { headers: apiConfig.headers }
        );

        if (response.data.success) {
          setUser(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        setError('Không thể tải thông tin người dùng');
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetail();
  }, [id]);

  // Thay thế 2 useEffect riêng lẻ bằng một useEffect duy nhất
  useEffect(() => {
    const initializeData = async () => {
      await fetchRegularPosts(1);
      await fetchTravelPosts();
    };

    initializeData();
  }, [id]); // Chỉ chạy khi id thay đổi

  // Cập nhật TabSelector để không gọi lại API
  const TabSelector = () => (
    <div className="flex justify-center space-x-6 mb-8">
      <button
        onClick={() => setActiveTab('posts')}
        className={`group relative px-6 py-3 rounded-xl transition-all duration-300 ${
          activeTab === 'posts' 
            ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
            : 'hover:bg-gray-100'
        }`}
      >
        <div className="flex items-center space-x-3">
          <MdArticle size={22} />
          <span className="font-medium">Bài viết {posts.length > 0 && `(${posts.length})`}</span>
        </div>
        {activeTab === 'posts' && (
          <div className="absolute -bottom-1 left-1/2 w-12 h-1 bg-white rounded-full transform -translate-x-1/2"></div>
        )}
      </button>
      <button
        onClick={() => setActiveTab('travel')}
        className={`group relative px-6 py-3 rounded-xl transition-all duration-300 ${
          activeTab === 'travel' 
            ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
            : 'hover:bg-gray-100'
        }`}
      >
        <div className="flex items-center space-x-3">
          <MdTravelExplore size={22} />
          <span className="font-medium">Du lịch {travelPosts.length > 0 && `(${travelPosts.length})`}</span>
        </div>
        {activeTab === 'travel' && (
          <div className="absolute -bottom-1 left-1/2 w-12 h-1 bg-white rounded-full transform -translate-x-1/2"></div>
        )}
      </button>
    </div>
  );

  const TravelPostCard = ({ post, refreshData }) => {
    const handleDelete = async () => {
      try {
        apiConfig.initializeToken();
        const response = await axios.delete(
          `${apiConfig.baseURL}${apiConfig.endpoints.deleteTravelPost(post._id)}`,
          { headers: apiConfig.headers }
        );
  
        if (response.data.success) {
          refreshData(); // Làm mới dữ liệu sau khi xóa thành công
        }
      } catch (error) {
        console.error('Lỗi khi xóa bài travel:', error);
      }
    };
  
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-4 hover:shadow-lg transition-shadow duration-200 relative">
        {/* Nút xóa (dấu X) */}
        <button
          className="absolute top-2 right-2 text-red-500 hover:text-red-700"
          onClick={handleDelete}
        >
          <MdClose size={24} />
        </button>
  
        <div className="flex items-center mb-4">
          <img
            src={post.author?.avatar || '/default-avatar.png'}
            alt={post.author?.username || 'User'}
            className="w-10 h-10 rounded-full mr-3"
          />
          <div className="flex-1">
            <div className="flex items-center">
              <span className="font-medium">{post.author?.username || 'Unknown User'}</span>
              {post.author?.verified && (
                <MdVerified className="text-blue-500 ml-1" size={18} />
              )}
            </div>
            <div className="flex items-center text-sm text-gray-500">
              <MdDateRange className="mr-1" size={16} />
              {new Date(post.createdAt).toLocaleDateString('vi-VN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </div>
        </div>
  
        <h3 className="text-xl font-semibold mb-2">{post.title}</h3>
  
        {post.location && (
          <div className="flex items-center text-gray-600 mb-3 bg-blue-50 px-3 py-2 rounded-lg">
            <MdLocationOn className="h-5 w-5 mr-1 text-blue-500" />
            <span>{post.location}</span>
          </div>
        )}
  
        <div className="mb-4">
          <p className="text-gray-800 line-clamp-3">{post.content}</p>
        </div>
  
        {post.images && post.images.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            {post.images.slice(0, 4).map((image, index) => (
              <div key={index} className="relative group">
                <img
                  src={image}
                  alt={`Ảnh ${index + 1}`}
                  className="rounded-lg w-full h-48 object-cover cursor-pointer"
                />
              </div>
            ))}
          </div>
        )}
  
        {/* Hiển thị số lượng likes và comments */}
        <div className="flex items-center text-sm text-gray-500 pt-4 border-t">
          <div className="flex space-x-6">
            <div className="flex items-center">
              <MdFavorite className="w-5 h-5 mr-1" />
              <span>{post.likes?.length || 0}</span>
            </div>
            <div className="flex items-center">
              <MdComment className="w-5 h-5 mr-1" />
              <span>{post.comments?.length || 0}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const PostCard = ({ post }) => {
    const [open, setOpen] = React.useState(false);
  
    const handleDelete = async () => {
      try {
        apiConfig.initializeToken();
  
        const response = await axios.delete(
          `${apiConfig.baseURL}${apiConfig.endpoints.deletePost(post._id)}`,
          { headers: apiConfig.headers }
        );
  
        if (response.data.success) {
          refreshData();
        }
      } catch (error) {
        console.error('Lỗi khi xóa bài viết:', error);
      }
    };
  
    return (
      <div className="bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden relative">
        {/* Nút xóa ở góc trên bên phải */}
        <div className="absolute top-4 right-4 z-10">
          <AlertDialog>
            <AlertDialogTrigger>
              <button
                type="button"
                className="p-2 rounded-full bg-gray-100 hover:bg-red-500 hover:text-white transition-all duration-300 focus:outline-none"
              >
                <MdClose className="w-5 h-5" />
              </button>
            </AlertDialogTrigger>
  
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
                <AlertDialogDescription>
                  Bạn có chắc chắn muốn xóa bài viết này không?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setOpen(false)}>Hủy</AlertDialogCancel>
                <AlertDialogAction onClick={() => { handleDelete(); setOpen(false); }}>
                  Xóa
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
  
        <div className="p-6">
          {/* Header với avatar và username */}
          <div className="flex items-center space-x-4 mb-6">
            <div className="relative">
              <img
                src={post.user.avatar || '/default-avatar.png'}
                alt={post.user.username}
                className="w-12 h-12 rounded-full object-cover ring-2 ring-offset-2 ring-blue-500"
              />
              {post.user.verified && (
                <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1">
                  <MdVerified className="text-white" size={14} />
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center">
                <span className="font-medium">{post.user.username}</span>
                {post.user.verified && <MdVerified className="text-blue-500 ml-1" size={18} />}
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <MdDateRange className="mr-1" size={16} />
                {new Date(post.createdAt).toLocaleDateString('vi-VN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          </div>
  
          {/* Nội dung bài viết */}
          <p className="text-gray-800 text-lg leading-relaxed mb-6">{post.content}</p>
  
          {/* Ảnh trong bài viết */}
          {post.images?.length > 0 && (
            <div className="grid grid-cols-2 gap-3 mb-6">
              {post.images.map((image, index) => (
                <div key={index} className="relative group rounded-xl overflow-hidden">
                  <img
                    src={image}
                    alt={`Post image ${index + 1}`}
                    className="w-full h-64 object-cover transform transition-transform duration-300 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
              ))}
            </div>
          )}
  
          {/* Số lượt thích và bình luận */}
          <div className="flex items-center text-sm text-gray-500 pt-4 border-t">
            <div className="flex space-x-6">
              <div className="flex items-center">
                <MdFavorite className="w-5 h-5 mr-1" />
                <span>{post.likes?.length || 0}</span>
              </div>
              <div className="flex items-center">
                <MdComment className="w-5 h-5 mr-1" />
                <span>{post.comments?.length || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Component phân trang
  const Pagination = () => {
    if (!pagination || pagination.totalPages <= 1) return null;

    return (
      <div className="flex justify-center space-x-2 mt-6">
        <button
          onClick={() => fetchRegularPosts(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-4 py-2 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          Trước
        </button>
        
        {[...Array(pagination.totalPages)].map((_, index) => (
          <button
            key={index}
            onClick={() => fetchRegularPosts(index + 1)}
            className={`px-4 py-2 border rounded-md ${
              currentPage === index + 1
                ? 'bg-blue-500 text-white'
                : 'hover:bg-gray-50'
            }`}
          >
            {index + 1}
          </button>
        ))}

        <button
          onClick={() => fetchRegularPosts(currentPage + 1)}
          disabled={currentPage === pagination.totalPages}
          className="px-4 py-2 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          Sau
        </button>
      </div>
    );
  };

  // Thêm hàm refresh cho trường hợp cần tải lại dữ liệu
  const refreshData = () => {
    if (activeTab === 'posts') {
      fetchRegularPosts(currentPage);
    } else {
      fetchTravelPosts();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center p-4">
        {error}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center p-4">
        Không tìm thấy thông tin người dùng
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        {/* Header Profile */}
<div className="relative">
  {/* Cover photo với overlay gradient và blur effect */}
  <div className="h-64 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 relative overflow-hidden">
    <div className="absolute inset-0 backdrop-blur-sm bg-black/10"></div>
  </div>
  
  {/* User avatar với border gradient */}
  <div className="absolute -bottom-20 left-1/2 transform -translate-x-1/2 md:left-8 md:transform-none">
    <div className="p-1 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500">
      <img
        src={user.avatar}
        alt={user.username}
        className="h-36 w-36 rounded-full border-4 border-white object-cover"
      />
    </div>
  </div>
  
  {/* Action menu với glass effect */}
  <div className="absolute top-4 right-4">
    <UserActionMenu userId={user._id} username={user.username} />
  </div>
</div>

        {/* User Info */}
        <div className="pt-20 px-8 pb-8">
          {/* Basic Info */}
          <div className="flex items-center mb-4">
            <h1 className="text-2xl font-bold mr-2">{user.username}</h1>
            {user.xacMinhDanhTinh && (
              <MdVerified className="text-blue-500 h-6 w-6" title="Đã xác minh" />
            )}
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-3">
              <div className="flex items-center text-gray-600">
                <MdEmail className="h-5 w-5 mr-2" />
                <span>{user.email}</span>
              </div>
              {user.sdt && (
                <div className="flex items-center text-gray-600">
                  <MdPhone className="h-5 w-5 mr-2" />
                  <span>{user.sdt}</span>
                </div>
              )}
              {user.diachi && (
                <div className="flex items-center text-gray-600">
                  <MdLocationOn className="h-5 w-5 mr-2" />
                  <span>{user.diachi}</span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {user.sex && (
                <div className="text-gray-600">
                  <span className="font-medium">Giới tính:</span> {user.sex}
                </div>
              )}
              {user.tuoi && (
                <div className="text-gray-600">
                  <span className="font-medium">Tuổi:</span> {user.tuoi}
                </div>
              )}
              {user.tinhtranghonnhan && (
                <div className="text-gray-600">
                  <span className="font-medium">Tình trạng hôn nhân:</span> {user.tinhtranghonnhan}
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="backdrop-blur-md bg-white/30 border border-white/30 rounded-2xl p-6 shadow-xl hover:transform hover:scale-105 transition-all duration-300">
              <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {totalPostsCount}
              </div>
              <div className="text-gray-600 font-medium">Bài viết</div>
            </div>
            <div className="backdrop-blur-md bg-white/30 border border-white/30 rounded-2xl p-6 shadow-xl hover:transform hover:scale-105 transition-all duration-300">
              <div className="text-2xl font-bold bg-gradient-to-r from-green-600 to-lime-600 bg-clip-text text-transparent">
                {user.followersCount || 0}
              </div>
              <div className="text-gray-600 font-medium">Người theo dõi</div>
            </div>
            <div className="backdrop-blur-md bg-white/30 border border-white/30 rounded-2xl p-6 shadow-xl hover:transform hover:scale-105 transition-all duration-300">
              <div className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-red-600 bg-clip-text text-transparent">
                {user.followingCount || 0}
              </div>
              <div className="text-gray-600 font-medium">Đang theo dõi</div>
            </div>
          </div>

          {/* Bio */}
          {user.bio && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">Giới thiệu</h2>
              <p className="text-gray-600">{user.bio}</p>
            </div>
          )}

          {/* Additional Info */}
          {(user.nationality || user.home) && (
            <div className="border-t pt-6">
              <h2 className="text-lg font-semibold mb-4">Thông tin thêm</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {user.nationality && (
                  <div className="text-gray-600">
                    <span className="font-medium">Quốc tịch:</span> {user.nationality}
                  </div>
                )}
                {user.home && (
                  <div className="text-gray-600">
                    <span className="font-medium">Quê quán:</span> {user.home}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Phần hiển thị bài viết */}
      <div className="mt-8">
        <TabSelector />
        
        {activeTab === 'posts' ? (
          <div className="space-y-6">
            {postsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
            ) : posts.length > 0 ? (
              <>
                {posts.map(post => (
                  <PostCard key={post._id} post={post} />
                ))}
                <Pagination />
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Người dùng chưa có bài viết nào
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {travelLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
            ) : travelPosts.length > 0 ? (
              travelPosts.map(post => (
                <TravelPostCard key={post._id} post={post} refreshData={refreshData} />
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                Người dùng chưa có bài viết du lịch nào
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDetail; 