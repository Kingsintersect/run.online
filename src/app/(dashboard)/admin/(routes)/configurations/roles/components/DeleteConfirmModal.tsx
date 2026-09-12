"use client"

import { motion } from "framer-motion"
import { AlertTriangle, Loader2 } from "lucide-react"
import { useState } from "react"
import Modal from "@/components/custom/Modal"
import { Button } from "@/components/ui/button"

interface DeleteConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  title: string
  description: string
  itemName: string
}

export default function DeleteConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  itemName,
}: DeleteConfirmModalProps) {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await onConfirm()
      onClose()
    } catch {
      // Error handled by parent
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting && <Loader2 size={14} className="mr-2 animate-spin" />}
            Delete
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center py-2 text-center">
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10"
        >
          <AlertTriangle size={24} className="text-red-500" />
        </motion.div>
        <h3 className="mb-1 text-base font-semibold text-foreground">
          {title}
        </h3>
        <p className="mb-3 text-sm text-muted-foreground">{description}</p>
        <div className="rounded-lg bg-muted px-3 py-1.5">
          <p className="text-sm font-medium text-foreground">{itemName}</p>
        </div>
      </div>
    </Modal>
  )
}
