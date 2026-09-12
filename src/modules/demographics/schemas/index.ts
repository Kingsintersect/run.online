import { z } from "zod"

export const countryFormSchema = z.object({
  name: z.string().trim().min(2, "Country name is required"),
  code: z
    .string()
    .trim()
    .max(2, "Use the 2-letter ISO code, e.g. NG")
    .optional()
    .or(z.literal("")),
  isActive: z.boolean().default(true),
})

export const stateFormSchema = z.object({
  countryId: z.number({ message: "Please select a country" }).min(1),
  name: z.string().trim().min(2, "State name is required"),
  code: z.string().trim().max(10).optional().or(z.literal("")),
  isActive: z.boolean().default(true),
})

export const localGovernmentFormSchema = z.object({
  stateId: z.number({ message: "Please select a state" }).min(1),
  name: z.string().trim().min(2, "Local government name is required"),
  isActive: z.boolean().default(true),
})

export type CountryFormValues = z.infer<typeof countryFormSchema>
export type StateFormValues = z.infer<typeof stateFormSchema>
export type LocalGovernmentFormValues = z.infer<
  typeof localGovernmentFormSchema
>
