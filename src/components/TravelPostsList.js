import React from 'react';

const TravelPostsList = ({ posts, loading }) => {
  if (loading) {
    return <div className="animate-pulse">Loading...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {posts.map((post) => (
        <div key={post._id} className="bg-white p-4 rounded-lg shadow">
          {post.image && (
            <img 
              src={post.image} 
              alt={post.title}
              className="w-full h-48 object-cover rounded-lg mb-4"
            />
          )}
          <h3 className="font-semibold">{post.title}</h3>
          <p className="text-gray-600 line-clamp-2">{post.content}</p>
          <div className="mt-2 text-sm text-gray-500">
            <span>{post.location}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TravelPostsList; 