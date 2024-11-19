module.exports = {
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer }) => {
    // Exclude fs module from being bundled
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        dgram: false,
      };
    }

    return config;
  },
};
