const configuredImageHosts = [
  'images.coffee-journal-app.com',
  // Existing user avatars were saved with the original R2 public domain.
  'pub-209f68c742e44b3cbaa204d8b155f525.r2.dev',
]

for (const publicUrl of [
  process.env.R2_PUBLIC_URL,
  process.env.NEXT_PUBLIC_R2_PUBLIC_URL,
]) {
  if (!publicUrl) continue

  try {
    configuredImageHosts.push(new URL(publicUrl).hostname)
  } catch {
    // Invalid environment values are handled by the upload endpoint.
  }
}

const imageHosts = [...new Set(configuredImageHosts)]

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: process.env.NODE_ENV === 'development',
    formats: ['image/avif', 'image/webp'],
    remotePatterns: imageHosts.map((hostname) => ({
      protocol: 'https',
      hostname,
      port: '',
      pathname: '/**',
    })),
  },
};

export default nextConfig;
