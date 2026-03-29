/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    "youtube-dl-exec",
    "@google/generative-ai",
  ],
}

export default nextConfig
