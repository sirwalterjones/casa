/** @type {import('next').NextConfig} */

// WordPress API URL - use environment variable or default for build time
const WORDPRESS_API_URL = process.env.WORDPRESS_API_URL || process.env.NEXT_PUBLIC_WORDPRESS_URL || 'http://localhost:8000';

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
      'run.app'
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.run.app',
      },
      {
        protocol: 'https',
        hostname: '*.googleapis.com',
      },
    ],
    unoptimized: process.env.NODE_ENV === 'development',
  },

  // Environment variables exposed to the browser
  env: {
    WORDPRESS_API_URL: WORDPRESS_API_URL,
  },

  // Rewrites for proxying API requests
  async rewrites() {
    // Only add rewrites if we have a valid URL
    if (!WORDPRESS_API_URL || WORDPRESS_API_URL === 'undefined') {
      return [];
    }
    return [
      {
        source: '/api/wp/:path*',
        destination: `${WORDPRESS_API_URL}/wp-json/:path*`,
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
