import { NextRequest, NextResponse } from "next/server"
import path from "path"
import fs from "fs"
import { GoogleGenerativeAI } from "@google/generative-ai"
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

    const cachePath = path.join(DOWNLOADS_DIR, `${filename}.analysis.json`)
    if (fs.existsSync(cachePath)) {
      const cached = JSON.parse(fs.readFileSync(cachePath, "utf-8"))
      return NextResponse.json({ videoContext: cached, cached: true })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY not configured" },
        { status: 500 },
      )
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash"
    const model = genAI.getGenerativeModel({ model: modelName })

    const videoBuffer = fs.readFileSync(videoPath)
    const videoBase64 = videoBuffer.toString("base64")

    const prompt = `You are an event planning AI. Analyze this social media video (TikTok/Instagram reel) and extract structured information to plan an event around it.

Focus on:
- What type of venue or activity is shown
- The overall vibe and aesthetic
- Any location hints (city, neighborhood, venue name)
- Price signals (luxury vs casual vs expensive)
- How long this type of activity typically takes
- Listen carefully to any spoken audio for venue names, locations, addresses, or recommendations

Return ONLY valid JSON matching this exact schema (no markdown fences, no extra text):
{
  "venue_type": "string — e.g. rooftop bar, hiking trail, sushi restaurant",
  "vibe": "string — e.g. chill cocktails, high energy nightclub",
  "activity_category": "one of: food, outdoors, nightlife, culture, sports, other",
  "location_hint": "string or null — city/neighborhood/venue if identifiable",
  "price_range": "one of: $, $$, $$$, $$$$",
  "duration_estimate_hrs": "number — typical duration in hours",
  "key_details": "string or null — any venue names, addresses, phone numbers visible or spoken in the video"
}`

    const contentParts = [
      { text: prompt },
      {
        inlineData: {
          mimeType: "video/mp4",
          data: videoBase64,
        },
      },
    ]

    let result
    const MAX_RETRIES = 3
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        result = await model.generateContent(contentParts)
        break
      } catch (err: unknown) {
        const is503 = err instanceof Error && err.message.includes("503")
        if (!is503 || attempt === MAX_RETRIES - 1) throw err
        const delay = 1000 * 2 ** attempt
        console.log(`[analyze] 503 from Gemini, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`)
        await new Promise(r => setTimeout(r, delay))
      }
    }

    if (!result) throw new Error("Gemini request failed after retries")

    const text = result.response.text().trim()
    console.log("[analyze] raw Gemini response:", text.slice(0, 500))

    // Strip markdown fences and any text before/after the JSON object
    let jsonStr = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "")
    const jsonStart = jsonStr.indexOf("{")
    const jsonEnd = jsonStr.lastIndexOf("}")
    if (jsonStart !== -1 && jsonEnd !== -1) {
      jsonStr = jsonStr.slice(jsonStart, jsonEnd + 1)
    }

    let parsed
    try {
      parsed = JSON.parse(jsonStr)
    } catch {
      return NextResponse.json(
        { error: "Gemini returned invalid JSON", raw: text },
        { status: 502 },
      )
    }

    // Normalize null optional fields to undefined so Zod accepts them
    if (parsed.location_hint === null) delete parsed.location_hint
    if (parsed.key_details === null) delete parsed.key_details

    // Coerce duration from string to number if needed
    if (typeof parsed.duration_estimate_hrs === "string") {
      parsed.duration_estimate_hrs = parseFloat(parsed.duration_estimate_hrs) || 2
    }

    console.log("[analyze] parsed JSON:", JSON.stringify(parsed))

    const validated = VideoContextZodSchema.safeParse(parsed)
    if (!validated.success) {
      console.log("[analyze] schema validation failed:", JSON.stringify(validated.error.flatten()))
      return NextResponse.json(
        { error: "Gemini output doesn't match schema", details: validated.error.flatten(), raw: parsed },
        { status: 502 },
      )
    }

    const videoContext = validated.data

    fs.writeFileSync(cachePath, JSON.stringify(videoContext, null, 2))

    return NextResponse.json({ videoContext })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Analysis failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
