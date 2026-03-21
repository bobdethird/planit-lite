import { NextRequest, NextResponse } from "next/server"
import path from "path"
import fs from "fs"
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js"

const DOWNLOADS_DIR = path.join(process.cwd(), "downloads")

function getClient() {
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey || apiKey === "your_api_key_here") {
    throw new Error(
      "ELEVENLABS_API_KEY is not configured. Add it to .env.local",
    )
  }
  return new ElevenLabsClient({ apiKey })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { filename } = body as { filename?: string }

    if (!filename || typeof filename !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'filename' field" },
        { status: 400 },
      )
    }

    if (filename.includes("..") || filename.includes("/")) {
      return NextResponse.json(
        { error: "Invalid filename" },
        { status: 400 },
      )
    }

    const videoPath = path.join(DOWNLOADS_DIR, filename)
    if (!fs.existsSync(videoPath)) {
      return NextResponse.json(
        { error: "Video file not found" },
        { status: 404 },
      )
    }

    const transcriptPath = path.join(
      DOWNLOADS_DIR,
      `${filename}.transcript.json`,
    )

    if (fs.existsSync(transcriptPath)) {
      const existing = JSON.parse(fs.readFileSync(transcriptPath, "utf-8"))
      return NextResponse.json({ transcript: existing })
    }

    const client = getClient()

    const fileBuffer = fs.readFileSync(videoPath)
    const file = new File([fileBuffer], filename, { type: "video/mp4" })

    const result = await client.speechToText.convert({
      file,
      modelId: "scribe_v2",
      tagAudioEvents: true,
      timestampsGranularity: "word",
    })

    const transcript = {
      text: result.text,
      languageCode: result.languageCode,
      words: result.words?.map((w) => ({
        text: w.text,
        start: w.start,
        end: w.end,
        type: w.type,
        speakerId: w.speakerId,
      })),
    }

    fs.writeFileSync(transcriptPath, JSON.stringify(transcript, null, 2))

    return NextResponse.json({ transcript })
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Transcription failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
