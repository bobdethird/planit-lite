#!/usr/bin/env npx tsx
/**
 * One-time utility to obtain a Google Calendar OAuth refresh token.
 *
 * Prerequisites:
 *   1. Go to https://console.cloud.google.com/apis/credentials
 *   2. Create an OAuth 2.0 Client ID (type: Web application)
 *   3. Add http://localhost:3333/callback as an authorized redirect URI
 *   4. Enable the Google Calendar API in your project
 *   5. Set GOOGLE_CALENDAR_CLIENT_ID and GOOGLE_CALENDAR_CLIENT_SECRET in .env.local
 *
 * Usage:
 *   npx tsx scripts/get-gcal-token.ts
 *
 * The script starts a tiny HTTP server, opens the consent screen, and prints
 * the refresh token to paste into .env.local.
 */

import { createServer } from "http"
import { URL } from "url"
import { execSync } from "child_process"
import { readFileSync } from "fs"
import { resolve } from "path"

// Minimal .env.local parser (avoids external dotenv dependency)
try {
  const envPath = resolve(process.cwd(), ".env.local")
  const lines = readFileSync(envPath, "utf-8").split("\n")
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed.slice(eq + 1).trim()
    if (!process.env[key]) process.env[key] = val
  }
} catch { /* .env.local not found, rely on existing env */ }

const CLIENT_ID = process.env.GOOGLE_CALENDAR_CLIENT_ID
const CLIENT_SECRET = process.env.GOOGLE_CALENDAR_CLIENT_SECRET
const REDIRECT_URI = "http://localhost:3333/callback"
const SCOPES = "https://www.googleapis.com/auth/calendar.events"

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Set GOOGLE_CALENDAR_CLIENT_ID and GOOGLE_CALENDAR_CLIENT_SECRET in .env.local first.")
  process.exit(1)
}

const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth")
authUrl.searchParams.set("client_id", CLIENT_ID)
authUrl.searchParams.set("redirect_uri", REDIRECT_URI)
authUrl.searchParams.set("response_type", "code")
authUrl.searchParams.set("scope", SCOPES)
authUrl.searchParams.set("access_type", "offline")
authUrl.searchParams.set("prompt", "consent")

console.log("\nOpening browser for Google sign-in...\n")
console.log(authUrl.toString(), "\n")
try { execSync(`open "${authUrl.toString()}"`) } catch { /* manual fallback */ }

const server = createServer(async (req, res) => {
  const url = new URL(req.url!, `http://localhost:3333`)
  if (!url.pathname.startsWith("/callback")) {
    res.writeHead(404)
    res.end()
    return
  }

  const code = url.searchParams.get("code")
  if (!code) {
    res.writeHead(400)
    res.end("Missing code parameter")
    return
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID!,
      client_secret: CLIENT_SECRET!,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  })

  const data = await tokenRes.json()

  if (data.refresh_token) {
    console.log("=== SUCCESS ===")
    console.log(`\nAdd this to your .env.local:\n`)
    console.log(`GOOGLE_CALENDAR_REFRESH_TOKEN=${data.refresh_token}\n`)
    res.writeHead(200, { "Content-Type": "text/html" })
    res.end("<h1>Success!</h1><p>You can close this tab. Check your terminal for the refresh token.</p>")
  } else {
    console.error("No refresh_token in response:", data)
    res.writeHead(200, { "Content-Type": "text/html" })
    res.end("<h1>Error</h1><p>No refresh token. Check terminal.</p>")
  }

  server.close()
  process.exit(0)
})

server.listen(3333, () => {
  console.log("Waiting for OAuth callback on http://localhost:3333/callback ...")
})
