"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Play,
  Quote,
  X,
} from "lucide-react"
import { Swiper, SwiperSlide } from "swiper/react"
import { Autoplay, Navigation, Pagination } from "swiper/modules"
import SectionHeading from "@/components/SectionHeading"
import "swiper/css"
import "swiper/css/navigation"
import "swiper/css/pagination"

const OPEN_DAY_VIDEO_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
const OPEN_DAY_VIDEO_EMBED_URL =
  "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"

const latestNews = [
  { title: "Data Details Test Score Drops", date: "October 20, 2022" },
  { title: "Becoming a better designer", date: "October 18, 2022" },
  { title: "Admin earns scholarship", date: "September 20, 2022" },
]

const newEvents = [
  {
    title: "Data Science and Fake News",
    day: "23",
    monthYear: "Dec, 2029",
    time: "8:00 am - 5:00 pm",
    location: "Vancouver, Canada",
  },
  {
    title: "World Data Summit",
    day: "25",
    monthYear: "Jun, 2022",
    time: "8:00 am - 5:00 pm",
    location: "Paris, French",
  },
  {
    title: "Introduction to Study Skills",
    day: "04",
    monthYear: "Jul, 2023",
    time: "8:00 am - 5:00 pm",
    location: "London, UK",
  },
]

const chooseUs = [
  {
    text: "100% of students are employed immediately after graduation.",
    image: "/s7.jpg",
    sideImage: "/teacher.jpg",
  },
  {
    text: "Academic quality grounded in real-world outcomes.",
    image: "/teacher.jpg",
    sideImage: "/community.jpg",
  },
  {
    text: "Inclusive community, practical support, and strong mentoring.",
    image: "/community.jpg",
    sideImage: "/s7.jpg",
  },
]

const outstandingAlumni = [
  {
    name: "Chidera Okonkwo",
    program: "B.SC. COMPUTER SCIENCE",
    quote:
      "Chidera leads engineering at a Lagos fintech, and credits the distance-learning track for letting him keep working while he studied.",
    image: "/people/chidera-okonkwo.jpg",
  },
  {
    name: "Amara Eze",
    program: "M.ED. EDUCATIONAL MANAGEMENT",
    quote:
      "Amara runs a network of community learning centres in Enugu, training teachers across the south-east.",
    image: "/profile/profile1.jpg",
  },
  {
    name: "Tunde Adeyemi",
    program: "MBA, BUSINESS SCHOOL",
    quote:
      "Tunde built a logistics company serving three states after completing his MBA part-time through the portal.",
    image: "/profile/profile2.jpg",
  },
  {
    name: "Halima Yusuf",
    program: "B.SC. PUBLIC HEALTH",
    quote:
      "Halima coordinates maternal health outreach in Kano, work that started as her final-year research project.",
    image: "/profile/profile8.jpg",
  },
]

const rankings = [
  {
    rank: "3rd",
    label: "Nature Index Young University Rankings",
    icon: "certificate",
  },
  {
    rank: "2nd",
    label: "Times Higher Education Young University Ranking",
    icon: "medal",
  },
  {
    rank: "3rd",
    label: "Best Global Universities in Asia - US News and World Report",
    icon: "hand_medal",
  },
  {
    rank: "5th",
    label: "Times Higher Education Asia University Ranking",
    icon: "hands_star",
  },
  { rank: "19th", label: "QS World University Rankings", icon: "badge_star" },
  { rank: "3rd", label: "QS Asia University Rankings", icon: "ribbon" },
  {
    rank: "33rd",
    label: "US News and World Report Best Global University Rankings",
    icon: "wreath",
  },
  {
    rank: "46th",
    label: "Times Higher Education World University Rankings",
    icon: "trophy",
  },
  {
    rank: "10th",
    label: "QS World's Most Photogenic Universities",
    icon: "shield_1",
  },
]

const facilities = [
  {
    title: "Libraries",
    image:
      "https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=1000&h=650&fit=crop",
  },
  {
    title: "Museums",
    image: "/musuem.jpg",
  },
  {
    title: "Research",
    image: "/research.jpg",
  },
  {
    title: "Enterprise",
    image: "/enterprise.jpg",
  },
  {
    title: "Giving",
    image: "/giving.jpg",
  },
  {
    title: "Sport",
    image: "/games.jpg",
  },
]

const stats = [
  { value: "100%", label: "Passing" },
  { value: "126", label: "People Working" },
  { value: "55K", label: "Students Enrolled" },
  { value: "100", label: "Years Of Experience" },
]

const testimonials = [
  {
    name: "Ifeoma Nwankwo",
    role: "300 LEVEL · ACCOUNTING",
    avatar: "/profile/profile3.jpg",
    text: "Registering courses used to mean queuing half the day. I now do the whole thing from my phone, and my results appear the same week they are published.",
  },
  {
    name: "Emeka Obi",
    role: "PART-TIME · DIPLOMA IN IT",
    avatar: "/profile/profile4.jpg",
    text: "I work full time, so being able to take lectures and pay my fees online is the only reason a degree was ever realistic for me.",
  },
  {
    name: "Suleiman Bello",
    role: "400 LEVEL · MECHANICAL ENGINEERING",
    avatar: "/profile/profile6.jpg",
    text: "Timetable, assessments, transcripts — everything sits in one place. I have not needed to walk into the admin block in two semesters.",
  },
  {
    name: "Edwina Adebayor",
    role: "300 LEVEL · BIOCHEMISTRY",
    avatar: "/profile/profile5.jpg",
    text: "Registering courses used to mean queuing half the day. I now do the whole thing from my phone, and my results appear the same week they are published.",
  },
  {
    name: "Nkiru Ugwu",
    role: "PART-TIME · DIPLOMA IN IT",
    avatar: "/profile/profile7.jpg",
    text: "I work full time, so being able to take lectures and pay my fees online is the only reason a degree was ever realistic for me.",
  },
]

function RankingIcon({ type }: { type: string }) {
  const cls = "h-12 w-12 md:h-16 md:w-16"
  switch (type) {
    case "certificate":
      return (
        <svg
          className={cls}
          viewBox="0 0 64 64"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <rect x="8" y="6" width="48" height="52" rx="3" />
          <line x1="18" y1="20" x2="46" y2="20" />
          <line x1="18" y1="28" x2="46" y2="28" />
          <line x1="18" y1="36" x2="36" y2="36" />
          <circle cx="44" cy="50" r="8" />
          <path d="M40 50l3 3 5-5" />
        </svg>
      )
    case "medal":
      return (
        <svg
          className={cls}
          viewBox="0 0 64 64"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <circle cx="32" cy="40" r="16" />
          <circle cx="32" cy="40" r="10" />
          <path d="M24 10l8 14 8-14H24z" />
          <line x1="24" y1="10" x2="20" y2="4" />
          <line x1="40" y1="10" x2="44" y2="4" />
          <path d="M29 40l2 1.5 2-1.5-1 2.5 2 1.5h-2.5l-0.5 2-0.5-2H28l2-1.5-1-2.5z" />
        </svg>
      )
    case "hand_medal":
      return (
        <svg
          className={cls}
          viewBox="0 0 64 64"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <circle cx="32" cy="22" r="12" />
          <circle cx="32" cy="22" r="7" />
          <path d="M29 22l2 1.5 2-1.5-1 2.5 2 1.5h-2.5l-0.5 2-0.5-2H28l2-1.5-1-2.5z" />
          <path d="M12 54c0 0 2-8 20-8s20 8 20 8" />
          <path d="M20 46v-6h24v6" />
        </svg>
      )
    case "hands_star":
      return (
        <svg
          className={cls}
          viewBox="0 0 64 64"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M8 44c4-8 10-12 16-14" />
          <path d="M56 44c-4-8-10-12-16-14" />
          <path d="M20 30v-8a12 12 0 0024 0v8" />
          <circle cx="32" cy="14" r="10" />
          <path d="M32 8l1.5 4.5H38l-3.5 2.5 1.5 4.5L32 17l-4 2.5 1.5-4.5L26 12.5h4.5z" />
        </svg>
      )
    case "badge_star":
      return (
        <svg
          className={cls}
          viewBox="0 0 64 64"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M32 4l4 8h9l-7 6 3 9-9-5-9 5 3-9-7-6h9z" />
          <circle cx="32" cy="44" r="14" />
          <path d="M32 36l2 5h5l-4 3 2 5-5-3-5 3 2-5-4-3h5z" />
        </svg>
      )
    case "ribbon":
      return (
        <svg
          className={cls}
          viewBox="0 0 64 64"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <circle cx="32" cy="28" r="16" />
          <circle cx="32" cy="28" r="10" />
          <path d="M32 38l-8 18 8-6 8 6-8-18z" />
          <path d="M29 28l2 1.5 2-1.5-1 2.5 2 1.5h-2.5l-0.5 2-0.5-2H28l2-1.5-1-2.5z" />
        </svg>
      )
    case "wreath":
      return (
        <svg
          className={cls}
          viewBox="0 0 64 64"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M12 32c0-4 2-10 6-14M52 32c0-4-2-10-6-14" />
          <path d="M10 40c2 6 8 12 14 14M54 40c-2 6-8 12-14 14" />
          <path d="M18 54c4 2 9 3 14 3s10-1 14-3" />
          <circle cx="32" cy="32" r="12" />
          <path d="M32 26l1.5 4H38l-3.5 2.5 1.5 4L32 34l-4 2.5 1.5-4L26 30h4.5z" />
        </svg>
      )
    case "trophy":
      return (
        <svg
          className={cls}
          viewBox="0 0 64 64"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M20 8h24v20a12 12 0 01-24 0V8z" />
          <path d="M20 18H10a8 8 0 008 8" />
          <path d="M44 18h10a8 8 0 01-8 8" />
          <line x1="32" y1="40" x2="32" y2="50" />
          <rect x="22" y="50" width="20" height="6" rx="2" />
        </svg>
      )
    case "shield_1":
    default:
      return (
        <svg
          className={cls}
          viewBox="0 0 64 64"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M32 6l20 8v14c0 14-10 24-20 28C22 52 12 42 12 28V14l20-8z" />
          <path d="M32 18l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6z" />
          <text
            x="30"
            y="44"
            fontSize="10"
            fontWeight="bold"
            stroke="none"
            fill="currentColor"
            textAnchor="middle"
          >
            1
          </text>
        </svg>
      )
  }
}

export default function LegacySections() {
  const [isVideoOpen, setIsVideoOpen] = useState(false)
  const [selectedTestimonialIndex, setSelectedTestimonialIndex] = useState(0)

  return (
    <div className="overflow-x-hidden px-4 pt-10 pb-8 sm:px-6 md:pt-16 lg:px-8">
      <section className="grid gap-8 md:grid-cols-[1fr_1.05fr] md:items-center md:gap-10">
        <article className="relative mx-auto w-full max-w-xl">
          <div className="absolute -top-3 -left-3 hidden h-20 w-20 rounded bg-primary/15 sm:block md:-top-5 md:-left-5 md:h-28 md:w-28" />
          <div className="absolute -right-3 -bottom-3 hidden h-24 w-24 rounded bg-primary/10 sm:block md:-right-5 md:-bottom-5 md:h-32 md:w-32" />
          <div className="relative h-72 overflow-hidden rounded-md border border-border/60 bg-muted/40 p-3 shadow-sm sm:h-96 md:h-110">
            <Image
              src="https://bond001.com/assets/vc-portrait-7cWoLT0i.jpg"
              alt="Vice Chancellor"
              fill
              sizes="(min-width: 1024px) 520px, (min-width: 768px) 45vw, 100vw"
              className="rounded object-cover"
            />
          </div>
        </article>

        <article className="rounded-md border border-border/70 bg-background/80 p-6 shadow-sm md:p-8">
          <SectionHeading
            eyebrow="A Word From Leadership"
            title="Vice Chancellor's Welcome"
            align="left"
          />
          <p className="mt-6 text-sm leading-7 text-foreground/80 sm:text-[15px] sm:leading-8">
            Welcome to our website. I am honored to serve as Vice Chancellor and
            to continue the university&apos;s tradition of academic excellence,
            innovation, and character formation.
          </p>
          <p className="mt-3 text-sm leading-7 text-foreground/75 sm:text-[15px] sm:leading-8">
            Together with our faculty, staff, and students, we are building a
            dynamic learning community that prepares graduates for meaningful
            impact in their professions and society.
          </p>

          {/* <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <p className="flex items-center gap-2 rounded border border-border/70 bg-muted/35 px-3 py-2 text-sm text-foreground/80">
              <Check size={16} className="text-primary" />Academic Excellence
            </p>
            <p className="flex items-center gap-2 rounded border border-border/70 bg-muted/35 px-3 py-2 text-sm text-foreground/80">
              <Check size={16} className="text-primary" />Global Relevance
            </p>
            <p className="flex items-center gap-2 rounded border border-border/70 bg-muted/35 px-3 py-2 text-sm text-foreground/80">
              <Check size={16} className="text-primary" />Student Wellbeing
            </p>
            <p className="flex items-center gap-2 rounded border border-border/70 bg-muted/35 px-3 py-2 text-sm text-foreground/80">
              <Check size={16} className="text-primary" />Research Culture
            </p>
          </div> */}

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Link
              href="/about"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-6 py-3.5 text-xs font-bold tracking-widest text-primary-foreground uppercase shadow-sm shadow-primary/25 transition-all duration-200 hover:-translate-y-px hover:shadow-md hover:shadow-primary/35 sm:w-auto"
            >
              Read Full Address
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
            {/* <p className="text-sm text-foreground/65">Prof. Judith Larson, Vice Chancellor</p> */}
          </div>
        </article>
      </section>

      <section className="mt-14 bg-muted/40 px-4 py-8 sm:px-5 md:mt-20 md:px-6 md:py-10 lg:px-8">
        <div className="grid gap-8 xl:grid-cols-[1fr_1fr_0.95fr] xl:items-stretch">
          <article className="py-2">
            <SectionHeading
              eyebrow="Come And See Us"
              title="Open"
              accent="Day 2026"
              align="left"
            />
            <p className="mt-5 max-w-md text-sm leading-7 text-foreground/75 sm:text-[16px] sm:leading-8">
              We are an academic residential college made up of students,
              scholars, old collegians and staff members. Our rich history is
              the foundation for our values.
            </p>
            <ul className="mt-5 space-y-3 text-sm text-foreground/80 sm:text-base">
              <li className="flex items-center gap-3">
                <Check size={20} className="text-primary" />
                Saturday, 26 August 2022
              </li>
              <li className="flex items-center gap-3">
                <Check size={20} className="text-primary" />
                9am - 4pm
              </li>
              <li className="flex items-center gap-3">
                <Check size={20} className="text-primary" />
                125 Birmingham, UK
              </li>
            </ul>
            <Link
              href="/admissions"
              className="group mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-8 py-3.5 text-xs font-bold tracking-widest text-primary-foreground uppercase shadow-sm shadow-primary/25 transition-all duration-200 hover:-translate-y-px hover:shadow-md hover:shadow-primary/35 sm:mt-7 sm:w-auto sm:py-4"
            >
              Read More
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </article>

          <article className="relative min-h-64 overflow-hidden rounded-sm md:min-h-80">
            <Image
              src="https://odl.esut.edu.ng/wp-content/uploads/2019/03/video_bg.jpg"
              alt="Open day media"
              fill
              sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
            <button
              type="button"
              onClick={() => setIsVideoOpen(true)}
              aria-label="Play video"
              className="btn-glow group absolute top-1/2 left-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground ring-4 ring-white/25 transition-transform duration-300 ease-out hover:scale-110 md:h-28 md:w-28"
            >
              {/* Expanding halo — reads as a live "play me" beacon */}
              <span
                aria-hidden
                className="absolute inset-0 -z-10 animate-ping rounded-full bg-primary/50"
              />
              <Play
                size={32}
                strokeWidth={2}
                fill="currentColor"
                className="ml-1 md:size-11"
              />
            </button>
          </article>

          <article className="py-2">
            <p className="text-[11px] font-bold tracking-[0.18em] text-primary uppercase">
              Newsroom
            </p>
            <h2 className="mt-3 text-xl leading-tight font-bold tracking-tight text-foreground sm:text-2xl">
              Latest News
            </h2>
            <div className="mt-6 divide-y divide-border">
              {latestNews.map((item) => (
                <div key={item.title} className="py-6 first:pt-0">
                  <h3 className="text-md font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-3 flex items-center gap-3 text-base text-foreground/75 sm:mt-4 sm:text-lg">
                    <CalendarDays size={20} className="text-primary" />
                    {item.date}
                  </p>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section
        className="relative mt-14 overflow-hidden bg-scroll md:mt-20 md:bg-fixed"
        style={{
          backgroundImage: "url(/students-studying-together.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-black/70 dark:bg-black/80" />
        <div className="relative grid gap-8 md:grid-cols-2 md:gap-0">
          {/* Left – descriptive text */}
          <div className="flex flex-col items-center justify-center px-6 py-12 text-center text-white sm:px-8 md:px-10 md:py-16">
            <p className="text-sm leading-7 text-white/85 sm:text-base sm:leading-8">
              We are an academic residential college made up of
              students,scholars, old collegians and staff members. Our rich
              history is the foundation.
            </p>
            <p className="mt-5 text-sm leading-7 text-white/85 sm:mt-6 sm:text-base sm:leading-8">
              We are diverse, welcoming, accepting and passionate about being
              the best we can be. Join us to make your college experience
              unforgettable.
            </p>
            <p className="mt-7 font-serif text-3xl text-white/90 italic sm:mt-8 sm:text-4xl">
              Solomon King
            </p>
          </div>

          {/* Right – events list */}
          <div className="px-6 py-12 text-white sm:px-8 md:px-10 md:py-16">
            <SectionHeading
              eyebrow="Upcoming"
              title="New Events"
              align="left"
              tone="onDark"
            />
            <div className="mt-8 divide-y divide-white/20">
              {newEvents.map((event) => (
                <div
                  key={event.title}
                  className="flex flex-col gap-4 py-6 first:pt-0 sm:flex-row sm:gap-5"
                >
                  <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-sm bg-primary text-primary-foreground sm:h-24 sm:w-24">
                    <span className="text-3xl leading-none font-bold sm:text-4xl">
                      {event.day}
                    </span>
                    <span className="mt-1 text-xs">{event.monthYear}</span>
                  </div>
                  <div className="flex flex-col justify-center">
                    <h3 className="text-base font-semibold sm:text-lg">
                      {event.title}
                    </h3>
                    <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/75">
                      <span className="flex items-center gap-1.5">
                        <Clock size={14} />
                        {event.time}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin size={14} />
                        {event.location}
                      </span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-10 md:mt-12">
        <div className="grid grid-cols-2 gap-y-8 rounded-md border border-border/70 bg-muted/30 px-4 py-8 text-center md:grid-cols-4 md:gap-y-0 md:divide-x md:divide-border">
          {stats.map((stat) => (
            <div key={stat.label} className="px-2">
              <p className="text-4xl font-bold tracking-tight text-primary sm:text-5xl">
                {stat.value}
              </p>
              <p className="mt-2 text-[11px] font-bold tracking-[0.16em] text-foreground/60 uppercase">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto my-14 w-full max-w-6xl md:my-20 md:w-[80%]">
        <div className="mb-10">
          <SectionHeading
            eyebrow="The Difference"
            title="Why Choose"
            accent="Us?"
            subtitle="A choice that makes the difference."
          />
        </div>

        <div className="relative">
          <button
            type="button"
            aria-label="Previous slide"
            className="why-choose-prev absolute top-1/2 left-2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/65 md:left-3 md:h-11 md:w-11"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            aria-label="Next slide"
            className="why-choose-next absolute top-1/2 right-2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/65 md:right-3 md:h-11 md:w-11"
          >
            <ChevronRight size={20} />
          </button>

          <Swiper
            modules={[Autoplay, Navigation, Pagination]}
            navigation={{
              prevEl: ".why-choose-prev",
              nextEl: ".why-choose-next",
            }}
            pagination={{ clickable: true }}
            loop
            speed={700}
            autoplay={{ delay: 3800, disableOnInteraction: false }}
            className="why-choose-swiper overflow-hidden rounded-sm"
          >
            {chooseUs.map((item, index) => (
              <SwiperSlide key={item.text}>
                <article className="relative h-90 overflow-hidden md:h-115">
                  <div className="grid h-full gap-px bg-border md:grid-cols-[4fr_1.35fr]">
                    <div className="relative h-full overflow-hidden">
                      <Image
                        src={item.image}
                        alt={`Why choose us ${index + 1} main`}
                        fill
                        sizes="(min-width: 768px) 70vw, 100vw"
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/35 to-black/10" />
                      <div className="absolute right-0 bottom-0 left-0 p-4 sm:p-6 md:p-10">
                        <p className="text-4xl leading-none font-bold text-white sm:text-5xl md:text-7xl">
                          {String(index + 1).padStart(2, "0")}
                        </p>
                        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/95 sm:mt-4 sm:text-base sm:leading-7 md:text-2xl md:leading-10">
                          {item.text}
                        </p>
                      </div>
                    </div>
                    <div className="relative hidden h-full overflow-hidden sm:block">
                      <Image
                        src={item.sideImage}
                        alt={`Why choose us ${index + 1} side`}
                        fill
                        sizes="(min-width: 768px) 22vw, 30vw"
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/15" />
                    </div>
                  </div>
                </article>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </section>

      <section className="mt-14 md:my-20">
        <SectionHeading
          eyebrow="Where They Are Now"
          title="Outstanding"
          accent="Alumni"
          subtitle="Your experience does not stop when you graduate."
        />

        <div className="relative mt-8">
          <button
            type="button"
            aria-label="Previous alumni slide"
            className="alumni-prev absolute top-1/2 left-0 z-10 inline-flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-border bg-background/95 text-foreground transition hover:bg-muted md:-left-1 md:h-10 md:w-10"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            aria-label="Next alumni slide"
            className="alumni-next absolute top-1/2 right-0 z-10 inline-flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-border bg-background/95 text-foreground transition hover:bg-muted md:-right-1 md:h-10 md:w-10"
          >
            <ChevronRight size={18} />
          </button>

          <Swiper
            modules={[Autoplay, Navigation, Pagination]}
            navigation={{ prevEl: ".alumni-prev", nextEl: ".alumni-next" }}
            pagination={{ clickable: true }}
            loop
            speed={650}
            spaceBetween={20}
            autoplay={{ delay: 4200, disableOnInteraction: false }}
            breakpoints={{
              0: { slidesPerView: 1 },
              640: { slidesPerView: 2 },
              1024: { slidesPerView: 3 },
            }}
            className="alumni-swiper my-8 px-10 md:mt-8 md:px-12"
          >
            {outstandingAlumni.map((alumni) => (
              <SwiperSlide key={alumni.name}>
                <article className="group px-3 text-center md:px-4">
                  <div className="relative mx-auto h-40 w-40 sm:h-44 sm:w-44">
                    <Image
                      src={alumni.image}
                      alt={alumni.name}
                      fill
                      sizes="176px"
                      className="rounded-full border-4 border-muted object-cover transition-colors duration-300 group-hover:border-primary/45"
                    />
                  </div>
                  <p className="mt-5 text-lg font-bold tracking-tight text-foreground">
                    {alumni.name}
                  </p>
                  <p className="mt-1.5 text-[11px] font-bold tracking-[0.16em] text-primary uppercase">
                    {alumni.program}
                  </p>
                  <p className="my-12 text-sm leading-7 text-foreground/70">
                    &quot;{alumni.quote}&quot;
                  </p>
                </article>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </section>

      <section className="mt-14 rounded-sm bg-muted/35 px-4 py-10 sm:px-6 md:mt-20 md:px-10 md:py-12">
        <SectionHeading
          eyebrow="Global Standing"
          title="Our World University"
          accent="Rankings"
          subtitle="We have achieved an enviable reputation for research and teaching excellence."
        />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {rankings.map((item) => (
            <article
              key={item.rank + item.label}
              className="group flex items-start gap-4 rounded-md border border-border/60 bg-background/60 p-5 transition-colors duration-300 hover:border-primary/40 sm:gap-5"
            >
              <div className="shrink-0 text-foreground/30 transition-colors duration-300 group-hover:text-primary">
                <RankingIcon type={item.icon} />
              </div>
              <div>
                <p className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">
                  {item.rank}
                </p>
                <p className="mt-1.5 text-sm leading-6 text-foreground/65">
                  {item.label}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-14 rounded-sm px-4 py-10 sm:px-6 md:mt-20 md:px-10 md:py-12">
        <SectionHeading
          eyebrow="Campus And Resources"
          title="Our"
          accent="Facilities"
          subtitle="We offer world-class facilities."
        />
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {facilities.map((facility) => (
            <article
              key={facility.title}
              className="group relative h-56 overflow-hidden rounded-md sm:h-64"
            >
              <Image
                src={facility.image}
                alt={facility.title}
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/25 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5">
                <span
                  aria-hidden
                  className="mb-3 block h-0.5 w-8 origin-left scale-x-0 rounded-full bg-primary transition-transform duration-300 ease-out group-hover:scale-x-100"
                />
                <h3 className="text-lg font-bold tracking-wide text-white uppercase sm:text-xl">
                  {facility.title}
                </h3>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-14 rounded-sm bg-muted/35 px-4 py-10 sm:px-6 md:mt-20 md:px-10 md:py-14">
        <SectionHeading
          eyebrow="Testimonials"
          title="What People"
          accent="Say"
          subtitle="What students and graduates say about learning with us."
        />

        <div className="mx-auto mt-10 max-w-4xl">
          <div className="flex items-center justify-start gap-3 overflow-x-auto pb-2 sm:justify-center sm:gap-4">
            {testimonials.map((person, index) => {
              const isActive = index === selectedTestimonialIndex
              return (
                <button
                  key={person.name}
                  type="button"
                  onClick={() => setSelectedTestimonialIndex(index)}
                  className={`relative cursor-pointer rounded-full p-1 transition-all ${isActive ? "ring-2 ring-primary" : "opacity-70 hover:opacity-100"}`}
                  aria-label={`Show testimonial from ${person.name}`}
                >
                  <span className="relative block h-14 w-14 sm:h-16 sm:w-16">
                    <Image
                      src={person.avatar}
                      alt={person.name}
                      fill
                      sizes="64px"
                      className="rounded-full object-cover"
                    />
                  </span>
                  {isActive ? (
                    <span className="absolute -top-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Quote size={14} />
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>

          <div className="my-12 text-center">
            <p className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {testimonials[selectedTestimonialIndex].name}
            </p>
            <p className="mt-2 text-[11px] font-bold tracking-[0.16em] text-primary uppercase">
              {testimonials[selectedTestimonialIndex].role}
            </p>
            <p className="mx-auto mt-5 max-w-4xl text-base leading-7 text-foreground/70 sm:mt-6 sm:text-lg sm:leading-8 md:text-[20px] md:leading-10">
              &quot; {testimonials[selectedTestimonialIndex].text} &quot;
            </p>
          </div>
        </div>
      </section>

      {isVideoOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="relative w-full max-w-4xl rounded bg-background p-2 shadow-xl">
            <button
              type="button"
              onClick={() => setIsVideoOpen(false)}
              className="absolute top-2 right-2 rounded-full bg-foreground p-2 text-background md:-top-3 md:-right-3"
              aria-label="Close video"
            >
              <X size={18} />
            </button>

            <div className="aspect-video w-full overflow-hidden rounded">
              <iframe
                className="h-full w-full"
                src={OPEN_DAY_VIDEO_EMBED_URL}
                title="Open Day Video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            <div className="flex justify-end p-2">
              <a
                href={OPEN_DAY_VIDEO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary underline"
              >
                Open on YouTube
              </a>
            </div>
          </div>
        </div>
      ) : null}

      <div
        className="mx-auto mt-14 max-w-4xl rounded-2xl border p-5 sm:p-6 md:mt-12 md:p-8"
        style={{ borderColor: "var(--border)" }}
      >
        <p className="mt-3 text-sm text-foreground/75">
          Subscribe now and receive weekly newsletter with educational
          materials, new courses, interesting posts, popular books and much
          more.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <input
            type="email"
            placeholder="Enter your email"
            className="w-full rounded-lg border px-4 py-2 text-sm"
            style={{
              borderColor: "var(--border)",
              background: "var(--background)",
            }}
          />
          <button
            className="w-full cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground sm:w-auto"
            type="button"
          >
            Subscribe
          </button>
        </div>
      </div>
    </div>
  )
}
