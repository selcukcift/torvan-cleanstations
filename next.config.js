/** @type {import('next').NextConfig} */
const nextConfig = {
  // Environment-specific configuration
  env: {
    // These will be available to both server and client side
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // Performance optimizations
  experimental: {
    // Enable optimized package imports for better bundle sizes
    optimizePackageImports: ['@radix-ui/react-icons', 'lucide-react'],
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },

  // Rewrites for hybrid architecture
  // NOTE: With the dual API client approach (plainNodeApiClient & nextJsApiClient),
  // most API calls are handled directly. These rewrites serve as fallbacks for
  // any server-side requests or edge cases that still need proxy functionality.
  async rewrites() {
    // Only include rewrites if they're actually needed for server-side requests
    // Since client-side code uses explicit API clients, these can be minimal
    return process.env.NODE_ENV === 'development' ? [
      // Development-only rewrites for debugging or fallback scenarios
      // These help during development if any server-side code accidentally
      // tries to call the Plain Node.js backend endpoints
      {
        source: '/api/auth/register',
        destination: 'http://localhost:3004/api/auth/register',
      },
    ] : [
      // Production rewrites (none needed due to explicit API client usage)
    ];
  },

  // TypeScript configuration
  typescript: {
    // Enable type checking during build
    ignoreBuildErrors: false,
  },

  // ESLint configuration
  eslint: {
    // Enable ESLint during build
    ignoreDuringBuilds: false,
  },

  // Image optimization
  images: {
    domains: ['localhost'],
    formats: ['image/webp', 'image/avif'],
  },

  // Output configuration for production
  output: 'standalone',
}

module.exports = nextConfig
