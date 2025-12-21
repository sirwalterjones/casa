/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // Enable standalone output for Docker/Cloud Run deployment
  output: 'standalone',

  images: {
    domains: [
      'localhost',
      'your-wordpress-domain.com',
      'storage.googleapis.com',
      '*.run.app'
    ],
    unoptimized: process.env.NODE_ENV === 'development',
  },
  env: {
    WORDPRESS_API_URL: process.env.WORDPRESS_API_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  },
  async rewrites() {
    return [
      {
        source: '/api/wp/:path*',
        destination: `${process.env.WORDPRESS_API_URL}/wp-json/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;