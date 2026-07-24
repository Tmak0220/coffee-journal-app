/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: process.env.NODE_ENV === 'development',
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pub-209f68c742e44b3cbaa204d8b155f525.r2.dev',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'real-coffee.net',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;