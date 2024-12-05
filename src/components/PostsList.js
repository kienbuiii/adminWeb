import React from 'react';

const PostsList = ({ posts, loading, pagination, currentPage, onPageChange }) => {
  if (loading) {
    return <div className="animate-pulse">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <div key={post._id} className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold">{post.title}</h3>
          <p className="text-gray-600">{post.content}</p>
        </div>
      ))}
      
      {pagination && (
        <div className="flex justify-center space-x-2 mt-4">
          {Array.from({ length: pagination.totalPages }, (_, i) => (
            <button
              key={i + 1}
              onClick={() => onPageChange(i + 1)}
              className={`px-3 py-1 rounded ${
                currentPage === i + 1
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default PostsList; 