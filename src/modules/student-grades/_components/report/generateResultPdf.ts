import { saveAs } from "file-saver";
import { PDFDocument, PDFPage, StandardFonts, rgb } from "pdf-lib";
import type { ReportCourse, ReportStudentInfo, ReportSummary } from "./types";
import { formatSemesterLabel } from "./utils";

interface GenerateResultPdfOptions {
   institutionName: string;
   institutionLogoUrl: string;
   semester: string;
   academicYear: string;
   student: ReportStudentInfo;
   courses: ReportCourse[];
   summary: ReportSummary;
}

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const LEFT = 48;

export async function generateResultPdf(options: GenerateResultPdfOptions) {
   const pdfDoc = await PDFDocument.create();
   const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
   const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

   let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
   let y = PAGE_HEIGHT - 48;

   const logoBytes = await loadImageBytes(options.institutionLogoUrl);
   if (logoBytes) {
      const logoImage = await embedImage(pdfDoc, logoBytes.bytes, logoBytes.kind);
      page.drawImage(logoImage, { x: LEFT, y: y - 46, width: 40, height: 40 });
   }

   page.drawText(options.institutionName, {
      x: LEFT + 52,
      y: y - 6,
      size: 18,
      font: bold,
      color: rgb(0.28, 0.07, 0.07),
   });
   page.drawText("Student Grade Report", {
      x: LEFT + 52,
      y: y - 28,
      size: 12,
      font: regular,
      color: rgb(0.35, 0.35, 0.35),
   });
   page.drawText(`${formatSemesterLabel(options.semester)} · ${options.academicYear}`, {
      x: LEFT + 52,
      y: y - 44,
      size: 11,
      font: regular,
      color: rgb(0.42, 0.42, 0.42),
   });

   page.drawText(`GPA ${options.summary.gpa.toFixed(2)}`, {
      x: PAGE_WIDTH - 140,
      y: y - 8,
      size: 20,
      font: bold,
      color: rgb(0.82, 0.55, 0.14),
   });
   page.drawText(options.summary.degreeClass, {
      x: PAGE_WIDTH - 140,
      y: y - 28,
      size: 10,
      font: regular,
      color: rgb(0.17, 0.45, 0.29),
   });

   y -= 76;
   page.drawLine({ start: { x: LEFT, y }, end: { x: PAGE_WIDTH - LEFT, y }, thickness: 1, color: rgb(0.75, 0.75, 0.75) });
   y -= 24;

   const avatarBytes = options.student.avatarUrl ? await loadImageBytes(options.student.avatarUrl) : null;
   if (avatarBytes) {
      const avatarImage = await embedImage(pdfDoc, avatarBytes.bytes, avatarBytes.kind);
      page.drawImage(avatarImage, { x: LEFT, y: y - 70, width: 56, height: 56 });
   } else {
      page.drawRectangle({ x: LEFT, y: y - 70, width: 56, height: 56, borderWidth: 1, borderColor: rgb(0.8, 0.8, 0.8) });
   }

   drawLabelValue(page, bold, regular, LEFT + 72, y - 8, "Student", options.student.fullName);
   drawLabelValue(page, bold, regular, LEFT + 72, y - 24, "Reg Number", options.student.regNumber);
   drawLabelValue(page, bold, regular, LEFT + 72, y - 40, "Program", options.student.program);
   drawLabelValue(page, bold, regular, LEFT + 72, y - 56, "Level", options.student.level);
   drawLabelValue(page, bold, regular, 330, y - 8, "Department", options.student.department);
   drawLabelValue(page, bold, regular, 330, y - 24, "Email", options.student.email);
   drawLabelValue(page, bold, regular, 330, y - 40, "TCU", String(options.summary.totalCredits));
   drawLabelValue(page, bold, regular, 330, y - 56, "TQP", options.summary.totalQualityPoints.toFixed(2));

   y -= 96;
   page.drawText("Course Performance Details", { x: LEFT, y, size: 13, font: bold, color: rgb(0.2, 0.2, 0.2) });
   y -= 18;

   const headers = ["CODE", "COURSE TITLE", "CU", "SCORE", "GRADE", "GP", "QP"];
   const columns = [LEFT, 105, 365, 405, 455, 500, 540];

   drawTableHeader(page, bold, headers, columns, y);
   y -= 18;

   for (const course of options.courses) {
      if (y < 80) {
         page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
         y = PAGE_HEIGHT - 60;
         drawTableHeader(page, bold, headers, columns, y);
         y -= 18;
      }

      page.drawText(course.courseCode, { x: columns[0], y, size: 9, font: bold, color: rgb(0.15, 0.15, 0.15) });
      page.drawText(trimText(course.courseTitle, 38), { x: columns[1], y, size: 9, font: regular, color: rgb(0.2, 0.2, 0.2) });
      page.drawText(String(course.creditLoad), { x: columns[2], y, size: 9, font: regular, color: rgb(0.2, 0.2, 0.2) });
      page.drawText(course.score.toFixed(0), { x: columns[3], y, size: 9, font: regular, color: rgb(0.2, 0.2, 0.2) });
      page.drawText(course.grade, { x: columns[4], y, size: 9, font: bold, color: rgb(0.2, 0.2, 0.2) });
      page.drawText(course.gradePoint.toFixed(2), { x: columns[5], y, size: 9, font: regular, color: rgb(0.2, 0.2, 0.2) });
      page.drawText(course.qualityPoints.toFixed(2), { x: columns[6], y, size: 9, font: regular, color: rgb(0.2, 0.2, 0.2) });
      y -= 16;
   }

   y -= 8;
   page.drawLine({ start: { x: LEFT, y }, end: { x: PAGE_WIDTH - LEFT, y }, thickness: 1, color: rgb(0.75, 0.75, 0.75) });
   y -= 22;

   page.drawText("Performance Summary", { x: LEFT, y, size: 13, font: bold, color: rgb(0.2, 0.2, 0.2) });
   y -= 18;

   for (const item of options.summary.gradeDistribution) {
      page.drawText(item.grade, { x: LEFT, y, size: 10, font: bold, color: rgb(0.2, 0.2, 0.2) });
      page.drawText(item.label, { x: LEFT + 24, y, size: 10, font: regular, color: rgb(0.35, 0.35, 0.35) });
      page.drawText(`${item.count} (${item.percentage}%)`, { x: PAGE_WIDTH - 120, y, size: 10, font: regular, color: rgb(0.2, 0.2, 0.2) });
      y -= 14;
   }

   y -= 6;
   page.drawText(
      `Generated ${new Date().toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" })} · Nigerian University 5.00 Scale`,
      { x: LEFT, y, size: 9, font: regular, color: rgb(0.4, 0.4, 0.4) },
   );

   const pdfBytes = await pdfDoc.save();
   const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
   saveAs(blob, `Result_${options.student.regNumber}_${options.academicYear}_${options.semester.replace(/\s+/g, "_")}.pdf`);
}

function drawLabelValue(
   page: PDFPage,
   bold: PDFFont,
   regular: PDFFont,
   x: number,
   y: number,
   label: string,
   value: string,
) {
   page.drawText(`${label}:`, { x, y, size: 10, font: bold, color: rgb(0.3, 0.3, 0.3) });
   page.drawText(trimText(value, 28), { x: x + 64, y, size: 10, font: regular, color: rgb(0.2, 0.2, 0.2) });
}

function drawTableHeader(page: PDFPage, bold: PDFFont, headers: string[], columns: number[], y: number) {
   headers.forEach((header, index) => {
      page.drawText(header, { x: columns[index], y, size: 9, font: bold, color: rgb(0.45, 0.12, 0.12) });
   });
}

async function loadImageBytes(src: string) {
   try {
      const absoluteUrl = src.startsWith("http")
         ? src
         : typeof window !== "undefined"
            ? new URL(src, window.location.origin).toString()
            : src;
      const response = await fetch(absoluteUrl);
      if (!response.ok) return null;
      const bytes = await response.arrayBuffer();
      const lowered = absoluteUrl.toLowerCase();
      const kind = lowered.endsWith(".png") ? "png" : lowered.endsWith(".jpg") || lowered.endsWith(".jpeg") ? "jpg" : null;
      if (!kind) return null;
      return { bytes, kind } as const;
   } catch {
      return null;
   }
}

async function embedImage(pdfDoc: PDFDocument, bytes: ArrayBuffer, kind: "png" | "jpg") {
   return kind === "png" ? pdfDoc.embedPng(bytes) : pdfDoc.embedJpg(bytes);
}

function trimText(value: string, maxLength: number) {
   return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}…`;
}

type PDFFont = Awaited<ReturnType<PDFDocument["embedFont"]>>;
