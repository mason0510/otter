/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // 支持 Docker 部署
};

module.exports = nextConfig;
