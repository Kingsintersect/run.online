export const instanceResetKeys = {
  all: ["instance-reset"] as const,
  status: () => [...instanceResetKeys.all, "status"] as const,
  groups: () => [...instanceResetKeys.all, "groups"] as const,
  runs: () => [...instanceResetKeys.all, "runs"] as const,
  run: (id: string) => [...instanceResetKeys.runs(), id] as const,
}
