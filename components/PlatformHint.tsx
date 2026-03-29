"use client"

import { motion } from "framer-motion"

export function PlatformHint() {
  return (
    <motion.p
      className="py-6 text-center text-xs text-[#C4C0B8]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.7, duration: 0.5 }}
    >
      Works with{" "}
      <span className="font-medium text-[#A8A29E]">TikTok</span>
      {" "}and{" "}
      <span className="font-medium text-[#A8A29E]">Instagram Reels</span>
    </motion.p>
  )
}
