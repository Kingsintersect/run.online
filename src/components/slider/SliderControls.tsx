"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"

interface SliderControlsProps {
  onPrevious: () => void
  onNext: () => void
  currentSlide: number
  totalSlides: number
}

const arrowClasses =
  "group absolute top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/20 bg-white/10 p-3.5 text-white backdrop-blur-md transition-all duration-300 hover:border-primary hover:bg-primary hover:text-primary-foreground"

export const SliderControls = ({
  onPrevious,
  onNext,
  currentSlide,
  totalSlides,
}: SliderControlsProps) => {
  return (
    <>
      {/* Arrow Controls */}
      <button
        onClick={onPrevious}
        className={`${arrowClasses} left-4 lg:left-8`}
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-5 w-5 transition-transform duration-300 group-hover:-translate-x-0.5" />
      </button>

      <button
        onClick={onNext}
        className={`${arrowClasses} right-4 lg:right-8`}
        aria-label="Next slide"
      >
        <ChevronRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-0.5" />
      </button>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 z-20 h-1 w-full bg-white/15">
        <div
          className="progress-bar-fill h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${((currentSlide + 1) / totalSlides) * 100}%` }}
        />
      </div>

      {/* Slide Counter — the live number carries the accent */}
      <div className="absolute top-8 right-8 z-20">
        <div className="flex items-baseline gap-1.5 rounded-full border border-white/15 bg-black/40 px-4 py-2 backdrop-blur-md">
          <span className="text-lg font-bold text-primary tabular-nums">
            {String(currentSlide + 1).padStart(2, "0")}
          </span>
          <span className="text-xs font-medium text-white/40">/</span>
          <span className="text-xs font-semibold text-white/60 tabular-nums">
            {String(totalSlides).padStart(2, "0")}
          </span>
        </div>
      </div>
    </>
  )
}
