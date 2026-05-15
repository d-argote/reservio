import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['nodemailer'],
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
