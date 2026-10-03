/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingIncludes: {
    '/api/**/*': ['./data/catalog/catalog.json'],
  },
};

export default nextConfig;
