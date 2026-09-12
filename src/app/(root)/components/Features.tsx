'use client'
import React from 'react'
import { motion } from 'framer-motion'

const items = [
    { title: 'Student Portal', desc: 'Access courses, grades and schedules' },
    { title: 'Library & e-Resources', desc: 'Extensive digital collections & services' },
    { title: 'Research Centres', desc: 'Multidisciplinary labs and funding' },
    { title: 'Events & Campus Life', desc: 'Clubs, sports and cultural programs' },
]

export default function Features() {
    return (
        <section className="mt-12">
            <motion.h2
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-2xl font-bold mb-4"
                style={{ color: 'var(--foreground)' }}
            >
                Services & highlights
            </motion.h2>

            <motion.div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {items.map((it, idx) => (
                    <motion.article
                        key={it.title}
                        whileHover={{ translateY: -6 }}
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: idx * 0.06 }}
                        className="p-4 rounded-xl border"
                        style={{ borderColor: 'var(--border)', backgroundColor: 'transparent' }}
                    >
                        <div className="text-sm font-semibold mb-2" style={{ color: 'var(--foreground)' }}>{it.title}</div>
                        <div className="text-xs text-foreground/70">{it.desc}</div>
                    </motion.article>
                ))}
            </motion.div>
        </section>
    )
}