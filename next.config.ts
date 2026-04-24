import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.reservio.ditechdev.com' }],
        destination: 'https://reservio.ditechdev.com/:path*',
        permanent: true, // 301
      },
    ]
  },
};

export default nextConfig;
