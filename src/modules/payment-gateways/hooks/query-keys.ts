export const paymentGatewayKeys = {
  all: ["payment-gateways"] as const,
  providers: () => [...paymentGatewayKeys.all, "providers"] as const,
  gateways: () => [...paymentGatewayKeys.all, "gateways"] as const,
  assignments: () => [...paymentGatewayKeys.all, "assignments"] as const,
  historyAll: () => [...paymentGatewayKeys.all, "history"] as const,
  history: (majorProgramId: number | null) =>
    [...paymentGatewayKeys.historyAll(), majorProgramId ?? "all"] as const,
}
