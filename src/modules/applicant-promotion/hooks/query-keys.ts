// This module only writes; its key factory exists for the mutation key, so
// devtools / useIsMutating can address an in-flight promotion by applicant.
export const applicantPromotionKeys = {
  all: ["applicant-promotion"] as const,
  promote: (userId: number) =>
    [...applicantPromotionKeys.all, "promote", userId] as const,
}
