"use client"

import { SlideData } from "./data/slides"
import { SlideContent } from "./SlideContent"

interface SlideProps {
  data: SlideData
  isActive: boolean
  slideRef?: (el: HTMLDivElement | null) => void
}

export const Slide = ({ data, isActive, slideRef }: SlideProps) => {
  return (
    <div
      ref={slideRef}
      className={`absolute inset-0 opacity-0 ${isActive ? "z-10" : "z-0"}`}
      style={{
        backgroundImage: `url(${data.image})`,
        backgroundSize: "cover",
        backgroundPosition: "top",
      }}
    >
      {/* Legibility scrims — these earn their keep holding text over photography */}
      <div className="absolute inset-0 bg-linear-to-r from-black/85 via-black/45 to-transparent" />
      <div className="absolute inset-0 bg-linear-to-t from-black/70 via-transparent to-transparent" />

      {/* Content positioned in the center-left */}
      <div className="absolute top-1/2 left-8 -translate-y-1/2 transform lg:left-16">
        <SlideContent data={data} />
      </div>
    </div>
  )
}
