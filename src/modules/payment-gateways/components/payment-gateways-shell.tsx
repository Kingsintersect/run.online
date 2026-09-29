"use client"

import { useState } from "react"
import { CreditCard, GitBranch, History } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GatewaysPanel } from "./gateways-panel"
import { ProgramRoutingPanel } from "./program-routing-panel"
import { AssignmentHistoryPanel } from "./assignment-history-panel"

type Tab = "gateways" | "routing" | "history"

/** Super admin: payment gateways and per-program routing (sandbox/payment-routing). */
export function PaymentGatewaysShell() {
  const [tab, setTab] = useState<Tab>("gateways")

  return (
    <div className="mx-auto space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Payment gateways
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure gateway accounts and choose which one each major program
          collects payments through.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList>
          <TabsTrigger value="gateways">
            <CreditCard aria-hidden="true" />
            Gateways
          </TabsTrigger>
          <TabsTrigger value="routing">
            <GitBranch aria-hidden="true" />
            Program routing
          </TabsTrigger>
          <TabsTrigger value="history">
            <History aria-hidden="true" />
            History
          </TabsTrigger>
        </TabsList>
        <TabsContent value="gateways" className="pt-2">
          <GatewaysPanel />
        </TabsContent>
        <TabsContent value="routing" className="pt-2">
          <ProgramRoutingPanel />
        </TabsContent>
        <TabsContent value="history" className="pt-2">
          <AssignmentHistoryPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}
