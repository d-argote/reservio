import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.ditechdev.com' }],
        destination: 'https://ditechdev.com/:path*',
        permanent: true,
      },
    ]
  },
};

export default nextConfig;
