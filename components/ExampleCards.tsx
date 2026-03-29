"use client"

import { motion } from "framer-motion"
import { MapPin, Clock } from "lucide-react"

const EXAMPLES = [
  {
    title: "Rooftop Cocktails @ Charmaine's",
    location: "San Francisco, CA",
    tags: ["nightlife", "$$"],
    duration: "~2h",
    gradient: "linear-gradient(135deg, #E8713A 0%, #F59E6C 100%)",
  },
  {
    title: "Sunrise Hike at Runyon Canyon",
    location: "Los Angeles, CA",
    tags: ["outdoors", "$"],
    duration: "~3h",
    gradient: "linear-gradient(135deg, #1E3A5F 0%, #4A8DB7 100%)",
  },
  {
    title: "Omakase Night @ Sushi Noz",
    location: "New York, NY",
    tags: ["food", "$$$"],
    duration: "~2.5h",
    gradient: "linear-gradient(135deg, #2D6A4F 0%, #52B788 100%)",
  },
]

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.35 },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
}

export function ExampleCards() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="pt-4"
    >
      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-[#A8A29E]">
        See what others planned
      </p>

      <div
        className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2"
        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
      >
        {EXAMPLES.map((ex) => (
          <motion.div
            key={ex.title}
            variants={cardVariants}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="w-[220px] shrink-0 cursor-default overflow-hidden rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-shadow hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
          >
            <div
              className="px-4 pb-3 pt-4"
              style={{ background: ex.gradient }}
            >
              <h3 className="text-[0.85rem] font-bold leading-snug text-white">
                {ex.title}
              </h3>
              <div className="mt-1.5 flex items-center gap-1 text-white/75">
                <MapPin className="h-3 w-3" />
                <span className="text-[11px]">{ex.location}</span>
              </div>
            </div>

            <div className="flex items-center justify-between bg-white px-4 py-2.5">
              <div className="flex gap-1.5">
                {ex.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-[#F5F3EF] px-2 py-0.5 text-[10px] font-medium text-[#78716C]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <span className="flex items-center gap-1 text-[11px] text-[#A8A29E]">
                <Clock className="h-3 w-3" />
                {ex.duration}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
