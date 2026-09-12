"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { X, ZoomIn } from "lucide-react"
import { cn } from "@/lib/utils"

interface ZoomableImageProps {
  src: string
  alt: string
  className?: string
  /** Optional title shown in the enlarged modal's header (defaults to `alt`). */
  title?: string
}

/**
 * A thumbnail that opens itself full-size in a modal on click — for review
 * screens (e.g. an applicant's passport photo) where a small avatar-sized
 * image isn't enough to actually inspect. Reusable anywhere a document/photo
 * thumbnail needs "click to enlarge" without pulling in the full
 * DocumentList/DocumentCard machinery.
 */
export function ZoomableImage({
  src,
  alt,
  className,
  title,
}: ZoomableImageProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn("group relative block cursor-zoom-in", className)}
        title="Click to enlarge"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="h-full w-full object-cover" />
        <span className="absolute inset-0 flex items-center justify-center rounded-[inherit] bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
          <ZoomIn size={18} className="text-white" />
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-h-[85vh] max-w-3xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-border p-3">
                <p className="text-sm font-semibold text-foreground">
                  {title ?? alt}
                </p>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="max-h-[calc(85vh-52px)] overflow-auto p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={alt}
                  className="mx-auto h-auto max-h-[75vh] w-auto rounded-lg object-contain"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
