"use client"

import { useEffect } from "react"
import Link from "next/link"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="en">
      <body className="min-h-svh bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center gap-4 px-6 font-sans antialiased">
        <p className="font-mono text-xs text-red-400 uppercase tracking-widest">
          Error
        </p>
        <h1 className="text-xl font-semibold">Something broke</h1>
        <p className="text-sm text-zinc-500 text-center max-w-md">
          {error.message || "An unexpected error occurred."}
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-400"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-900"
          >
            Home
          </Link>
        </div>
      </body>
    </html>
  )
}
