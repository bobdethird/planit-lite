import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "planit-lite",
    timestamp: new Date().toISOString(),
  })
}
