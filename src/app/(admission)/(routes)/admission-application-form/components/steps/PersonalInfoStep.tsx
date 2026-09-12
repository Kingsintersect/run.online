"use client"

import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { useFormContext } from "react-hook-form"
import { FormInput, FormSelect, FormSwitch, FormTextarea } from "../FormFields"
import { RELIGIONS } from "../../schema/admission-schema"
import type { FormDefaultValues } from "../../types/form-types"
import {
  useCountries,
  useStates,
  useLocalGovernments,
} from "@/modules/demographics/hooks/use-demographics"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: "easeOut" as const },
}

export default function PersonalInfoStep() {
  const {
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<FormDefaultValues>()
  const hasDisability = watch("has_disability")
  const nationality = watch("nationality")
  const stateOfOrigin = watch("state_of_origin")

  const religionOptions = RELIGIONS.map((r) => ({ value: r, label: r }))
  const genderOptions = [
    { value: "Male", label: "Male" },
    { value: "Female", label: "Female" },
  ]

  // ─── Cascading Country → State → Local Government ────────────────────────
  // The underlying form fields (nationality/state_of_origin/lga) stay plain
  // name strings — unchanged schema, unchanged submit payload — only the
  // input control changed from free text to a backed select. Selected ids
  // are tracked separately here purely to drive the next level's query.
  const {
    data: countries = [],
    isLoading: isLoadingCountries,
    isError: isCountriesError,
  } = useCountries()

  // Explicit user picks take priority; otherwise resolve the current form
  // value back to an id once its list loads (a restored draft or an
  // already-filled value on step re-entry) — derived inline during render
  // rather than via an effect + setState, so there's no extra render pass.
  const [manualCountryId, setManualCountryId] = useState<number | null>(null)
  const [manualStateId, setManualStateId] = useState<number | null>(null)

  const countryId =
    manualCountryId ?? countries.find((c) => c.name === nationality)?.id ?? null

  const {
    data: states = [],
    isLoading: isLoadingStates,
    isError: isStatesError,
  } = useStates(countryId)

  const stateId =
    manualStateId ?? states.find((s) => s.name === stateOfOrigin)?.id ?? null

  const {
    data: lgas = [],
    isLoading: isLoadingLgas,
    isError: isLgasError,
  } = useLocalGovernments(stateId)

  const noCountries =
    !isLoadingCountries && !isCountriesError && countries.length === 0
  const noStates = !isLoadingStates && !isStatesError && states.length === 0
  const noLgas = !isLoadingLgas && !isLgasError && lgas.length === 0

  const countryPlaceholder = useMemo(() => {
    if (isLoadingCountries) return "Loading countries…"
    if (isCountriesError) return "Couldn't load countries"
    if (noCountries) return "No countries available"
    return "Select a country"
  }, [isLoadingCountries, isCountriesError, noCountries])

  const statePlaceholder = useMemo(() => {
    if (!countryId) return "Select a country first"
    if (isLoadingStates) return "Loading states…"
    if (isStatesError) return "Couldn't load states"
    if (noStates) return "No states available"
    return "Select a state"
  }, [countryId, isLoadingStates, isStatesError, noStates])

  const lgaPlaceholder = useMemo(() => {
    if (!stateId) return "Select a state first"
    if (isLoadingLgas) return "Loading local governments…"
    if (isLgasError) return "Couldn't load local governments"
    if (noLgas) return "No local governments available"
    return "Select a local government"
  }, [stateId, isLoadingLgas, isLgasError, noLgas])

  return (
    <motion.div className="space-y-6" {...fadeInUp}>
      <div>
        <h3 className="text-lg font-semibold">Personal Information</h3>
        <p className="text-sm text-muted-foreground">
          Provide your basic personal details. All fields marked with * are
          required.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>
            Nationality <span className="text-destructive">*</span>
          </Label>
          <Select
            value={countryId ? String(countryId) : ""}
            onValueChange={(val) => {
              const id = Number(val)
              const country = countries.find((c) => c.id === id)
              setManualCountryId(id)
              setManualStateId(null)
              setValue("nationality", country?.name ?? "", {
                shouldValidate: true,
                shouldDirty: true,
              })
              setValue("state_of_origin", "", { shouldValidate: true })
              setValue("lga", "", { shouldValidate: true })
            }}
            disabled={isLoadingCountries || isCountriesError || noCountries}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={countryPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {countries.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isCountriesError && (
            <p className="text-sm text-destructive">
              Couldn&apos;t load countries. Please refresh or contact
              admissions.
            </p>
          )}
          {errors.nationality?.message && (
            <p className="text-sm text-destructive">
              {errors.nationality.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>
            State of Origin <span className="text-destructive">*</span>
          </Label>
          <Select
            value={stateId ? String(stateId) : ""}
            onValueChange={(val) => {
              const id = Number(val)
              const state = states.find((s) => s.id === id)
              setManualStateId(id)
              setValue("state_of_origin", state?.name ?? "", {
                shouldValidate: true,
                shouldDirty: true,
              })
              setValue("lga", "", { shouldValidate: true })
            }}
            disabled={
              !countryId || isLoadingStates || isStatesError || noStates
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={statePlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {states.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isStatesError && (
            <p className="text-sm text-destructive">
              Couldn&apos;t load states. Please refresh or contact admissions.
            </p>
          )}
          {errors.state_of_origin?.message && (
            <p className="text-sm text-destructive">
              {errors.state_of_origin.message}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>
            Local Government Area <span className="text-destructive">*</span>
          </Label>
          <Select
            value={watch("lga") ? watch("lga") : ""}
            onValueChange={(val) =>
              setValue("lga", val, { shouldValidate: true, shouldDirty: true })
            }
            disabled={!stateId || isLoadingLgas || isLgasError || noLgas}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={lgaPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {lgas.map((l) => (
                <SelectItem key={l.id} value={l.name}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isLgasError && (
            <p className="text-sm text-destructive">
              Couldn&apos;t load local governments. Please refresh or contact
              admissions.
            </p>
          )}
          {errors.lga?.message && (
            <p className="text-sm text-destructive">{errors.lga.message}</p>
          )}
        </div>
        <FormSelect
          name="religion"
          label="Religion"
          required
          options={religionOptions}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormInput name="dob" label="Date of Birth" type="date" required />
        <FormSelect
          name="gender"
          label="Gender"
          required
          options={genderOptions}
        />
      </div>

      <FormInput
        name="hometown"
        label="Hometown"
        required
        placeholder="e.g., Lagos"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormTextarea
          name="hometown_address"
          label="Hometown Address"
          required
          placeholder="Full hometown address"
        />
        <FormTextarea
          name="contact_address"
          label="Contact Address"
          required
          placeholder="Current contact address"
        />
      </div>

      <FormSwitch
        name="has_disability"
        label="Do you have a disability?"
        description="Let us know if you require any special accommodation"
      />

      {hasDisability && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
        >
          <FormTextarea
            name="disability"
            label="Please describe your disability"
            required
            placeholder="Describe your disability and any accommodations needed"
          />
        </motion.div>
      )}
    </motion.div>
  )
}
