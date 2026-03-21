import { NextRequest, NextResponse } from "next/server"
import path from "path"
import fs from "fs"
import { generateObject } from "ai"
import { google } from "@ai-sdk/google"
import { VideoContextZodSchema } from "@/lib/zod-schemas"

const DOWNLOADS_DIR = path.join(process.cwd(), "downloads")

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { filename } = body as { filename?: string }

    if (!filename || typeof filename !== "string") {
      return NextResponse.json({ error: "Missing filename" }, { status: 400 })
    }

    if (filename.includes("..") || filename.includes("/")) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 })
    }

    const videoPath = path.join(DOWNLOADS_DIR, filename)
    if (!fs.existsSync(videoPath)) {
      return NextResponse.json({ error: "Video file not found" }, { status: 404 })
    }

    // Check for cached analysis
    const cachePath = path.join(DOWNLOADS_DIR, `${filename}.analysis.json`)
    if (fs.existsSync(cachePath)) {
      const cached = JSON.parse(fs.readFileSync(cachePath, "utf-8"))
      return NextResponse.json({ videoContext: cached, cached: true })
    }

    // Load optional transcript for additional context
    const transcriptPath = path.join(DOWNLOADS_DIR, `${filename}.transcript.json`)
    let transcriptText = ""
    if (fs.existsSync(transcriptPath)) {
      const t = JSON.parse(fs.readFileSync(transcriptPath, "utf-8"))
      transcriptText = t.text || ""
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "GOOGLE_GENERATIVE_AI_API_KEY not configured" },
        { status: 500 }
      )
    }

    const videoBuffer = fs.readFileSync(videoPath)
    const videoBase64 = videoBuffer.toString("base64")

    const systemPrompt = `You are an event planning AI. Analyze this social media video (TikTok/Instagram reel) and extract structured information to plan an event around it.

Focus on:
- What type of venue or activity is shown
- The overall vibe and aesthetic
- Any location hints (city, neighborhood, venue name)
- Price signals (luxury vs casual)
- How long this type of activity typically takes
${transcriptText ? `\nAudio transcript for context: "${transcriptText}"` : ""}

Be specific and actionable. This data will be used to plan a real group event.`

    const { object: videoContext } = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: VideoContextZodSchema,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: systemPrompt,
            },
            {
              type: "file",
              data: videoBase64,
              mimeType: "video/mp4",
            },
          ],
        },
      ],
    })

    if (transcriptText) {
      videoContext.audio_transcript = transcriptText
    }

    // Cache the result
    fs.writeFileSync(cachePath, JSON.stringify(videoContext, null, 2))

    return NextResponse.json({ videoContext })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Analysis failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
