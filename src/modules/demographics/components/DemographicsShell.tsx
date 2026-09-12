"use client"

import { motion } from "framer-motion"
import { Globe2, MapPin, Landmark } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CountriesPanel } from "./CountriesPanel"
import { StatesPanel } from "./StatesPanel"
import { LocalGovernmentsPanel } from "./LocalGovernmentsPanel"

export function DemographicsShell() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex items-center gap-3"
      >
        <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10">
          <Globe2 className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Countries, States &amp; Local Governments
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage the address hierarchy used across the portal — every
            country/state/LGA select (like the admission form) reads from this
            list.
          </p>
        </div>
      </motion.div>

      <Tabs defaultValue="countries">
        <TabsList className="mb-6">
          <TabsTrigger value="countries" className="gap-1.5">
            <Globe2 className="size-3.5" />
            Countries
          </TabsTrigger>
          <TabsTrigger value="states" className="gap-1.5">
            <MapPin className="size-3.5" />
            States
          </TabsTrigger>
          <TabsTrigger value="local-governments" className="gap-1.5">
            <Landmark className="size-3.5" />
            Local Governments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="countries">
          <CountriesPanel />
        </TabsContent>
        <TabsContent value="states">
          <StatesPanel />
        </TabsContent>
        <TabsContent value="local-governments">
          <LocalGovernmentsPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}
