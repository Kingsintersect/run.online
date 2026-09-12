"use client"

import { MyDocumentsList } from "@/modules/document/components/student/my-documents-list"

export default function StudentDocumentsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">My Documents</h1>
        <p className="text-xs text-muted-foreground">
          Upload and track verification of your birth certificate, results, and
          other academic documents.
        </p>
      </div>
      <MyDocumentsList />
    </div>
  )
}
