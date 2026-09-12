"use client"
import React from "react"
import Image from "next/image"
import { motion } from "framer-motion"
import { ShieldCheck, Lightbulb, Users, HeartHandshake } from "lucide-react"
import Footer from "@/components/navigation/Footer"
import SectionHeading from "@/components/SectionHeading"
import { UNIVERSITY_NAME } from "@/config/global.config"

const stats = [
  { label: "Years of Excellence", value: "60+" },
  { label: "Enrolled Students", value: "28,000+" },
  { label: "Academic Staff", value: "1,200+" },
  { label: "Research Centres", value: "40+" },
]

const values = [
  {
    title: "Academic Integrity",
    desc: "We uphold the highest standards of honesty and ethical conduct in all scholarly pursuits.",
    icon: ShieldCheck,
  },
  {
    title: "Innovation",
    desc: "We foster creative thinking and cutting-edge research that addresses real-world challenges.",
    icon: Lightbulb,
  },
  {
    title: "Inclusivity",
    desc: "We celebrate diversity and create an environment where all members can thrive.",
    icon: Users,
  },
  {
    title: "Service",
    desc: "We are committed to serving our communities locally, nationally and globally.",
    icon: HeartHandshake,
  },
]

const leadership = [
  {
    name: "Prof. Emmanuel A. Okafor",
    role: "Chancellor",
    bio: "Prof. Okafor brings over 35 years of distinguished academic and administrative leadership. A Fellow of the Nigerian Academy of Science, he has published more than 120 peer-reviewed papers.",
    avatar: "/professors/professor1.jpg",
  },
  {
    name: "Prof. Ngozi M. Adeleke",
    role: "Vice-Chancellor",
    bio: "Prof. Adeleke oversees the day-to-day running of the university. Her tenure has been marked by a 40% increase in research output and the establishment of three new interdisciplinary institutes.",
    avatar: "/professors/professor2.jpg",
  },
  {
    name: "Dr. Chukwuemeka B. Nwosu",
    role: "Registrar",
    bio: "Dr. Nwosu administers academic records, student admissions, and institutional governance. He has modernised the registry with a fully digital records management system.",
    avatar: "/professors/professor3.jpg",
  },
  {
    name: "Barr. Fatima I. Yusuf",
    role: "Bursar",
    bio: "Barr. Yusuf manages the financial affairs of the university, ensuring transparent stewardship of resources and sustainable budget planning.",
    avatar: "/professors/professor4.jpg",
  },
  {
    name: "Prof. Kelechi O. Eze",
    role: "Dean, Faculty of Sciences",
    bio: "An internationally recognised molecular biologist, Prof. Eze leads one of the largest faculties by enrolment and has secured over ₦2 billion in research grants.",
    avatar: "/professors/professor5.jpg",
  },
  {
    name: "Prof. Amaka C. Obiora",
    role: "Dean, Faculty of Arts & Humanities",
    bio: "Prof. Obiora is a celebrated scholar of African literature whose faculty runs some of the most competitive postgraduate programmes in the region.",
    avatar: "/professors/professor6.jpg",
  },
]

const milestones = [
  { year: "1964", event: "University founded by Federal Government Decree" },
  { year: "1972", event: "First postgraduate programmes established" },
  { year: "1985", event: "Teaching hospital and medical school commissioned" },
  { year: "1998", event: "Campus-wide ICT infrastructure rollout" },
  { year: "2007", event: "Centre for Advanced Research (CAR) inaugurated" },
  { year: "2015", event: "Ranked among top 10 African universities" },
  { year: "2021", event: "Launch of fully online degree programme platform" },
  { year: "2024", event: "Qhub digital student portal goes live" },
]

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.45, ease: "easeOut" as const, delay },
})

export default function AboutPage() {
  return (
    <div>
      {/* Hero */}
      <section
        className="relative overflow-hidden bg-stone-900 px-4 py-24 md:py-28"
        style={{
          backgroundImage: "url(/students-studying-together.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "top",
        }}
      >
        {/* Legibility scrim */}
        <div className="absolute inset-0 bg-black/70" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp(0)} className="flex items-center gap-3">
            <span aria-hidden className="h-0.5 w-10 rounded-full bg-primary" />
            <p className="text-[11px] font-bold tracking-[0.18em] text-white/80 uppercase">
              About the University
            </p>
          </motion.div>

          <motion.h1
            {...fadeUp(0.08)}
            className="mt-6 max-w-3xl text-4xl leading-[1.05] font-bold tracking-tight text-white sm:text-5xl lg:text-6xl"
          >
            Shaping minds.
            <br />
            <span className="text-primary">Transforming futures.</span>
          </motion.h1>

          <motion.p
            {...fadeUp(0.16)}
            className="mt-6 max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg"
          >
            {`For over six decades ${UNIVERSITY_NAME} has been a beacon of academic excellence, producing graduates who lead in every sector of society. We are driven by curiosity, guided by integrity and committed to service.`}
          </motion.p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Stats */}
        <section className="py-16">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                {...fadeUp(i * 0.07)}
                className="rounded-xl border border-border bg-card p-6 text-center transition-colors duration-300 hover:border-primary/40"
              >
                <div className="text-4xl font-bold tracking-tight text-primary">
                  {s.value}
                </div>
                <div className="mt-2 text-[11px] font-bold tracking-[0.16em] text-foreground/60 uppercase">
                  {s.label}
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Mission & Vision */}
        <section className="grid gap-6 py-10 md:grid-cols-2">
          <motion.div
            {...fadeUp(0)}
            className="relative overflow-hidden rounded-xl border border-border bg-card p-8"
          >
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 w-1 bg-primary"
            />
            <p className="text-[11px] font-bold tracking-[0.18em] text-primary uppercase">
              Our Mission
            </p>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              To advance knowledge through innovative research and teaching; to
              equip students with the intellectual tools, ethical grounding and
              practical skills they need to thrive; and to engage communities in
              meaningful partnerships that drive sustainable development.
            </p>
          </motion.div>
          <motion.div
            {...fadeUp(0.08)}
            className="relative overflow-hidden rounded-xl border border-border bg-card p-8"
          >
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 w-1 bg-primary"
            />
            <p className="text-[11px] font-bold tracking-[0.18em] text-primary uppercase">
              Our Vision
            </p>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {`To be a world-class institution renowned for excellence in education, transformative research and impactful community engagement — recognised as Africa's foremost university by 2030.`}
            </p>
          </motion.div>
        </section>

        {/* Core Values */}
        <section className="py-10">
          <motion.div {...fadeUp()}>
            <SectionHeading
              eyebrow="What We Stand For"
              title="Core"
              accent="Values"
              align="left"
              className="mb-8"
            />
          </motion.div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((v, i) => (
              <motion.div
                key={v.title}
                {...fadeUp(i * 0.07)}
                whileHover={{ translateY: -5 }}
                className="group rounded-xl border border-border bg-card p-5 transition-colors duration-300 hover:border-primary/40"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 transition-colors duration-300 group-hover:bg-primary">
                  <v.icon
                    size={20}
                    strokeWidth={1.8}
                    className="text-primary transition-colors duration-300 group-hover:text-primary-foreground"
                  />
                </div>
                <h3 className="text-sm font-bold tracking-tight">{v.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {v.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* History Timeline */}
        <section className="py-10">
          <motion.div {...fadeUp()}>
            <SectionHeading
              eyebrow="Six Decades In"
              title="Our"
              accent="History"
              align="left"
              className="mb-8"
            />
          </motion.div>
          <div className="relative border-l-2 border-border">
            {milestones.map((m, i) => (
              <motion.div
                key={m.year}
                {...fadeUp(i * 0.05)}
                className="group relative mb-7 ml-6"
              >
                <span className="absolute top-1 -left-[2.15rem] h-4 w-4 rounded-full border-2 border-background bg-primary transition-transform duration-300 group-hover:scale-125" />
                <div className="text-xs font-bold tracking-[0.16em] text-primary">
                  {m.year}
                </div>
                <div className="mt-1 text-sm text-foreground">{m.event}</div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Leadership Team */}
        <section className="py-10">
          <motion.div {...fadeUp()}>
            <SectionHeading
              eyebrow="Who Leads Us"
              title="University"
              accent="Leadership"
              subtitle="Our leadership team brings together decades of academic, administrative and strategic expertise."
              align="left"
              className="mb-8"
            />
          </motion.div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {leadership.map((l, i) => (
              <motion.div
                key={l.name}
                {...fadeUp(i * 0.07)}
                whileHover={{ translateY: -5 }}
                className="group rounded-xl border border-border bg-card p-6 transition-colors duration-300 hover:border-primary/40"
              >
                <Image
                  src={l.avatar}
                  alt={l.name}
                  width={72}
                  height={72}
                  className="mb-4 h-18 w-18 rounded-full object-cover ring-2 ring-border grayscale transition-all duration-500 group-hover:ring-primary/50 group-hover:grayscale-0"
                />
                <h3 className="text-sm font-bold tracking-tight">{l.name}</h3>
                <div className="mt-1 text-[11px] font-bold tracking-[0.16em] text-primary uppercase">
                  {l.role}
                </div>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  {l.bio}
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
