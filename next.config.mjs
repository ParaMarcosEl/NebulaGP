/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config) {
    // No need for worker-loader
    config.resolve.fallback = { ...config.resolve.fallback, fs: false };
    return config;
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
    ];
  },

  experimental: { esmExternals: true },
};

export default nextConfig;
