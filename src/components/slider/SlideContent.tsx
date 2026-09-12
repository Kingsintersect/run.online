"use client"

import Link from "next/link"
import { ArrowRight, ChevronRight } from "lucide-react"
import { SlideData } from "./data/slides"

interface SlideContentProps {
  data: SlideData
}

export const SlideContent = ({ data }: SlideContentProps) => {
  return (
    <div className="relative z-10 max-w-2xl p-8 lg:p-12">
      {/* Eyebrow — bold caption with a primary tick */}
      <div className="slide-category mb-7 inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/10 py-2 pr-4 pl-3 backdrop-blur-md">
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary" />
        <span className="text-[11px] font-bold tracking-[0.18em] text-white uppercase">
          {data.category}
        </span>
      </div>

      {/* Primary accent rule sets the headline off without tinting the type */}
      <span
        aria-hidden
        className="mb-5 block h-0.75 w-14 rounded-full bg-primary"
      />

      <h1 className="slide-title mb-4 text-4xl leading-[1.05] font-bold tracking-tight text-white lg:text-6xl">
        {data.title}
      </h1>

      <h2 className="slide-subtitle mb-6 text-xl font-medium tracking-tight text-primary lg:text-2xl">
        {data.subtitle}
      </h2>

      <p className="slide-description mb-9 max-w-lg text-base leading-relaxed text-white/75 lg:text-lg">
        {data.description}
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link
          href={data.primaryAction.url ?? "/academics"}
          className="slide-btn group inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 text-xs font-bold tracking-widest text-primary-foreground uppercase shadow-lg shadow-primary/30 transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/45"
        >
          {data.primaryAction.text}
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </Link>

        <Link
          href={data.secondaryAction.url ?? "/about"}
          className="slide-btn group inline-flex items-center justify-center gap-2 rounded-full border border-white/30 px-8 py-4 text-xs font-bold tracking-widest text-white uppercase backdrop-blur-md transition-all duration-300 hover:border-white/60 hover:bg-white/10"
        >
          {data.secondaryAction.text}
          <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  )
}
