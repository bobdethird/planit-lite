import { Geist_Mono, Inter, Plus_Jakarta_Sans } from "next/font/google"
import type { Metadata } from "next"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils";

const plusJakarta = Plus_Jakarta_Sans({subsets:['latin'],variable:'--font-heading', weight:['400','500','600','700','800']});

const inter = Inter({subsets:['latin'],variable:'--font-sans'})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: {
    default: "VibeSync — Reel to event",
    template: "%s · VibeSync",
  },
  description:
    "Download a TikTok or Instagram reel, analyze the vibe with Gemini, plan an itinerary, and coordinate votes & calendar.",
  openGraph: {
    title: "VibeSync",
    description: "Reel → vibe analysis → itinerary → group vote → schedule.",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", inter.variable, plusJakarta.variable)}
    >
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
