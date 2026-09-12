import type { AuditLog, ExportFormat } from "./audit.types"

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Export audit logs to CSV, Excel, or PDF using browser-native APIs.
 * No external dependencies required.
 */
export async function exportAuditLogs(
  logs: AuditLog[],
  format: ExportFormat,
  filename: string
): Promise<void> {
  // Artificial minimum delay for UX feedback
  await new Promise<void>((resolve) => setTimeout(resolve, 300))

  switch (format) {
    case "csv":
      exportCsv(logs, filename)
      break
    case "excel":
      exportExcel(logs, filename)
      break
    case "pdf":
      exportPdf(logs, filename)
      break
  }
}

// ─── CSV ──────────────────────────────────────────────────────────────────────

function exportCsv(logs: AuditLog[], filename: string): void {
  const headers = [
    "ID",
    "User",
    "Email",
    "Action",
    "Entity Type",
    "Entity ID",
    "IP Address",
    "Date",
  ]

  const rows = logs.map((log) => [
    log.id,
    `${log.user.firstName} ${log.user.lastName}`,
    log.user.email,
    log.action,
    log.entityType,
    log.entityId,
    log.ipAddress ?? "",
    log.createdAt,
  ])

  const csv = [headers, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    )
    .join("\n")

  // UTF-8 BOM so Excel opens it correctly
  downloadFile(`\uFEFF${csv}`, `${filename}.csv`, "text/csv;charset=utf-8")
}

// ─── Excel (XMLSS — opens natively in Excel) ─────────────────────────────────

function exportExcel(logs: AuditLog[], filename: string): void {
  const headerRow = `
    <Row>
      <Cell><Data ss:Type="String">ID</Data></Cell>
      <Cell><Data ss:Type="String">User</Data></Cell>
      <Cell><Data ss:Type="String">Email</Data></Cell>
      <Cell><Data ss:Type="String">Action</Data></Cell>
      <Cell><Data ss:Type="String">Entity Type</Data></Cell>
      <Cell><Data ss:Type="String">Entity ID</Data></Cell>
      <Cell><Data ss:Type="String">IP Address</Data></Cell>
      <Cell><Data ss:Type="String">Date</Data></Cell>
    </Row>`

  const dataRows = logs
    .map(
      (log) => `
    <Row>
      <Cell><Data ss:Type="Number">${log.id}</Data></Cell>
      <Cell><Data ss:Type="String">${escXml(`${log.user.firstName} ${log.user.lastName}`)}</Data></Cell>
      <Cell><Data ss:Type="String">${escXml(log.user.email ?? "")}</Data></Cell>
      <Cell><Data ss:Type="String">${log.action}</Data></Cell>
      <Cell><Data ss:Type="String">${log.entityType}</Data></Cell>
      <Cell><Data ss:Type="Number">${log.entityId}</Data></Cell>
      <Cell><Data ss:Type="String">${escXml(log.ipAddress ?? "")}</Data></Cell>
      <Cell><Data ss:Type="String">${log.createdAt}</Data></Cell>
    </Row>`
    )
    .join("")

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook
  xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="Audit Logs">
    <Table>${headerRow}${dataRows}
    </Table>
  </Worksheet>
</Workbook>`

  downloadFile(xml, `${filename}.xls`, "application/vnd.ms-excel")
}

// ─── PDF (print-ready HTML page) ─────────────────────────────────────────────

function exportPdf(logs: AuditLog[], filename: string): void {
  const rows = logs
    .map(
      (log) => `
    <tr>
      <td>${log.id}</td>
      <td>${escHtml(`${log.user.firstName} ${log.user.lastName}`)}</td>
      <td>${escHtml(log.user.email ?? "")}</td>
      <td><strong>${log.action}</strong></td>
      <td>${log.entityType} #${log.entityId}</td>
      <td>${log.ipAddress ?? "—"}</td>
      <td>${new Date(log.createdAt).toLocaleDateString("en-NG")}</td>
    </tr>`
    )
    .join("")

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escHtml(filename)}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 11px; margin: 20px; color: #111; }
    h1 { font-size: 16px; margin-bottom: 4px; }
    p.meta { font-size: 10px; color: #666; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ccc; padding: 4px 8px; text-align: left; }
    th { background: #f0f0f0; font-weight: 600; font-size: 10px; text-transform: uppercase; }
    tr:nth-child(even) { background: #fafafa; }
    button.print-btn { margin-bottom: 12px; padding: 6px 16px; font-size: 13px; cursor: pointer; }
    @media print { button.print-btn { display: none; } }
  </style>
</head>
<body>
  <h1>QHUB University — Audit Logs</h1>
  <p class="meta">Generated: ${new Date().toLocaleString("en-NG")} · Total records: ${logs.length}</p>
  <button class="print-btn" onclick="window.print()">🖨 Print / Save as PDF</button>
  <table>
    <thead>
      <tr>
        <th>ID</th>
        <th>User</th>
        <th>Email</th>
        <th>Action</th>
        <th>Entity</th>
        <th>IP</th>
        <th>Date</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`

  const printWin = window.open("", "_blank", "width=1024,height=768")
  if (printWin) {
    printWin.document.write(html)
    printWin.document.close()
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function downloadFile(
  content: string,
  filename: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function escXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function escHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}
