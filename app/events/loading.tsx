import { Loader2 } from "lucide-react"

export default function EventsLoading() {
  return (
    <div className="mx-auto flex min-h-[40vh] max-w-2xl flex-col items-center justify-center gap-3 p-10">
      <Loader2 className="size-8 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Loading events…</p>
    </div>
  )
}
