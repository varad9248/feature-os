/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@feature-os/types', '@feature-os/config'],
  output: 'standalone',
};

module.exports = nextConfig;
