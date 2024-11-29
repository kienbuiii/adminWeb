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
  // Thêm các cấu hình để tăng tính ổn định
  reactStrictMode: true,
  swcMinify: true,
  typescript: {
    ignoreBuildErrors: true
  },
  eslint: {
    ignoreDuringBuilds: true
  },
  poweredByHeader: false,
  generateEtags: false,
  compress: true
}

module.exports = nextConfig 