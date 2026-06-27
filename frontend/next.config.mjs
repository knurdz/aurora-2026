/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    if (!process.env.API_PROXY_TARGET) return [];
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.API_PROXY_TARGET}/:path*`,
      },
    ];
  },
};

export default nextConfig;
