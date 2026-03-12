/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3001',
        pathname: '/uploads/**',
      },
    ],

    dangerouslyAllowLocalIP: true,
  },
}

// For .js files, you can use either:
export default nextConfig;  // ES Module syntax
// or
// module.exports = nextConfig;  // CommonJS syntax