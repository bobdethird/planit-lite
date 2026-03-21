"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Download,
  Loader2,
  Video,
  Trash2,
  RefreshCw,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react"

interface VideoFile {
  filename: string
  url: string
  size: number
  downloadedAt: string
  hasTranscript: boolean
  transcript: string | null
}

type DownloadStatus =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "success"; filename: string }
  | { type: "error"; message: string }

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function getPlatform(filename: string): "tiktok" | "instagram" | "unknown" {
  if (/^\d{19,}/.test(filename)) return "tiktok"
  if (/^[A-Za-z0-9_-]{11}/.test(filename)) return "instagram"
  return "unknown"
}

function VideoCard({
  video,
  onDelete,
  onTranscriptReady,
}: {
  video: VideoFile
  onDelete: (filename: string) => void
  onTranscriptReady: () => void
}) {
  const [transcribing, setTranscribing] = useState(false)
  const [transcriptError, setTranscriptError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const platform = getPlatform(video.filename)

  async function handleTranscribe() {
    setTranscribing(true)
    setTranscriptError(null)

    try {
      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: video.filename }),
      })

      const data = await res.json()

      if (!res.ok) {
        setTranscriptError(data.error || "Transcription failed")
        return
      }

      onTranscriptReady()
      setExpanded(true)
    } catch {
      setTranscriptError("Network error during transcription")
    } finally {
      setTranscribing(false)
    }
  }

  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-3">
        <video
          src={video.url}
          controls
          preload="metadata"
          className="w-full rounded-lg bg-black"
        />
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-xs font-medium">
              {video.filename}
            </span>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{formatBytes(video.size)}</span>
              <span>{formatDate(video.downloadedAt)}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {platform !== "unknown" && (
              <Badge variant="secondary">
                {platform === "tiktok" ? "TikTok" : "Instagram"}
              </Badge>
            )}
            {video.hasTranscript && (
              <Badge variant="outline">Transcribed</Badge>
            )}
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onDelete(video.filename)}
              title="Delete"
            >
              <Trash2 className="size-3 text-muted-foreground" />
            </Button>
          </div>
        </div>

        {!video.hasTranscript && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleTranscribe}
            disabled={transcribing}
            className="w-full"
          >
            {transcribing ? (
              <Loader2 className="animate-spin" />
            ) : (
              <FileText />
            )}
            {transcribing ? "Transcribing..." : "Transcribe"}
          </Button>
        )}

        {transcriptError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {transcriptError}
          </div>
        )}

        {video.hasTranscript && video.transcript && (
          <div className="flex flex-col gap-1.5">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {expanded ? (
                <ChevronUp className="size-3" />
              ) : (
                <ChevronDown className="size-3" />
              )}
              {expanded ? "Hide transcript" : "Show transcript"}
            </button>
            {expanded && (
              <div className="rounded-lg border bg-muted/50 px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap">
                {video.transcript}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function Page() {
  const [url, setUrl] = useState("")
  const [status, setStatus] = useState<DownloadStatus>({ type: "idle" })
  const [videos, setVideos] = useState<VideoFile[]>([])

  const fetchVideos = useCallback(async () => {
    try {
      const res = await fetch("/api/videos")
      const data = await res.json()
      if (data.videos) setVideos(data.videos)
    } catch {
      // silently fail on list fetch
    }
  }, [])

  useEffect(() => {
    fetchVideos()
  }, [fetchVideos])

  async function handleDownload() {
    const trimmed = url.trim()
    if (!trimmed) return

    setStatus({ type: "loading" })

    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      })

      const data = await res.json()

      if (!res.ok) {
        setStatus({ type: "error", message: data.error || "Download failed" })
        return
      }

      setStatus({ type: "success", filename: data.filename })
      setUrl("")
      fetchVideos()
    } catch {
      setStatus({
        type: "error",
        message: "Network error. Is the server running?",
      })
    }
  }

  async function handleDelete(filename: string) {
    try {
      await fetch(`/api/videos/${encodeURIComponent(filename)}`, {
        method: "DELETE",
      })
      fetchVideos()
    } catch {
      // silently fail
    }
  }

  const isLoading = status.type === "loading"

  return (
    <div className="mx-auto flex min-h-svh max-w-2xl flex-col gap-8 p-6 md:p-10">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Video Downloader
        </h1>
        <p className="text-sm text-muted-foreground">
          Paste an Instagram or TikTok link to download and transcribe it.
        </p>
      </header>

      <div className="flex flex-col gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleDownload()
          }}
          className="flex gap-2"
        >
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.tiktok.com/... or https://www.instagram.com/..."
            disabled={isLoading}
            className="h-9 flex-1"
          />
          <Button type="submit" disabled={isLoading || !url.trim()} size="lg">
            {isLoading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Download />
            )}
            {isLoading ? "Downloading..." : "Download"}
          </Button>
        </form>

        {status.type === "success" && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
            Downloaded <span className="font-medium">{status.filename}</span>
          </div>
        )}

        {status.type === "error" && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {status.message}
          </div>
        )}
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold">
            Downloaded Videos
          </h2>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={fetchVideos}
            title="Refresh"
          >
            <RefreshCw className="size-3.5" />
          </Button>
        </div>

        {videos.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-12 text-center text-muted-foreground">
            <Video className="size-8 opacity-40" />
            <p className="text-sm">No videos downloaded yet.</p>
            <p className="text-xs">Paste a link above to get started.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {videos.map((video) => (
              <VideoCard
                key={video.filename}
                video={video}
                onDelete={handleDelete}
                onTranscriptReady={fetchVideos}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
