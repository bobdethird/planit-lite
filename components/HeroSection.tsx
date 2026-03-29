"use client"

import { motion } from "framer-motion"

export function HeroSection() {
  return (
    <motion.div
      className="px-1 pt-6 pb-2"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <h1 className="font-heading text-[2rem] font-bold leading-[1.15] tracking-tight text-[#1C1917]">
        Drop a reel.
        <br />
        Plan the night.
      </h1>
      <p className="mt-3 max-w-[340px] text-[0.95rem] leading-relaxed text-[#A8A29E]">
        Paste a TikTok or Instagram link&nbsp;&mdash; AI builds the itinerary,
        your friends vote, and it hits everyone&rsquo;s calendar.
      </p>
    </motion.div>
  )
}
