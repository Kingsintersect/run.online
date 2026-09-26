import { enrollmentKeys } from "../services/enrollment.service"

// Session-registration keys nest under `enrollmentKeys.all`, so every
// enrollment write that already invalidates `enrollmentKeys.all` (enroll,
// drop) also refreshes the registration context and the dashboard banner.
export const registrationKeys = {
  all: () => [...enrollmentKeys.all, "registration-context"] as const,
  context: (semesterId?: number) =>
    [...registrationKeys.all(), semesterId ?? "current"] as const,
}
