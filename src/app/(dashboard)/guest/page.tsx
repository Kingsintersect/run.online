import { permanentRedirect } from "next/navigation"

export default function GuestPage() {
  permanentRedirect("/guest/dashboard")
}
