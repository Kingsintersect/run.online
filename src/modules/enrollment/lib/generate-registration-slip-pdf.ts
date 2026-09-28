import { saveAs } from "file-saver"
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib"
import { embedImage, loadImageBytes, trimText } from "@/lib/pdf/pdf-helpers"
import type { RegistrationSlip } from "./registration-slip"

export interface RegistrationSlipStudent {
  fullName: string
  matricNumber: string
  program: string
  department: string
  level: string
  photoUrl: string | null
}

interface Options {
  institutionName: string
  institutionLogoUrl: string
  sessionName: string | null
  student: RegistrationSlipStudent
  slip: RegistrationSlip
}

const W = 595
const H = 842
const LEFT = 48
const DARK = rgb(0.15, 0.15, 0.15)
const MUTED = rgb(0.4, 0.4, 0.4)
const ACCENT = rgb(0.45, 0.12, 0.12)

// A printable list of the courses a student has registered. It carries no
// approvals: adviser/HOD approval of a registration isn't recorded by the
// server yet (sandbox/result-documents, course form), so the slip says so
// instead of printing empty signature lines.
export async function generateRegistrationSlipPdf(o: Options) {
  const doc = await PDFDocument.create()
  const regular = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  let page = doc.addPage([W, H])
  let y = H - 48

  const logo = await loadImageBytes(o.institutionLogoUrl)
  if (logo)
    page.drawImage(await embedImage(doc, logo.bytes, logo.kind), {
      x: LEFT,
      y: y - 44,
      width: 40,
      height: 40,
    })
  page.drawText(o.institutionName, {
    x: LEFT + 52,
    y: y - 8,
    size: 17,
    font: bold,
    color: ACCENT,
  })
  page.drawText("Course registration slip", {
    x: LEFT + 52,
    y: y - 26,
    size: 12,
    font: regular,
    color: MUTED,
  })
  page.drawText(
    [o.slip.semesterName, o.sessionName].filter(Boolean).join(" · "),
    { x: LEFT + 52, y: y - 42, size: 11, font: regular, color: MUTED }
  )

  const photo = o.student.photoUrl
    ? await loadImageBytes(o.student.photoUrl)
    : null
  if (photo)
    page.drawImage(await embedImage(doc, photo.bytes, photo.kind), {
      x: W - LEFT - 64,
      y: y - 70,
      width: 64,
      height: 64,
    })

  y -= 90
  const info: [string, string][] = [
    ["Name", o.student.fullName],
    ["Matric number", o.student.matricNumber],
    ["Programme", o.student.program],
    ["Department", o.student.department],
    ["Level", o.student.level],
  ]
  for (const [label, value] of info) {
    page.drawText(`${label}:`, {
      x: LEFT,
      y,
      size: 10,
      font: bold,
      color: MUTED,
    })
    page.drawText(trimText(value || "—", 60), {
      x: LEFT + 96,
      y,
      size: 10,
      font: regular,
      color: DARK,
    })
    y -= 15
  }

  y -= 12
  const cols = [LEFT, 125, 420, 470]
  const header = (p: PDFPage, at: number) =>
    ["CODE", "COURSE TITLE", "UNITS", "TYPE"].forEach((h, i) =>
      p.drawText(h, { x: cols[i], y: at, size: 9, font: bold, color: ACCENT })
    )
  header(page, y)
  y -= 16
  for (const r of o.slip.rows) {
    if (y < 110) {
      page = doc.addPage([W, H])
      y = H - 60
      header(page, y)
      y -= 16
    }
    row(page, regular, bold, cols, y, r.code, r.title, r.units, r.kind)
    y -= 15
  }
  page.drawLine({
    start: { x: LEFT, y: y + 6 },
    end: { x: W - LEFT, y: y + 6 },
    thickness: 0.8,
    color: MUTED,
  })
  y -= 10
  page.drawText(`Total credit units: ${o.slip.totalUnits}`, {
    x: LEFT,
    y,
    size: 11,
    font: bold,
    color: DARK,
  })
  page.drawText(
    `${o.slip.rows.length} course${o.slip.rows.length === 1 ? "" : "s"}`,
    {
      x: 420,
      y,
      size: 10,
      font: regular,
      color: MUTED,
    }
  )

  y -= 30
  for (const line of [
    "This slip lists the courses registered on the portal. It is not an approved course form:",
    "course adviser and HOD approval will appear here once it is recorded on the portal.",
  ]) {
    page.drawText(line, { x: LEFT, y, size: 9, font: regular, color: MUTED })
    y -= 12
  }
  page.drawText(
    `Generated ${new Date().toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" })}`,
    { x: LEFT, y: y - 6, size: 9, font: regular, color: MUTED }
  )

  const bytes = await doc.save()
  saveAs(
    new Blob([new Uint8Array(bytes)], { type: "application/pdf" }),
    `Registration_${o.student.matricNumber || "slip"}_${o.slip.semesterName.replace(/\s+/g, "_")}.pdf`
  )
}

function row(
  page: PDFPage,
  regular: PDFFont,
  bold: PDFFont,
  cols: number[],
  y: number,
  code: string,
  title: string,
  units: number | null,
  kind: string
) {
  page.drawText(trimText(code, 14), {
    x: cols[0],
    y,
    size: 9,
    font: bold,
    color: DARK,
  })
  page.drawText(trimText(title, 52), {
    x: cols[1],
    y,
    size: 9,
    font: regular,
    color: DARK,
  })
  page.drawText(units == null ? "—" : String(units), {
    x: cols[2],
    y,
    size: 9,
    font: regular,
    color: DARK,
  })
  page.drawText(kind, { x: cols[3], y, size: 9, font: regular, color: DARK })
}
