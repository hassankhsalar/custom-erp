const escapeXml = (value) => {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
};

const getCellType = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return "Number";
  const asNumber = Number(value);
  if (typeof value !== "boolean" && value !== "" && Number.isFinite(asNumber)) return "Number";
  return "String";
};

const toCellXml = (value) => {
  const type = getCellType(value);
  const normalized = type === "Number" ? Number(value) : value ?? "";
  return `<Cell><Data ss:Type="${type}">${escapeXml(normalized)}</Data></Cell>`;
};

const toRowXml = (row) => `<Row>${row.map(toCellXml).join("")}</Row>`;

export const downloadExcelFile = ({ sheetName, fileName, rows }) => {
  const safeSheetName = String(sheetName || "Sheet1").replace(/[\\/?*[\]:]/g, "_").slice(0, 31);
  const workbookXml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
  <Worksheet ss:Name="${escapeXml(safeSheetName)}">
    <Table>
      ${(rows || []).map(toRowXml).join("")}
    </Table>
  </Worksheet>
</Workbook>`;

  const blob = new Blob([workbookXml], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName.endsWith(".xls") ? fileName : `${fileName}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
