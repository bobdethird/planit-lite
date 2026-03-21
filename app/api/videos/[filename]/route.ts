import { NextRequest, NextResponse } from "next/server"
import path from "path"
import fs from "fs"

const DOWNLOADS_DIR = path.join(process.cwd(), "downloads")

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  try {
    const { filename } = await params

    const decoded = decodeURIComponent(filename)

    if (decoded.includes("..") || decoded.includes("/")) {
      return NextResponse.json(
        { error: "Invalid filename" },
        { status: 400 },
      )
    }

    const filePath = path.join(DOWNLOADS_DIR, decoded)

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 },
      )
    }

    const stat = fs.statSync(filePath)
    const fileBuffer = fs.readFileSync(filePath)

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": stat.size.toString(),
        "Content-Disposition": `inline; filename="${decoded}"`,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to serve video"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  try {
    const { filename } = await params
    const decoded = decodeURIComponent(filename)

    if (decoded.includes("..") || decoded.includes("/")) {
      return NextResponse.json(
        { error: "Invalid filename" },
        { status: 400 },
      )
    }

    const filePath = path.join(DOWNLOADS_DIR, decoded)

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 },
      )
    }

    fs.unlinkSync(filePath)
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to delete video"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
