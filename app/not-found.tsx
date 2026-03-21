import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="min-h-svh bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center px-6">
      <p className="font-mono text-xs text-orange-400 uppercase tracking-widest mb-2">
        404
      </p>
      <h1 className="font-heading text-2xl font-bold mb-2">Page not found</h1>
      <p className="text-sm text-zinc-500 text-center max-w-sm mb-8">
        This URL isn&apos;t part of the VibeSync flow. Head back and drop a reel
        link instead.
      </p>
      <Button asChild className="bg-orange-500 hover:bg-orange-400 text-white">
        <Link href="/">Back to VibeSync</Link>
      </Button>
    </div>
  )
}
