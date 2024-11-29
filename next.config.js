/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://20.2.67.63/api/:path*'
      }
    ]
  },
  // Thêm các cấu hình khác nếu cần
  reactStrictMode: true,
  swcMinify: true
}

module.exports = nextConfig 