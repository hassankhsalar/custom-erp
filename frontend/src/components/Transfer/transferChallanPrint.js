import { API_ROUTES } from "../../config";

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const parseCompanyProfile = (raw) => {
  if (!raw || raw.value === undefined || raw.value === null) return {};
  if (typeof raw.value === "string") {
    try {
      return JSON.parse(raw.value);
    } catch {
      return {};
    }
  }
  return typeof raw.value === "object" ? raw.value : {};
};

const formatPlaceType = (value) => {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "shop") return "Shop";
  if (normalized === "store") return "Store";
  if (normalized === "factory") return "Factory";
  return value || "-";
};

const printDocument = (title, bodyHtml) => {
  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) throw new Error(`Please allow popups to print ${title.toLowerCase()}`);

  printWindow.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
          .row { display: flex; justify-content: space-between; margin-bottom: 6px; }
          .muted { color: #666; }
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 10px; }
          .meta-box { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; background: #fafafa; }
          .meta-title { font-size: 12px; font-weight: 700; color: #374151; margin-bottom: 6px; text-transform: uppercase; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border: 1px solid #ddd; padding: 8px; font-size: 13px; }
          th { background: #f7f7f7; text-align: left; }
        </style>
      </head>
      <body>${bodyHtml}</body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
};

const buildItemRows = (transfer) => {
  const items = Array.isArray(transfer?.transferItems) ? transfer.transferItems : [];
  return items
    .map((item) => {
      const name = item?.name || item?.selectedName || item?.product?.name || item?.material?.name || "-";
      const barcode = item?.barcode || item?.product?.barcode || item?.material?.barcode || "-";
      const quantity = Number(item?.selectedQuantity ?? item?.quantity ?? 0);
      const unit = item?.selectedUnit || "";
      return `
        <tr>
          <td>${escapeHtml(name)}<div style="font-size:12px;color:#666;">${escapeHtml(barcode)}</div></td>
          <td>${escapeHtml(item?.item || "-")}</td>
          <td style="text-align:right;">${quantity.toFixed(2)}${unit ? ` ${escapeHtml(unit)}` : ""}</td>
        </tr>
      `;
    })
    .join("");
};

export const printTransferChallan = async (transfer, token) => {
  if (!transfer?.id) throw new Error("Invalid transfer for printing challan");
  if (!token) throw new Error("Authentication required to print challan");

  const companyRes = await fetch(API_ROUTES.BUSINESS_SETTINGS_BY_KEY("company_profile"), {
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => null);

  const companyRaw = companyRes && companyRes.ok ? await companyRes.json() : null;
  const company = parseCompanyProfile(companyRaw);

  const rawDate = transfer?.date || transfer?.createdAt;
  const transferDateObj = rawDate ? new Date(rawDate) : new Date();
  const transferDate = Number.isNaN(transferDateObj.getTime()) ? "-" : transferDateObj.toLocaleDateString();
  const transferTime = Number.isNaN(transferDateObj.getTime()) ? "-" : transferDateObj.toLocaleTimeString();

  const receiverPersonHtml = transfer?.receivedBy
    ? `<div class="row"><strong>Received By:</strong><span>${escapeHtml(transfer.receivedBy)}</span></div>`
    : "";

  const html = `
    <h2 style="margin:0;">${escapeHtml(company?.companyName || company?.name || "Company")}</h2>
    <div class="muted" style="margin-top:6px;">${escapeHtml(company?.address || "-")}</div>
    <div class="muted" style="margin-top:2px;">${escapeHtml(company?.mobile || company?.phone || "-")}</div>
    <hr style="margin:14px 0;" />

    <div class="row"><strong>Challan No:</strong><span>${escapeHtml(transfer?.reference || "-")}</span></div>
    <div class="row"><strong>Date:</strong><span>${escapeHtml(transferDate)}</span></div>
    <div class="row"><strong>Time:</strong><span>${escapeHtml(transferTime)}</span></div>

    <div class="meta-grid">
      <div class="meta-box">
        <div class="meta-title">Transferrer Details</div>
        <div class="row"><strong>Place:</strong><span>${escapeHtml(transfer?.fromName || "-")}</span></div>
        <div class="row"><strong>Address:</strong><span>${escapeHtml(transfer?.fromAddress || "-")}</span></div>
        <div class="row"><strong>Phone:</strong><span>${escapeHtml(transfer?.fromPhone || "-")}</span></div>
        <div class="row"><strong>Transfer By:</strong><span>${escapeHtml(transfer?.transferBy || transfer?.fromPerson || "-")}</span></div>
      </div>
      <div class="meta-box">
        <div class="meta-title">Receiver Details</div>
        <div class="row"><strong>Place:</strong><span>${escapeHtml(transfer?.toName || "-")}</span></div>
        <div class="row"><strong>Address:</strong><span>${escapeHtml(transfer?.toAddress || "-")}</span></div>
        <div class="row"><strong>Phone:</strong><span>${escapeHtml(transfer?.toPhone || "-")}</span></div>
        ${receiverPersonHtml}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th>Type</th>
          <th style="text-align:right;">Quantity</th>
        </tr>
      </thead>
      <tbody>${buildItemRows(transfer)}</tbody>
    </table>
  `;

  printDocument(`Transfer Challan ${escapeHtml(transfer?.reference || "")}`, html);
};
