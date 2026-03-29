"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Link2, Send } from "lucide-react"

const EXAMPLE_URLS = [
  "https://tiktok.com/@foodie/video/71839...",
  "https://instagram.com/reel/C8xK2n...",
  "https://tiktok.com/@travel/video/72451...",
]

const TYPE_SPEED = 45
const PAUSE_BEFORE_DELETE = 1800
const DELETE_SPEED = 25
const PAUSE_BETWEEN = 400

interface Props {
  url: string
  setUrl: (url: string) => void
  onSubmit: () => void
  onPaste: (e: React.ClipboardEvent<HTMLInputElement>) => void
}

export function HomeInputBar({ url, setUrl, onSubmit, onPaste }: Props) {
  const [placeholder, setPlaceholder] = useState("")
  const [isFocused, setIsFocused] = useState(false)
  const animRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const indexRef = useRef(0)
  const mountedRef = useRef(true)

  const hasUrl = url.trim().length > 0

  const animate = useCallback(() => {
    if (!mountedRef.current) return
    const target = EXAMPLE_URLS[indexRef.current % EXAMPLE_URLS.length]
    let charIdx = 0

    function typeNext() {
      if (!mountedRef.current) return
      if (charIdx <= target.length) {
        setPlaceholder(target.slice(0, charIdx))
        charIdx++
        animRef.current = setTimeout(typeNext, TYPE_SPEED)
      } else {
        animRef.current = setTimeout(deleteChars, PAUSE_BEFORE_DELETE)
      }
    }

    function deleteChars() {
      if (!mountedRef.current) return
      const current = target.slice(0, charIdx)
      if (charIdx > 0) {
        charIdx--
        setPlaceholder(current.slice(0, -1))
        animRef.current = setTimeout(deleteChars, DELETE_SPEED)
      } else {
        indexRef.current++
        animRef.current = setTimeout(animate, PAUSE_BETWEEN)
      }
    }

    typeNext()
  }, [])

  useEffect(() => {
    mountedRef.current = true
    const delay = setTimeout(animate, 600)
    return () => {
      mountedRef.current = false
      clearTimeout(delay)
      if (animRef.current) clearTimeout(animRef.current)
    }
  }, [animate])

  return (
    <motion.form
      onSubmit={(e) => { e.preventDefault(); onSubmit() }}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <div className="flex items-center gap-2 rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white p-2 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <Link2 className="ml-2 h-5 w-5 shrink-0 text-[#A8A29E]" />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onPaste={onPaste}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={isFocused || hasUrl ? "Paste a TikTok or Instagram reel link…" : placeholder || "Paste a link…"}
          className="min-w-0 flex-1 border-0 bg-transparent text-sm text-[#1C1917] outline-none placeholder:text-[#C4C0B8]"
        />
        <AnimatePresence mode="wait">
          {hasUrl ? (
            <motion.button
              key="active"
              type="submit"
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className="flex min-h-[36px] items-center gap-1.5 rounded-xl bg-[#E8713A] px-4 text-sm font-semibold text-white shadow-[0_0_20px_rgba(232,113,58,0.3)] transition-shadow hover:shadow-[0_0_28px_rgba(232,113,58,0.45)]"
            >
              <Send className="h-3.5 w-3.5" />
              Analyze
            </motion.button>
          ) : (
            <motion.button
              key="inactive"
              type="submit"
              disabled
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex min-h-[36px] cursor-not-allowed items-center gap-1.5 rounded-xl bg-[#E8E6E1] px-4 text-sm font-semibold text-[#B5B1AA]"
            >
              <Send className="h-3.5 w-3.5" />
              Analyze
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.form>
  )
}
