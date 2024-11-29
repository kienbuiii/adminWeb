module.exports = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://20.2.67.63/api/:path*'
      }
    ]
  }
} 