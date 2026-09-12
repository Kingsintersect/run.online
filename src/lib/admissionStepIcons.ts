import {
  CreditCard,
  FileText,
  Search,
  BadgeCheck,
  GraduationCap,
  PartyPopper,
  User,
  Heart,
  Users,
  BookOpen,
  FolderOpen,
  Settings,
  CheckCircle,
  Sparkles,
  Flag,
  Bell,
  Lock,
  Clock,
  Mail,
  MapPin,
  ListChecks,
  type LucideIcon,
} from "lucide-react"

/** Curated icon set admins can assign to a step — keep names stable, they're persisted as strings. */
export const ADMISSION_STEP_ICON_MAP: Record<string, LucideIcon> = {
  CreditCard,
  FileText,
  Search,
  BadgeCheck,
  GraduationCap,
  PartyPopper,
  User,
  Heart,
  Users,
  BookOpen,
  FolderOpen,
  Settings,
  CheckCircle,
  Sparkles,
  Flag,
  Bell,
  Lock,
  Clock,
  Mail,
  MapPin,
  ListChecks,
}

export const ADMISSION_STEP_ICON_NAMES = Object.keys(ADMISSION_STEP_ICON_MAP)

export const DEFAULT_STEP_ICON_NAME = "ListChecks"

export function getStepIcon(name: string | undefined): LucideIcon {
  return (
    (name && ADMISSION_STEP_ICON_MAP[name]) ||
    ADMISSION_STEP_ICON_MAP[DEFAULT_STEP_ICON_NAME]
  )
}
