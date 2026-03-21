import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft } from "lucide-react"
import { listEvents } from "@/lib/store"

export const dynamic = "force-dynamic"

export default function EventsPage() {
  const events = listEvents()

  return (
    <div className="mx-auto flex min-h-svh max-w-2xl flex-col gap-6 p-6 md:p-10">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/" aria-label="Home">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Events</h1>
          <p className="text-sm text-muted-foreground">
            Planit events (in-memory). Vote and schedule from each detail page.
          </p>
        </div>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No events yet. Plan a video from the home page, then return here.
          </CardContent>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {events.map((e) => (
            <li key={e.id}>
              <Link href={`/events/${e.id}`}>
                <Card className="transition-colors hover:bg-muted/40">
                  <CardContent className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <span className="font-medium">{e.itinerary.title}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {e.id.slice(0, 8)}…
                      </span>
                      <Badge variant="secondary">{e.status}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
