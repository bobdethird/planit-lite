import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Events",
  description: "Vote and schedule Planit events stored in memory.",
}

export default function EventsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
