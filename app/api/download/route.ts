import { NextRequest, NextResponse } from "next/server"
import path from "path"
import fs from "fs"
import { execFile } from "child_process"
import { promisify } from "util"

const execFileAsync = promisify(execFile)

const DOWNLOADS_DIR = path.join(process.cwd(), "downloads")
const COOKIES_PATH = path.join(process.cwd(), "cookies.txt")
const YTDLP_PATH = process.env.YTDLP_PATH || "/opt/homebrew/bin/yt-dlp"

const ALLOWED_HOSTS = [
  "instagram.com",
  "www.instagram.com",
  "tiktok.com",
  "www.tiktok.com",
  "vm.tiktok.com",
  "vt.tiktok.com",
]

function isValidUrl(urlString: string): URL | null {
  try {
    return new URL(urlString)
  } catch {
    return null
  }
}

function isAllowedHost(url: URL): boolean {
  return ALLOWED_HOSTS.some(
    (host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
  )
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url } = body as { url?: string }

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'url' field" },
        { status: 400 },
      )
    }

    const parsed = isValidUrl(url.trim())
    if (!parsed) {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 },
      )
    }

    if (!isAllowedHost(parsed)) {
      return NextResponse.json(
        { error: "Only Instagram and TikTok links are supported" },
        { status: 400 },
      )
    }

    fs.mkdirSync(DOWNLOADS_DIR, { recursive: true })

    const args = [
      "--format", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
      "--output", path.join(DOWNLOADS_DIR, "%(id)s.%(ext)s"),
      "--merge-output-format", "mp4",
      "--no-check-certificates",
      "--no-warnings",
      "--add-header", "referer:https://www.tiktok.com/",
      "--print", "after_move:filepath",
    ]

    if (fs.existsSync(COOKIES_PATH)) {
      args.push("--cookies", COOKIES_PATH)
    }

    args.push(url.trim())

    const { stdout } = await execFileAsync(YTDLP_PATH, args, { maxBuffer: 100 * 1024 * 1024 })

    // yt-dlp prints the actual output filepath via --print after_move:filepath
    const printedPath = stdout.trim().split("\n").pop()?.trim()
    const latestFile = printedPath && fs.existsSync(printedPath)
      ? path.basename(printedPath)
      : null

    if (!latestFile) {
      return NextResponse.json(
        { error: "Download completed but no MP4 file was found" },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      filename: latestFile,
      url: `/api/videos/${encodeURIComponent(latestFile)}`,
    })
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown error occurred"

    const isAuthError =
      message.includes("login") ||
      message.includes("cookie") ||
      message.includes("rate-limit")

    return NextResponse.json(
      {
        error: isAuthError
          ? "Instagram requires authentication. Place a cookies.txt file in the project root, or try a TikTok link instead."
          : `Download failed: ${message}`,
      },
      { status: 500 },
    )
  }
}
