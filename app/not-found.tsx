import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-6">
      <p className="mb-2 font-mono text-xs uppercase tracking-widest text-[#F97316]">
        404
      </p>
      <h1 className="font-editorial text-2xl font-semibold text-[#1C1917]">Page not found</h1>
      <p className="mt-2 mb-8 max-w-sm text-center text-sm text-[#78716C]">
        This URL isn&apos;t part of the PlanIt flow. Head back and drop a reel
        link instead.
      </p>
      <Link
        href="/"
        className="inline-flex items-center rounded-[10px] bg-[#1C1917] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#292524]"
      >
        Back to PlanIt
      </Link>
    </div>
  )
}
