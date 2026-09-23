"use client"

import { Activity } from "lucide-react"
import SectionCard from "@/components/custom/SectionCard"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScheduledJobsPanel } from "./components/ScheduledJobsPanel"
import { LogViewerPanel } from "./components/LogViewerPanel"

export default function SystemMonitoringPage() {
  return (
    <div className="mx-auto space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          System Monitoring
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cron schedule visibility and raw application logs — super admin only.
        </p>
      </div>

      <SectionCard title="Scheduled Jobs & Logs" icon={Activity}>
        <Tabs defaultValue="jobs">
          <TabsList>
            <TabsTrigger value="jobs">Scheduled Jobs</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>
          <TabsContent value="jobs" className="pt-4">
            <ScheduledJobsPanel />
          </TabsContent>
          <TabsContent value="logs" className="pt-4">
            <LogViewerPanel />
          </TabsContent>
        </Tabs>
      </SectionCard>
    </div>
  )
}
