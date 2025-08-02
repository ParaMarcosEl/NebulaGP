/** @type {import('next').NextConfig} */
const nextConfig = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  webpack(config: { module: { rules: { test: RegExp; loader: string; options: { filename: string; inline: string; }; }[]; }; resolve: { fallback: any; }; }, { isServer }: any) {
    if (!isServer) {
      config.module.rules.push({
        test: /\.worker\.js$/,
        loader: 'worker-loader',
        options: {
          filename: 'static/[hash].worker.js',
          inline: 'no-fallback', // always separate file
        },
      });

      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },

  // Add cross-origin isolation headers for SharedArrayBuffer support
  async headers() {
    return [
      {
        source: '/(.*)', // apply to all routes
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
        ],
      },
    ];
  },

  experimental: {
    esmExternals: true,
  },
};

export default nextConfig;
