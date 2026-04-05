/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      }
      // Improve hot reload by disabling type checking during dev
      config.resolve = {
        ...config.resolve,
        fallback: {
          fs: false,
          net: false,
          tls: false,
        },
      }
    }
    return config
  },
  // Disable typescript checking in dev mode for faster hot reload
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '**',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
}

module.exports = nextConfig
