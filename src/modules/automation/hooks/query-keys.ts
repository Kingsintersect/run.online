export const automationKeys = {
  all: ["automations"] as const,
  list: () => [...automationKeys.all, "list"] as const,
}
