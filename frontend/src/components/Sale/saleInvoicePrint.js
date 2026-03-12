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

const buildReturnedQuantityMap = (returnsRows) => {
  const map = new Map();
  for (const ret of returnsRows || []) {
    for (const item of ret?.returnItems || []) {
      const key = item.productId ? `product-${item.productId}` : `material-${item.materialId}`;
      const qty = Number(item.quantity || 0);
      map.set(key, (map.get(key) || 0) + qty);
    }
  }
  return map;
};

const fetchPrintData = async (saleId, token) => {
  const [detailsRes, companyRes, returnsRes] = await Promise.all([
    fetch(API_ROUTES.SHOP_SALES_DETAILS_BY_ID(saleId), {
      headers: { Authorization: `Bearer ${token}` },
    }),
    fetch(API_ROUTES.BUSINESS_SETTINGS_BY_KEY("company_profile"), {
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => null),
    fetch(API_ROUTES.SHOP_SALES_RETURNS_BY_SALE(saleId), {
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => null),
  ]);

  if (!detailsRes.ok) throw new Error("Failed to load sale details for printing");

  const saleDetails = await detailsRes.json();
  const companyRaw = companyRes && companyRes.ok ? await companyRes.json() : null;
  const returnsRows = returnsRes && returnsRes.ok ? await returnsRes.json() : [];

  return {
    saleDetails,
    company: parseCompanyProfile(companyRaw),
    returnedMap: buildReturnedQuantityMap(Array.isArray(returnsRows) ? returnsRows : []),
  };
};

const toNetLineItems = (saleDetails, returnedMap) => {
  return (saleDetails?.saleItems || []).map((item) => {
    const key = item.productId ? `product-${item.productId}` : `material-${item.materialId}`;
    const soldQty = Number(item?.selectedQuantity ?? item?.quantity ?? 0);
    const returnedQty = Number(returnedMap.get(key) || 0);
    const netQty = Math.max(0, soldQty - returnedQty);
    const unitPrice = Number(item?.unitPrice || 0);
    return {
      itemName: item?.product?.name || item?.material?.name || item?.selectedName || "-",
      barcode: item?.product?.barcode || item?.material?.barcode || "-",
      soldQty,
      returnedQty,
      netQty,
      unitPrice,
    };
  });
};

const baseHeaderHtml = ({ company, saleDetails, saleDate, saleTime, customerName, customerMobile, title }) => `
  <h2 style="margin:0;">${escapeHtml(company?.companyName || company?.name || "Company")}</h2>
  <div class="meta-grid">
    <div class="meta-box">
      <div class="meta-title">Company Details</div>
      <div class="muted">${escapeHtml(company?.address || "-")}</div>
      <div class="muted">${escapeHtml(company?.mobile || company?.phone || "-")}</div>
    </div>
    <div class="meta-box">
      <div class="meta-title">Shop Details</div>
      <div class="muted">${escapeHtml(saleDetails?.shop?.name || "-")}</div>
      <div class="muted">${escapeHtml(saleDetails?.shop?.address || "-")}</div>
      <div class="muted">${escapeHtml(saleDetails?.shop?.mobile || "-")}</div>
    </div>
  </div>
  <hr style="margin:14px 0;" />
  <div class="row"><strong>${title} No:</strong><span>${escapeHtml(saleDetails?.reference || "-")}</span></div>
  <div class="row"><strong>Date:</strong><span>${escapeHtml(saleDate)}</span></div>
  <div class="row"><strong>Time:</strong><span>${escapeHtml(saleTime)}</span></div>
  <div class="row"><strong>Customer:</strong><span>${escapeHtml(customerName)}</span></div>
  <div class="row"><strong>Mobile:</strong><span>${escapeHtml(customerMobile)}</span></div>
`;

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
          .summary { margin-top: 14px; width: 320px; margin-left: auto; }
          .summary .row { border-bottom: 1px dashed #ddd; padding: 4px 0; }
          .summary .total { font-weight: 700; font-size: 16px; border-bottom: 0; }
        </style>
      </head>
      <body>${bodyHtml}</body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
};

export const printSaleDocumentById = async (saleId, token, mode = "invoice") => {
  if (!saleId) throw new Error("Invalid sale id for printing");
  if (!token) throw new Error("Authentication required to print");

  const { saleDetails, company, returnedMap } = await fetchPrintData(saleId, token);
  const createdAt = saleDetails?.createdAt ? new Date(saleDetails.createdAt) : new Date();
  const saleDate = Number.isNaN(createdAt.getTime()) ? "-" : createdAt.toLocaleDateString();
  const saleTime = Number.isNaN(createdAt.getTime()) ? "-" : createdAt.toLocaleTimeString();
  const customerName = saleDetails?.customer?.name || "Walk-in";
  const customerMobile = saleDetails?.customer?.mobile || "-";

  const lineItems = toNetLineItems(saleDetails, returnedMap);

  if (mode === "challan") {
    const rows = lineItems
      .map((line) => `
        <tr>
          <td>${escapeHtml(line.itemName)}<div style="font-size:12px;color:#666;">${escapeHtml(line.barcode)}</div></td>
          <td style="text-align:right;">${line.netQty.toFixed(2)}</td>
        </tr>
      `)
      .join("");

    const html = `
      ${baseHeaderHtml({ company, saleDetails, saleDate, saleTime, customerName, customerMobile, title: "Challan" })}
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th style="text-align:right;">Quantity</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;

    printDocument(`Challan ${escapeHtml(saleDetails?.reference || "")}`, html);
    return;
  }

  const subtotal = Number(saleDetails?.totalAmount || 0);
  const discountAmount = Number(saleDetails?.discount || 0);
  const taxAmount = Number(saleDetails?.tax || saleDetails?.taxAmount || 0);
  const total = Number(saleDetails?.grandTotal ?? Math.max(0, subtotal - discountAmount + taxAmount));
  const totalPaid = Number(saleDetails?.paidAmount || 0);
  const totalDue = Math.max(0, total - totalPaid);

  const rows = lineItems
    .map((line) => `
      <tr>
        <td>${escapeHtml(line.itemName)}<div style="font-size:12px;color:#666;">${escapeHtml(line.barcode)}</div></td>
        <td style="text-align:right;">${line.netQty.toFixed(2)}</td>
        <td style="text-align:right;">${line.unitPrice.toFixed(2)}</td>
        <td style="text-align:right;">${(line.netQty * line.unitPrice).toFixed(2)}</td>
      </tr>
    `)
    .join("");

  const html = `
    ${baseHeaderHtml({ company, saleDetails, saleDate, saleTime, customerName, customerMobile, title: "Invoice" })}
    <table>
      <thead>
        <tr>
          <th>Product</th>
          <th style="text-align:right;">Quantity</th>
          <th style="text-align:right;">Price</th>
          <th style="text-align:right;">Amount</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="summary">
      <div class="row"><span>Tax</span><span>${taxAmount.toFixed(2)}</span></div>
      <div class="row"><span>Discount</span><span>${discountAmount.toFixed(2)}</span></div>
      <div class="row"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
      <div class="row"><span>Total</span><span>${total.toFixed(2)}</span></div>
      <div class="row"><span>Total Paid</span><span>${totalPaid.toFixed(2)}</span></div>
      <div class="row total"><span>Total Due</span><span>${totalDue.toFixed(2)}</span></div>
    </div>
  `;

  printDocument(`Invoice ${escapeHtml(saleDetails?.reference || "")}`, html);
};

export const printSaleInvoiceById = async (saleId, token) => printSaleDocumentById(saleId, token, "invoice");
export const printSaleChallanById = async (saleId, token) => printSaleDocumentById(saleId, token, "challan");
