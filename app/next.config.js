/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/:industry(retail|manufacturing)",
        destination: "/?industry=:industry",
      },
      {
        source: "/:industry(retail|manufacturing)/:path*",
        destination: "/:path*?industry=:industry",
      },
    ];
  },
};

module.exports = nextConfig;
