/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: process.env.NODE_ENV === 'development',
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.coffee-journal-app.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;