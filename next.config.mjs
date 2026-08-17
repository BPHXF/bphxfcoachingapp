/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Cloudflare Stream and YouTube thumbnails are served from these hosts.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.cloudflarestream.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
    ],
  },
};

export default nextConfig;
