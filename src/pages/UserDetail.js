import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import apiConfig from '../apiconfig';
import { MdVerified, MdLocationOn, MdPhone, MdEmail, MdPerson } from 'react-icons/md';
import UserActionMenu from './UserActionMenu';
const UserDetail = () => {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  // Fetch cả user info và posts khi component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch user info
        const userResponse = await axios.post(
          `${apiConfig.baseURL}${apiConfig.endpoints.userDetail(id)}`,
          {},
          { headers: apiConfig.headers }
        );
        setUser(userResponse.data.data);

        // Fetch posts
        await fetchUserPosts(1);
      } catch (error) {
        console.error('Error:', error);
        setError('Không thể tải thông tin');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const fetchUserPosts = async (page) => {
    try {
      setPostsLoading(true);
      console.log('Fetching posts for user:', id, 'page:', page); // Debug log

      const response = await axios.post(
        `${apiConfig.baseURL}${apiConfig.endpoints.userPosts(id)}`,
        { page, limit: 5 },
        { headers: apiConfig.headers }
      );

      console.log('Posts response:', response.data); // Debug log

      if (response.data.success) {
        setPosts(response.data.data.posts);
        setPagination(response.data.data.pagination);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      setError('Không thể tải bài viết');
    } finally {
      setPostsLoading(false);
    }
  };

  // Component hiển thị một bài viết
  const PostCard = ({ post }) => (
    <div className="bg-white rounded-lg shadow-md p-6 mb-4">
      <div className="flex items-center mb-4">
        <img
          src={post.user.avatar}
          alt={post.user.username}
          className="w-10 h-10 rounded-full mr-3"
        />
        <div>
          <div className="font-medium">{post.user.username}</div>
          <div className="text-sm text-gray-500">
            {new Date(post.createdAt).toLocaleDateString('vi-VN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-gray-800 whitespace-pre-wrap">{post.content}</p>
      </div>

      {post.images && post.images.length > 0 && (
        <div className={`grid ${post.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-2 mb-4`}>
          {post.images.map((image, index) => (
            <img
              key={index}
              src={image}
              alt={`Ảnh ${index + 1}`}
              className="rounded-lg w-full h-64 object-cover"
              onClick={() => window.open(image, '_blank')}
            />
          ))}
        </div>
      )}

      <div className="flex items-center text-sm text-gray-500 space-x-6">
        <div className="flex items-center">
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <span>{post.likes?.length || 0} lượt thích</span>
        </div>
        <div className="flex items-center">
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span>{post.comments?.length || 0} bình luận</span>
        </div>
      </div>
    </div>
  );

  // Component phân trang
  const Pagination = () => {
    if (!pagination || pagination.totalPages <= 1) return null;

    return (
      <div className="flex justify-center space-x-2 mt-6">
        <button
          onClick={() => fetchUserPosts(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-4 py-2 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          Trước
        </button>
        
        {[...Array(pagination.totalPages)].map((_, index) => (
          <button
            key={index}
            onClick={() => fetchUserPosts(index + 1)}
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
          onClick={() => fetchUserPosts(currentPage + 1)}
          disabled={currentPage === pagination.totalPages}
          className="px-4 py-2 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          Sau
        </button>
      </div>
    );
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
    <div className="h-full">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          {/* Header Profile */}
<div className="relative">
  <div className="h-48 bg-gradient-to-r from-blue-500 to-purple-500"></div>
  <UserActionMenu userId={user._id} username={user.username} />
  <div className="absolute -bottom-16 left-8">
    <img
      src={user.avatar}
      alt={user.username}
      className="h-32 w-32 rounded-full border-4 border-white shadow-lg object-cover"
    />
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
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-xl font-bold">{user.postsCount || 0}</div>
                <div className="text-gray-500">Bài viết</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-xl font-bold">{user.followersCount || 0}</div>
                <div className="text-gray-500">Người theo dõi</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-xl font-bold">{user.followingCount || 0}</div>
                <div className="text-gray-500">Đang theo dõi</div>
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
          <h2 className="text-2xl font-bold mb-6">Bài viết của người dùng</h2>
          
          {postsLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            </div>
          ) : posts.length > 0 ? (
            <>
              <div className="space-y-6">
                {posts.map(post => (
                  <PostCard key={post._id} post={post} />
                ))}
              </div>
              <Pagination />
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Người dùng chưa có bài viết nào
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserDetail; 