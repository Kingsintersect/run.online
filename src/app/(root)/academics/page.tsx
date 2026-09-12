"use client"
import React, { useState } from "react"
import { motion } from "framer-motion"
import {
  Building2,
  ScrollText,
  Users,
  Library,
  BookOpen,
  Scale,
  HeartPulse,
  Cpu,
} from "lucide-react"
import Footer from "@/components/navigation/Footer"

const faculties = [
  {
    name: "Faculty of Sciences",
    departments: [
      "Biochemistry",
      "Chemistry",
      "Computer Science",
      "Mathematics",
      "Microbiology",
      "Physics",
      "Statistics",
    ],
    programmes: 14,
    students: 4200,
  },
  {
    name: "Faculty of Engineering",
    departments: [
      "Chemical Engineering",
      "Civil Engineering",
      "Electrical & Electronics",
      "Mechanical Engineering",
      "Petroleum Engineering",
    ],
    programmes: 10,
    students: 3900,
  },
  {
    name: "Faculty of Arts & Humanities",
    departments: [
      "English & Literary Studies",
      "French",
      "History & International Studies",
      "Linguistics",
      "Philosophy",
      "Theatre Arts",
    ],
    programmes: 12,
    students: 2800,
  },
  {
    name: "Faculty of Social Sciences",
    departments: [
      "Economics",
      "Geography",
      "Mass Communication",
      "Political Science",
      "Psychology",
      "Sociology",
    ],
    programmes: 12,
    students: 3100,
  },
  {
    name: "Faculty of Law",
    departments: [
      "Business & Commercial Law",
      "International Law",
      "Private Law",
      "Public Law",
    ],
    programmes: 5,
    students: 1500,
  },
  {
    name: "College of Medicine",
    departments: [
      "Anatomy",
      "Medicine & Surgery",
      "Nursing",
      "Optometry",
      "Pharmacology",
      "Physiology",
    ],
    programmes: 10,
    students: 2200,
  },
  {
    name: "Faculty of Education",
    departments: [
      "Curriculum Studies",
      "Educational Administration",
      "Guidance & Counselling",
      "Science Education",
    ],
    programmes: 8,
    students: 1800,
  },
  {
    name: "Faculty of Agriculture",
    departments: [
      "Agricultural Economics",
      "Animal Science",
      "Crop Science",
      "Fisheries",
      "Forestry & Environment",
    ],
    programmes: 10,
    students: 1600,
  },
]

const highlights = [
  { label: "Total Faculties", value: "14", icon: Building2 },
  { label: "Accredited Programmes", value: "255+", icon: ScrollText },
  { label: "Full-time Academic Staff", value: "1,200+", icon: Users },
  { label: "Library Volumes", value: "500,000+", icon: Library },
]

const calendar = [
  { period: "First Semester", start: "September 8", end: "January 17" },
  { period: "First Semester Exams", start: "January 20", end: "February 7" },
  { period: "Inter-semester Break", start: "February 8", end: "February 21" },
  { period: "Second Semester", start: "February 24", end: "June 20" },
  { period: "Second Semester Exams", start: "June 23", end: "July 11" },
  { period: "Long Vacation", start: "July 14", end: "September 7" },
]

const libraries = [
  {
    name: "Central University Library",
    desc: "Over 300,000 volumes, e-journals, digital archives and 24-hour study facilities.",
    icon: BookOpen,
  },
  {
    name: "Law Library",
    desc: "Specialist legal resources, law reports, statutes and online legal databases.",
    icon: Scale,
  },
  {
    name: "Medical Library",
    desc: "Clinical and biomedical resources, anatomy models and simulation suites.",
    icon: HeartPulse,
  },
  {
    name: "Engineering Resource Centre",
    desc: "Technical journals, patent databases, CAD labs and project repositories.",
    icon: Cpu,
  },
]

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.45, ease: "easeOut" as const, delay },
})

export default function AcademicsPage() {
  const [expanded, setExpanded] = useState<number | null>(null)

  return (
    <div>
      {/* Hero */}
      <section
        className="relative overflow-hidden bg-stone-900 px-4 py-24 md:py-28"
        style={{
          backgroundImage: "url(/teacher.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "top",
        }}
      >
        <div className="absolute inset-0 bg-black/70" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp(0)} className="flex items-center gap-3">
            <span aria-hidden className="h-0.5 w-10 rounded-full bg-primary" />
            <p className="text-[11px] font-bold tracking-[0.18em] text-white/80 uppercase">
              Academics
            </p>
          </motion.div>
          <motion.h1
            {...fadeUp(0.08)}
            className="mt-6 max-w-3xl text-4xl leading-[1.05] font-bold tracking-tight text-white sm:text-5xl lg:text-6xl"
          >
            Excellence in
            <br />
            <span className="text-primary">teaching &amp; learning.</span>
          </motion.h1>
          <motion.p
            {...fadeUp(0.16)}
            className="mt-6 max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg"
          >
            Our academic programmes span 14 faculties and over 255 accredited
            courses at undergraduate, postgraduate and professional levels — all
            designed to challenge, inspire and equip.
          </motion.p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Stats */}
        <section className="py-16">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {highlights.map((h, i) => (
              <motion.div
                key={h.label}
                {...fadeUp(i * 0.07)}
                className="rounded-xl border p-6 text-center"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--card)",
                }}
              >
                <div
                  className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{
                    background:
                      "color-mix(in oklch, var(--primary) 15%, transparent)",
                  }}
                >
                  <h.icon
                    size={20}
                    style={{ color: "var(--primary)" }}
                    strokeWidth={1.8}
                  />
                </div>
                <div
                  className="mb-1 text-3xl font-bold"
                  style={{ color: "var(--primary)" }}
                >
                  {h.value}
                </div>
                <div
                  className="text-sm"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {h.label}
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Faculties */}
        <section className="py-10">
          <motion.h2 {...fadeUp()} className="mb-2 text-2xl font-bold">
            Faculties & Departments
          </motion.h2>
          <motion.p
            {...fadeUp(0.06)}
            className="mb-8 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            Click a faculty card to view its constituent departments.
          </motion.p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {faculties.map((f, i) => (
              <motion.div
                key={f.name}
                {...fadeUp(i * 0.05)}
                className="cursor-pointer overflow-hidden rounded-xl border"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--card)",
                }}
                onClick={() => setExpanded(expanded === i ? null : i)}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold">{f.name}</h3>
                    <motion.span
                      animate={{ rotate: expanded === i ? 45 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs text-white"
                      style={{ background: "var(--primary)" }}
                    >
                      +
                    </motion.span>
                  </div>
                  <div className="mt-3 flex gap-4">
                    <span
                      className="text-xs"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {f.programmes} programmes
                    </span>
                    <span
                      className="text-xs"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {f.students.toLocaleString()} students
                    </span>
                  </div>
                </div>
                <motion.div
                  initial={false}
                  animate={{
                    height: expanded === i ? "auto" : 0,
                    opacity: expanded === i ? 1 : 0,
                  }}
                  transition={{ duration: 0.25 }}
                  style={{ overflow: "hidden" }}
                >
                  <div
                    className="border-t px-5 pb-5"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <p
                      className="mt-3 mb-2 text-xs font-semibold"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      Departments
                    </p>
                    <ul className="space-y-1">
                      {f.departments.map((d) => (
                        <li
                          key={d}
                          className="flex items-center gap-1.5 text-xs"
                        >
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ background: "var(--primary)" }}
                          />
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Academic Calendar */}
        <section className="py-10">
          <motion.h2 {...fadeUp()} className="mb-8 text-2xl font-bold">
            Academic Calendar
          </motion.h2>
          <div
            className="overflow-hidden rounded-xl border"
            style={{ borderColor: "var(--border)" }}
          >
            <div
              className="grid grid-cols-3 border-b px-6 py-3 text-xs font-semibold"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--muted)",
                color: "var(--muted-foreground)",
              }}
            >
              <span>Period</span>
              <span>Start Date</span>
              <span>End Date</span>
            </div>
            {calendar.map((c, i) => (
              <motion.div
                key={c.period}
                {...fadeUp(i * 0.04)}
                className="grid grid-cols-3 border-b px-6 py-4 text-sm last:border-b-0"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: i % 2 === 0 ? "var(--card)" : "transparent",
                }}
              >
                <span className="font-medium">{c.period}</span>
                <span style={{ color: "var(--muted-foreground)" }}>
                  {c.start}
                </span>
                <span style={{ color: "var(--muted-foreground)" }}>
                  {c.end}
                </span>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Libraries */}
        <section className="mb-8 py-10">
          <motion.h2 {...fadeUp()} className="mb-8 text-2xl font-bold">
            Libraries & Learning Resources
          </motion.h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {libraries.map((l, i) => (
              <motion.div
                key={l.name}
                {...fadeUp(i * 0.07)}
                whileHover={{ translateY: -5 }}
                className="rounded-xl border p-6"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--card)",
                }}
              >
                <div
                  className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{
                    background:
                      "color-mix(in oklch, var(--primary) 15%, transparent)",
                  }}
                >
                  <l.icon
                    size={20}
                    style={{ color: "var(--primary)" }}
                    strokeWidth={1.8}
                  />
                </div>
                <h3 className="mb-2 text-sm font-bold">{l.name}</h3>
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {l.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </section>
      </div>

      <Footer />
    </div>
  )
}
