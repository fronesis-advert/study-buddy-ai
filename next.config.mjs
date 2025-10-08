/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000"],
    },
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Ignore pdf-parse test files that cause bundling issues
      config.externals = config.externals || [];
      config.externals.push({
        'canvas': 'commonjs canvas',
      });
      
      // Add fallback for node modules
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },
};

export default nextConfig;
