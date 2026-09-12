/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "bond001.com",
      },
      {
        protocol: "https",
        hostname: "odl.esut.edu.ng",
      },
      {
        protocol: "https",
        hostname: "run.online.qverselearning.org",
      },
      {
        protocol: "https",
        hostname: "run.api.qverselearning.org",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "github.com",
      },
    ],
  },
}

export default nextConfig
