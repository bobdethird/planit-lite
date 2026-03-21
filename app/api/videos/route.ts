import { NextResponse } from "next/server"
import path from "path"
import fs from "fs"

const DOWNLOADS_DIR = path.join(process.cwd(), "downloads")

export async function GET() {
  try {
    if (!fs.existsSync(DOWNLOADS_DIR)) {
      return NextResponse.json({ videos: [] })
    }

    const files = fs
      .readdirSync(DOWNLOADS_DIR)
      .filter((f) => f.endsWith(".mp4"))
      .map((filename) => {
        const stat = fs.statSync(path.join(DOWNLOADS_DIR, filename))
        const transcriptPath = path.join(
          DOWNLOADS_DIR,
          `${filename}.transcript.json`,
        )
        const hasTranscript = fs.existsSync(transcriptPath)
        let transcript: string | null = null
        if (hasTranscript) {
          try {
            const data = JSON.parse(
              fs.readFileSync(transcriptPath, "utf-8"),
            )
            transcript = data.text ?? null
          } catch {
            // corrupt transcript file, ignore
          }
        }
        return {
          filename,
          url: `/api/videos/${encodeURIComponent(filename)}`,
          size: stat.size,
          downloadedAt: stat.mtime.toISOString(),
          hasTranscript,
          transcript,
        }
      })
      .sort(
        (a, b) =>
          new Date(b.downloadedAt).getTime() -
          new Date(a.downloadedAt).getTime(),
      )

    return NextResponse.json({ videos: files })
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to list videos"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
