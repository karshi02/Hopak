/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@hopak/shared'],
};

module.exports = nextConfig;
