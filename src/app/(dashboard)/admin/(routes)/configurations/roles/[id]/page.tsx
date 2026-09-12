"use client"

import { use } from "react"
import RoleDetailView from "../components/RoleDetailView"

interface RoleDetailPageProps {
  params: Promise<{ id: string }>
}

export default function RoleDetailPage({ params }: RoleDetailPageProps) {
  const { id } = use(params)
  return <RoleDetailView roleId={Number(id)} />
}
