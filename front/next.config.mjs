/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true, // Or your existing configurations
  output: 'standalone',
  experimental: {
    optimizePackageImports: ['@chakra-ui/react'],
  },
};

export default nextConfig;
