module.exports = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Prevent MongoDB from being bundled on the client side
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        dns: false,
      };
    }
    return config;
  },
};
