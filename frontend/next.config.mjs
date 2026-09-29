/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  
  // Ensure public and static files are properly handled
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
