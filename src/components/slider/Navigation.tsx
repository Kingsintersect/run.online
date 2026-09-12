"use client"

interface NavigationProps {
  totalSlides: number
  currentSlide: number
  onSlideSelect: (index: number) => void
}

export const SliderNavigation = ({
  totalSlides,
  currentSlide,
  onSlideSelect,
}: NavigationProps) => {
  return (
    <div className="absolute bottom-8 left-1/2 z-20 -translate-x-1/2">
      <div className="flex items-center gap-2">
        {Array.from({ length: totalSlides }, (_, index) => {
          const active = index === currentSlide
          return (
            <button
              key={index}
              onClick={() => onSlideSelect(index)}
              aria-label={`Go to slide ${index + 1}`}
              aria-current={active ? "true" : undefined}
              className={`h-2.5 rounded-full transition-all duration-500 ease-out ${
                active
                  ? "w-9 bg-primary"
                  : "w-2.5 bg-white/35 hover:bg-white/65"
              }`}
            />
          )
        })}
      </div>
    </div>
  )
}
