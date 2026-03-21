import type { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000"

  const now = new Date()

  return [
    { url: base, lastModified: now, changeFrequency: "weekly", priority: 1 },
    {
      url: `${base}/events`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
  ]
}
