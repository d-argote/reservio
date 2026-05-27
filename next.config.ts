// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'rjjegwjqjsrmcjmgghuz.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        // Para instancia local de Supabase
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '54321',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

export default nextConfig