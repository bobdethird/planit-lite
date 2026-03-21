/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    "youtube-dl-exec",
    "@elevenlabs/elevenlabs-js",
    "@ai-sdk/google",
  ],
}

export default nextConfig
