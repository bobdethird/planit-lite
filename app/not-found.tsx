import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-6">
      <p className="mb-2 font-mono text-xs uppercase tracking-widest text-[#FF6B00]">
        404
      </p>
      <h1 className="text-2xl font-bold text-black">Page not found</h1>
      <p className="mt-2 mb-8 max-w-sm text-center text-sm text-[#888]">
        This URL isn&apos;t part of the PlanIt flow. Head back and drop a reel
        link instead.
      </p>
      <Link
        href="/"
        className="inline-flex items-center rounded-xl bg-black px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#333]"
      >
        Back to PlanIt
      </Link>
    </div>
  )
}
