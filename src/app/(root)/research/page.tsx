"use client"
import React from "react"
import { motion } from "framer-motion"
import {
  FlaskConical,
  BookText,
  Building2,
  FolderKanban,
  Beaker,
  Leaf,
  HeartPulse,
  Cpu,
  Wheat,
  Scale,
} from "lucide-react"
import Footer from "@/components/navigation/Footer"
import { UNIVERSITY_NAME } from "@/config/global.config"

const stats = [
  { value: "₦4.2B+", label: "Research Grants Secured", icon: FlaskConical },
  { value: "3,800+", label: "Publications (last 5 years)", icon: BookText },
  { value: "40+", label: "Research Centres", icon: Building2 },
  { value: "180+", label: "Active Projects", icon: FolderKanban },
]

const centres = [
  {
    name: "Centre for Advanced Research (CAR)",
    focus: "Multidisciplinary",
    desc: "CAR coordinates cross-faculty research initiatives and connects university researchers with national and international funding bodies.",
    projects: 28,
    icon: Beaker,
  },
  {
    name: "Institute for Sustainable Development",
    focus: "Environment & Policy",
    desc: "Investigates climate adaptation, renewable energy, biodiversity conservation and sustainable urban planning across sub-Saharan Africa.",
    projects: 16,
    icon: Leaf,
  },
  {
    name: "Centre for Health Systems Research",
    focus: "Public Health",
    desc: "Partners with government and NGOs to address infectious diseases, maternal health and health system strengthening in low-resource settings.",
    projects: 22,
    icon: HeartPulse,
  },
  {
    name: "Digital Innovation Hub",
    focus: "Technology & AI",
    desc: "Explores artificial intelligence, machine learning, cybersecurity and indigenous language processing to drive Africa's digital future.",
    projects: 19,
    icon: Cpu,
  },
  {
    name: "Agricultural Research Station",
    focus: "Food Security",
    desc: "Develops drought-resistant crop varieties, sustainable soil management techniques and food-processing innovations for rural communities.",
    projects: 14,
    icon: Wheat,
  },
  {
    name: "Law & Governance Institute",
    focus: "Law & Policy",
    desc: "Examines constitutional law, human rights, anti-corruption frameworks and regional integration law across the African Union.",
    projects: 11,
    icon: Scale,
  },
]

const projects = [
  {
    title: "AI-Assisted Diagnosis of Tropical Diseases",
    pi: "Prof. A. Nwobi (College of Medicine)",
    funder: "NIH / AESA",
    status: "Ongoing",
  },
  {
    title: "Cassava Genome Sequencing for Yield Improvement",
    pi: "Dr. B. Eze (Faculty of Agriculture)",
    funder: "TETFUND",
    status: "Ongoing",
  },
  {
    title: "Cybersecurity Framework for Nigerian SMEs",
    pi: "Prof. C. Okonkwo (Faculty of Sciences)",
    funder: "NCC / NITDA",
    status: "Ongoing",
  },
  {
    title: "Solar-Powered Water Purification for Rural Areas",
    pi: "Dr. D. Adesanya (Faculty of Engineering)",
    funder: "World Bank",
    status: "Completed",
  },
  {
    title: "Constitutional Democracy & Electoral Reform",
    pi: "Prof. E. Bello (Law & Governance Institute)",
    funder: "Ford Foundation",
    status: "Ongoing",
  },
  {
    title: "Carbon Sequestration in Nigerian Mangroves",
    pi: "Dr. F. Uche (Institute for Sustainable Development)",
    funder: "UNDP",
    status: "Completed",
  },
]

const partnerships = [
  { org: "Massachusetts Institute of Technology", country: "USA" },
  { org: "University of Edinburgh", country: "UK" },
  { org: "Technical University of Munich", country: "Germany" },
  { org: "University of Cape Town", country: "South Africa" },
  { org: "Makerere University", country: "Uganda" },
  { org: "Peking University", country: "China" },
]

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.45, ease: "easeOut" as const, delay },
})

export default function ResearchPage() {
  return (
    <div>
      {/* Hero */}
      <section
        className="relative overflow-hidden bg-stone-900 px-4 py-24 md:py-28"
        style={{
          backgroundImage: "url(/research.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "top",
        }}
      >
        <div className="absolute inset-0 bg-black/70" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp(0)} className="flex items-center gap-3">
            <span aria-hidden className="h-0.5 w-10 rounded-full bg-primary" />
            <p className="text-[11px] font-bold tracking-[0.18em] text-white/80 uppercase">
              Research &amp; Innovation
            </p>
          </motion.div>
          <motion.h1
            {...fadeUp(0.08)}
            className="mt-6 max-w-3xl text-4xl leading-[1.05] font-bold tracking-tight text-white sm:text-5xl lg:text-6xl"
          >
            Advancing knowledge.
            <br />
            <span className="text-primary">Solving real problems.</span>
          </motion.h1>
          <motion.p
            {...fadeUp(0.16)}
            className="mt-6 max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg"
          >
            {`Research at ${UNIVERSITY_NAME} spans every discipline, from biomedical science to the humanities. Our scholars collaborate with governments, industry and civil society to produce knowledge that makes a difference.`}
          </motion.p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Stats */}
        <section className="py-16">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
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
                  <s.icon
                    size={20}
                    style={{ color: "var(--primary)" }}
                    strokeWidth={1.8}
                  />
                </div>
                <div
                  className="mb-1 text-3xl font-bold"
                  style={{ color: "var(--primary)" }}
                >
                  {s.value}
                </div>
                <div
                  className="text-sm"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {s.label}
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Research Centres */}
        <section className="py-10">
          <motion.h2 {...fadeUp()} className="mb-2 text-2xl font-bold">
            Research Centres & Institutes
          </motion.h2>
          <motion.p
            {...fadeUp(0.06)}
            className="mb-8 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            Our 40+ specialised centres create focused environments where
            breakthrough work happens.
          </motion.p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {centres.map((c, i) => (
              <motion.div
                key={c.name}
                {...fadeUp(i * 0.06)}
                whileHover={{ translateY: -5 }}
                className="rounded-xl border p-6"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--card)",
                }}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div
                    className="inline-block rounded-full px-2.5 py-1 text-xs font-semibold"
                    style={{
                      background:
                        "color-mix(in oklch, var(--primary) 15%, transparent)",
                      color: "var(--primary)",
                    }}
                  >
                    {c.focus}
                  </div>
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-md"
                    style={{
                      background:
                        "color-mix(in oklch, var(--primary) 12%, transparent)",
                    }}
                  >
                    <c.icon
                      size={16}
                      style={{ color: "var(--primary)" }}
                      strokeWidth={1.8}
                    />
                  </div>
                </div>
                <h3 className="mb-2 text-sm font-bold">{c.name}</h3>
                <p
                  className="mb-3 text-xs leading-relaxed"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {c.desc}
                </p>
                <div
                  className="text-xs font-semibold"
                  style={{ color: "var(--primary)" }}
                >
                  {c.projects} active projects
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Featured Projects */}
        <section className="py-10">
          <motion.h2 {...fadeUp()} className="mb-8 text-2xl font-bold">
            Featured Projects
          </motion.h2>
          <div
            className="overflow-hidden rounded-xl border"
            style={{ borderColor: "var(--border)" }}
          >
            <div
              className="hidden grid-cols-4 border-b px-6 py-3 text-xs font-semibold sm:grid"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--muted)",
                color: "var(--muted-foreground)",
              }}
            >
              <span className="col-span-2">Project</span>
              <span>Funder</span>
              <span>Status</span>
            </div>
            {projects.map((p, i) => (
              <motion.div
                key={p.title}
                {...fadeUp(i * 0.04)}
                className="flex flex-col gap-1 border-b px-6 py-4 last:border-b-0 sm:grid sm:grid-cols-4"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: i % 2 === 0 ? "var(--card)" : "transparent",
                }}
              >
                <div className="sm:col-span-2">
                  <div className="text-sm font-medium">{p.title}</div>
                  <div
                    className="mt-0.5 text-xs"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {p.pi}
                  </div>
                </div>
                <div
                  className="flex items-center text-xs sm:text-sm"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {p.funder}
                </div>
                <div className="flex items-center">
                  <span
                    className="rounded-full px-2.5 py-1 text-xs font-semibold"
                    style={{
                      background:
                        p.status === "Ongoing"
                          ? "color-mix(in oklch, var(--primary) 15%, transparent)"
                          : "color-mix(in oklch, var(--muted-foreground) 15%, transparent)",
                      color:
                        p.status === "Ongoing"
                          ? "var(--primary)"
                          : "var(--muted-foreground)",
                    }}
                  >
                    {p.status}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* International Partnerships */}
        <section className="mb-8 py-10">
          <motion.h2 {...fadeUp()} className="mb-2 text-2xl font-bold">
            International Research Partnerships
          </motion.h2>
          <motion.p
            {...fadeUp(0.06)}
            className="mb-8 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            We collaborate with leading institutions worldwide to conduct
            research that transcends borders.
          </motion.p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {partnerships.map((p, i) => (
              <motion.div
                key={p.org}
                {...fadeUp(i * 0.05)}
                className="flex items-center gap-4 rounded-xl border p-5"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--card)",
                }}
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ background: "var(--primary)" }}
                >
                  {p.org.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-semibold">{p.org}</div>
                  <div
                    className="text-xs"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {p.country}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      </div>

      <Footer />
    </div>
  )
}
