"use client"
import React from "react"
import { motion } from "framer-motion"
import {
  GraduationCap,
  BookOpen,
  Briefcase,
  Monitor,
  Search,
  ClipboardList,
  UploadCloud,
  Bell,
  MailCheck,
  CalendarCheck,
  ArrowUpRight,
  Sparkles,
  ArrowRight,
} from "lucide-react"
import Footer from "@/components/navigation/Footer"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { OUR_PROGRAMS, UNIVERSITY_NAME } from "@/config/global.config"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { GlowingButton } from "@/components/ui/glowing-button"

const steps = [
  {
    step: "01",
    title: "Choose a Programme",
    desc: "Browse our undergraduate, postgraduate and professional programmes and select the one that best aligns with your goals.",
    icon: Search,
  },
  {
    step: "02",
    title: "Check Requirements",
    desc: "Review the entry requirements for your chosen programme including academic qualifications, language proficiency and supporting documents.",
    icon: ClipboardList,
  },
  {
    step: "03",
    title: "Submit Application",
    desc: "Complete the online application form through the student portal, upload all required documents and pay the application fee.",
    icon: UploadCloud,
  },
  {
    step: "04",
    title: "Track Your Status",
    desc: "Log in to the portal to monitor your application status and respond promptly to any requests for additional information.",
    icon: Bell,
  },
  {
    step: "05",
    title: "Receive Offer",
    desc: "Successful applicants will receive an offer letter via email. Accept your offer and pay the acceptance fee within the stated deadline.",
    icon: MailCheck,
  },
  {
    step: "06",
    title: "Enrol & Register",
    desc: "Complete online registration for your courses during the designated registration period before the start of semester.",
    icon: CalendarCheck,
  },
]

const programCategoryIcons = {
  "Distance Learning Programs": Monitor,
  "Undergraduate Programs": GraduationCap,
  "Postgraduate Programs": BookOpen,
  "Business School Programs": Briefcase,
  "Professional Courses": Briefcase,
  "Certificate Programs": BookOpen,
  "Diploma Programs": GraduationCap,
  "Online Courses": Monitor,
} as const

const programCategoryDescriptions = {
  "Distance Learning Programs":
    "Flexible online degree options designed for remote learners.",
  "Undergraduate Programs":
    "Foundational and advanced bachelor programmes across faculties.",
  "Postgraduate Programs":
    "Masters and doctorate programmes for academic growth.",
  "Business School Programs":
    "Business and management pathways for future leaders.",
  "Professional Courses":
    "Industry-focused tracks designed for career advancement.",
  "Certificate Programs": "Short focused programmes with practical outcomes.",
  "Diploma Programs":
    "Structured diploma options with strong practical orientation.",
  "Online Courses":
    "Self-paced online learning programmes with guided modules.",
} as const

const programCatalogByCategory: Record<string, string[]> = {
  "Distance Learning Programs": [
    "B.Sc. Computer Science (Distance)",
    "B.Sc. Accounting (Distance)",
    "B.Sc. Economics (Distance)",
    "B.Sc. Mass Communication (Distance)",
    "B.Sc. Public Administration (Distance)",
  ],
  "Undergraduate Programs": [
    "B.Sc. Computer Science",
    "B.Sc. Accounting",
    "B.Sc. Biochemistry",
    "B.Eng. Electrical Engineering",
    "LL.B Law",
  ],
  "Postgraduate Programs": [
    "M.Sc. Data Science",
    "M.Sc. Finance",
    "MBA",
    "M.Ed. Educational Management",
    "Ph.D. Computer Science",
  ],
  "Business School Programs": [
    "Executive MBA",
    "MBA (Weekend)",
    "Postgraduate Diploma in Management",
    "M.Sc. Business Analytics",
  ],
  "Professional Courses": [
    "Project Management Professional Prep",
    "Digital Marketing Professional",
    "HR Management Professional",
    "Financial Modeling & Valuation",
  ],
  "Certificate Programs": [
    "Certificate in Data Analysis",
    "Certificate in Cybersecurity Basics",
    "Certificate in Product Design",
    "Certificate in Public Speaking",
  ],
  "Diploma Programs": [
    "Diploma in Software Engineering",
    "Diploma in Public Administration",
    "Diploma in Accounting",
    "Diploma in International Relations",
  ],
  "Online Courses": [
    "Introduction to Programming",
    "Entrepreneurship Essentials",
    "Academic Writing Masterclass",
    "Career Readiness Toolkit",
  ],
}

const requirements = [
  {
    category: "Undergraduate",
    items: [
      "Minimum 5 O-Level credits including English & Maths",
      "JAMB/UTME score of 200 and above",
      "Post-UTME screening score",
      "Two reference letters",
      "Birth certificate or equivalent",
    ],
  },
  {
    category: "Postgraduate",
    items: [
      "Relevant bachelor's degree (minimum 2nd class lower)",
      "Transcripts from previous institution",
      "Statement of purpose (500–800 words)",
      "Two academic reference letters",
      "Evidence of relevant work experience (where applicable)",
    ],
  },
]

const dates = [
  { event: "Application portal opens", date: "February 1" },
  { event: "Undergraduate application deadline", date: "April 30" },
  { event: "Post-UTME screening", date: "June 10 – 20" },
  { event: "Admission letters released", date: "July 15" },
  { event: "Acceptance fee deadline", date: "August 5" },
  { event: "Course registration opens", date: "August 20" },
  { event: "First semester begins", date: "September 8" },
  { event: "Postgraduate application deadline", date: "October 31" },
]

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.45, ease: "easeOut" as const, delay },
})

export default function AdmissionsPage() {
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(
    null
  )
  const [isProgramsDrawerOpen, setIsProgramsDrawerOpen] = React.useState(false)

  const programmeCategories = React.useMemo(
    () =>
      Object.entries(OUR_PROGRAMS).map(([category, isFeatured]) => {
        const list = programCatalogByCategory[category] ?? []
        return {
          category,
          isFeatured,
          programs: list,
          count: `${list.length}+ programmes`,
          desc:
            programCategoryDescriptions[
              category as keyof typeof programCategoryDescriptions
            ] ?? "Explore available programmes and choose your preferred path.",
          icon:
            programCategoryIcons[
              category as keyof typeof programCategoryIcons
            ] ?? GraduationCap,
        }
      }),
    []
  )

  const selectedPrograms = selectedCategory
    ? (programCatalogByCategory[selectedCategory] ?? [])
    : []

  const openProgramsDrawer = (category: string) => {
    setSelectedCategory(category)
    setIsProgramsDrawerOpen(true)
  }

  return (
    <div>
      {/* Hero */}
      <section
        className="relative overflow-hidden px-4 py-20"
        style={{
          backgroundImage: "url(/community.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-black/70" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp(0)} className="flex items-center gap-3">
            <span aria-hidden className="h-0.5 w-10 rounded-full bg-primary" />
            <p className="text-[11px] font-bold tracking-[0.18em] text-white/80 uppercase">
              Admissions
            </p>
          </motion.div>

          <motion.h1
            {...fadeUp(0.08)}
            className="mt-6 max-w-3xl text-4xl leading-[1.05] font-bold tracking-tight text-white sm:text-5xl lg:text-6xl"
          >
            Your place here
            <br />
            <span className="text-primary">starts with one form.</span>
          </motion.h1>

          <motion.p
            {...fadeUp(0.16)}
            className="mt-6 max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg"
          >
            {`Joining ${UNIVERSITY_NAME} is the first step towards a world-class education. We welcome applications from talented students of all backgrounds — here is everything you need to know.`}
          </motion.p>

          {/* <motion.p {...fadeUp(0.16)} className="text-base sm:text-lg leading-relaxed max-w-2xl mx-auto text-white/80">
                        Joining the University of Example is the first step towards a world-class education. We welcome applications from talented students of all backgrounds. Here is everything you need to know.
                    </motion.p> */}
          {/* <motion.div {...fadeUp(0.22)} className="mt-8 flex flex-wrap justify-center gap-4">
                        <a
                            href="/student-portal"
                            className="inline-flex items-center px-6 py-3 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
                            style={{ background: 'var(--primary)' }}
                        >
                            Apply Now
                        </a>
                        <a
                            href="#how-to-apply"
                            className="inline-flex items-center px-6 py-3 rounded-lg text-sm font-semibold border border-white/30 text-white hover:bg-white/10 transition-colors"
                        >
                            How to Apply
                        </a>
                    </motion.div> */}
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Programmes overview */}
        <section className="py-16">
          <div className="flex items-center justify-between">
            <div className="">
              <motion.h2 {...fadeUp()} className="mb-2 text-2xl font-bold">
                Programmes of Study
              </motion.h2>
              <motion.p
                {...fadeUp(0.06)}
                className="mb-8 text-sm"
                style={{ color: "var(--muted-foreground)" }}
              >
                Choose from a wide range of nationally and internationally
                accredited programmes.
              </motion.p>
            </div>

            <Link className="inline-flex items-center" href="/auth/signup">
              <GlowingButton size="lg">
                <Sparkles className="h-5 w-5" />
                Get Started
                <ArrowRight className="h-4 w-4" />
              </GlowingButton>
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="-mt-2 mb-1 rounded-lg border border-dashed border-primary/35 bg-primary/8 px-4 py-2 sm:col-span-2 lg:col-span-4">
              <p
                className="text-xs font-medium"
                style={{ color: "var(--muted-foreground)" }}
              >
                Click any programme card to open the full list in a drawer and
                enrol.
              </p>
            </div>
            {programmeCategories.map((p, i) => (
              <motion.div
                key={p.category}
                {...fadeUp(i * 0.07)}
                whileHover={{ translateY: -5 }}
                className="rounded-xl border p-6 transition-colors"
                style={{
                  borderColor: p.isFeatured
                    ? "color-mix(in oklch, var(--primary) 55%, var(--border))"
                    : "var(--border)",
                  backgroundColor: p.isFeatured
                    ? "color-mix(in oklch, var(--primary) 12%, var(--card))"
                    : "var(--card)",
                }}
              >
                <button
                  type="button"
                  onClick={() => openProgramsDrawer(p.category)}
                  className="w-full cursor-pointer text-left"
                >
                  <div
                    className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg"
                    style={{
                      background: p.isFeatured
                        ? "color-mix(in oklch, var(--primary) 28%, transparent)"
                        : "color-mix(in oklch, var(--primary) 15%, transparent)",
                    }}
                  >
                    <p.icon
                      size={20}
                      style={{ color: "var(--primary)" }}
                      strokeWidth={1.8}
                    />
                  </div>
                  <h3 className="mb-1 text-sm font-bold">{p.category}</h3>
                  <div
                    className="mb-3 flex items-center gap-2 text-xs font-semibold"
                    style={{ color: "var(--primary)" }}
                  >
                    <span>{p.count}</span>
                    {p.isFeatured ? (
                      <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] tracking-wide uppercase">
                        Active
                      </span>
                    ) : null}
                  </div>
                  <p
                    className="text-xs leading-relaxed"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {p.desc}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {p.programs.slice(0, 2).map((program) => (
                      <span
                        key={program}
                        className="rounded-full border border-border px-2 py-1 text-[10px]"
                      >
                        {program}
                      </span>
                    ))}
                    {p.programs.length > 2 ? (
                      <span className="rounded-full border border-border px-2 py-1 text-[10px]">
                        +{p.programs.length - 2} more
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-4 inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">
                    <span>Click to view programmes</span>
                    <ArrowUpRight size={12} />
                  </div>
                </button>
              </motion.div>
            ))}
          </div>
        </section>

        <Drawer
          open={isProgramsDrawerOpen}
          onOpenChange={setIsProgramsDrawerOpen}
        >
          <DrawerContent className="h-[88vh] w-screen max-w-none rounded-none sm:rounded-t-2xl">
            <DrawerHeader>
              <DrawerTitle className="text-xl font-bold">
                {selectedCategory ?? "Programmes"}
              </DrawerTitle>
              <DrawerDescription>
                Select a programme and click Enrol to continue to registration.
              </DrawerDescription>
            </DrawerHeader>

            <div className="overflow-y-auto px-4 pb-2">
              <div className="space-y-3">
                {selectedPrograms.map((programName) => (
                  <div
                    key={programName}
                    className="flex flex-col items-start justify-between gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center"
                  >
                    <p className="text-sm font-medium">{programName}</p>
                    <Link
                      href={`/auth/signup?category=${encodeURIComponent(selectedCategory ?? "")}&program=${encodeURIComponent(programName)}`}
                      className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                    >
                      Enrol
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            <DrawerFooter className="border-t">
              <DrawerClose asChild>
                <Button variant="outline">Close</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>

        {/* How to Apply */}
        <section id="how-to-apply" className="py-10">
          <motion.h2 {...fadeUp()} className="mb-8 text-2xl font-bold">
            How to Apply
          </motion.h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {steps.map((s, i) => (
              <motion.div
                key={s.step}
                {...fadeUp(i * 0.06)}
                className="rounded-xl border p-6"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--card)",
                }}
              >
                <div className="mb-4 flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                    style={{
                      background:
                        "color-mix(in oklch, var(--primary) 15%, transparent)",
                    }}
                  >
                    <s.icon
                      size={18}
                      style={{ color: "var(--primary)" }}
                      strokeWidth={1.8}
                    />
                  </div>
                  <span
                    className="text-xs font-bold tracking-widest"
                    style={{ color: "var(--primary)" }}
                  >
                    STEP {s.step}
                  </span>
                </div>
                <h3 className="mb-2 text-sm font-bold">{s.title}</h3>
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {s.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Entry Requirements */}
        <section className="py-10">
          <motion.h2 {...fadeUp()} className="mb-8 text-2xl font-bold">
            Entry Requirements
          </motion.h2>
          <div className="grid gap-6 md:grid-cols-2">
            {requirements.map((r, i) => (
              <motion.div
                key={r.category}
                {...fadeUp(i * 0.08)}
                className="rounded-xl border p-6"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--card)",
                }}
              >
                <h3 className="mb-4 text-base font-bold">{r.category}</h3>
                <ul className="space-y-2">
                  {r.items.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2 text-xs"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      <span
                        className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] text-white"
                        style={{ background: "var(--primary)" }}
                      >
                        ✓
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Key Dates */}
        <section className="py-10">
          <motion.h2 {...fadeUp()} className="mb-8 text-2xl font-bold">
            Key Dates
          </motion.h2>
          <div
            className="overflow-hidden rounded-xl border"
            style={{ borderColor: "var(--border)" }}
          >
            {dates.map((d, i) => (
              <motion.div
                key={d.event}
                {...fadeUp(i * 0.04)}
                className="flex items-center justify-between border-b px-6 py-4 last:border-b-0"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: i % 2 === 0 ? "var(--card)" : "transparent",
                }}
              >
                <span className="text-sm">{d.event}</span>
                <span
                  className="text-sm font-semibold"
                  style={{ color: "var(--primary)" }}
                >
                  {d.date}
                </span>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mb-8 py-12">
          <motion.div
            {...fadeUp()}
            className="rounded-2xl border p-10 text-center"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--card)",
            }}
          >
            <h2 className="mb-3 text-2xl font-bold">Ready to apply?</h2>
            <p
              className="mx-auto mb-6 max-w-xl text-sm"
              style={{ color: "var(--muted-foreground)" }}
            >
              Create your student portal account to start your application. Our
              admissions team is available Monday to Friday, 8 am – 5 pm to
              answer any questions.
            </p>
            {/* <a
                            href="/auth/signup"
                            className="inline-flex items-center px-8 py-3 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
                            style={{ background: 'var(--primary)' }}
                        >
                            Start Application
                        </a> */}
            <Link className="inline-flex items-center" href="/auth/signup">
              {/* Cyan/Violet Variant */}
              <GlowingButton variant="outline">Explore Portal</GlowingButton>

              {/* Glassmorphism */}
              {/* <GlowingButton
                        variant="glass"
                        glowColor="from-emerald-500 via-teal-500 to-cyan-500"
                     >
                        Live Demo
                     </GlowingButton> */}
            </Link>
          </motion.div>
        </section>
      </div>

      <Footer />
    </div>
  )
}
