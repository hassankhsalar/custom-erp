const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();
const seedDataDir = path.join(__dirname, "seed_data");

const bnDigitMap = {
  "০": "0",
  "১": "1",
  "২": "2",
  "৩": "3",
  "৪": "4",
  "৫": "5",
  "৬": "6",
  "৭": "7",
  "৮": "8",
  "৯": "9",
};

function normalizeText(value) {
  const raw = String(value ?? "").replace(/\uFEFF/g, "").trim();
  if (!raw) return "";
  if (/(?:à¦|à§|Ã)/.test(raw)) {
    try {
      const repaired = Buffer.from(raw, "latin1").toString("utf8").trim();
      if (repaired) return repaired;
    } catch (_) {}
  }
  return raw;
}

function normalizeDigits(value) {
  return String(value ?? "").replace(/[০-৯]/g, (d) => bnDigitMap[d] || d);
}

function parseCSV(content) {
  const rows = [];
  let cell = "";
  let row = [];
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    const next = content[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell);
      const hasData = row.some((c) => String(c).trim() !== "");
      if (hasData) rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  if (cell.length || row.length) {
    row.push(cell);
    const hasData = row.some((c) => String(c).trim() !== "");
    if (hasData) rows.push(row);
  }

  return rows;
}

function loadCSV(fileName) {
  const fullPath = path.join(seedDataDir, fileName);
  const content = fs.readFileSync(fullPath, "utf8");
  const rows = parseCSV(content);
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => normalizeText(h));
  return rows.slice(1).map((cols) => {
    const rowObj = {};
    for (let i = 0; i < header.length; i += 1) {
      rowObj[header[i]] = cols[i] ?? "";
    }
    if (cols.length > header.length) {
      rowObj.__extra = cols.slice(header.length);
    }
    return rowObj;
  });
}

function toNumber(value) {
  if (value === null || value === undefined) return 0;
  const cleaned = normalizeDigits(String(value)).replace(/,/g, "").trim();
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : 0;
}

function isMoneyTokens(tokens) {
  if (!tokens.length) return false;
  const joined = tokens.join(",");
  return /^\d{1,3}(,\d{3})*(\.\d+)?$/.test(joined) || /^\d+(\.\d+)?$/.test(joined);
}

function splitPurchaseDue(tokens) {
  if (!tokens.length) return { totalPurchase: 0, totalDue: 0 };
  if (tokens.length === 1) return { totalPurchase: toNumber(tokens[0]), totalDue: 0 };

  let best = null;
  for (let i = 1; i < tokens.length; i += 1) {
    const p = tokens.slice(0, i);
    const d = tokens.slice(i);
    if (!isMoneyTokens(p) || !isMoneyTokens(d)) continue;
    const dueJoined = d.join(",");
    const score = (/\.\d+$/.test(dueJoined) ? 10 : 0) + d.length;
    if (!best || score > best.score) {
      best = { p, d, score };
    }
  }

  if (!best) {
    return {
      totalPurchase: toNumber(tokens[0]),
      totalDue: toNumber(tokens.slice(1).join(",")),
    };
  }

  return {
    totalPurchase: toNumber(best.p.join(",")),
    totalDue: toNumber(best.d.join(",")),
  };
}

function extractProductNameAndCode(rawProduct, fallbackCode) {
  const productText = normalizeText(rawProduct);
  const codeFallback = normalizeText(fallbackCode);

  const match = productText.match(/^(.*?)(?:\s*-\s*|\s+)([A-Za-z0-9]+)$/);
  if (match) {
    return {
      name: normalizeText(match[1]),
      code: normalizeText(match[2]),
    };
  }

  return {
    name: productText,
    code: codeFallback,
  };
}

function makeUniqueCode(code, usedCodes, prefix = "AUTO") {
  const base = normalizeText(code).replace(/\s+/g, "");
  let candidate = base || `${prefix}000001`;
  let counter = 1;
  while (!candidate || usedCodes.has(candidate)) {
    if (base) {
      candidate = `${base}-${counter}`;
    } else {
      candidate = `${prefix}${String(counter).padStart(6, "0")}`;
    }
    counter += 1;
  }
  usedCodes.add(candidate);
  return candidate;
}

function extractMobile(rawPhone, rawName, index, usedMobiles) {
  const sources = [rawPhone, rawName]
    .map((s) => normalizeDigits(normalizeText(s)))
    .filter(Boolean);

  let picked = "";
  for (const source of sources) {
    const matches = source.match(/\d{7,15}/g);
    if (matches && matches.length) {
      picked = matches[0];
      break;
    }
  }

  if (!picked) {
    picked = `CUST${String(index + 1).padStart(6, "0")}`;
  }

  let unique = picked;
  let n = 1;
  while (usedMobiles.has(unique)) {
    unique = `${picked}-${n}`;
    n += 1;
  }
  usedMobiles.add(unique);
  return unique;
}

async function safeDelete(model) {
  if (!prisma[model] || typeof prisma[model].deleteMany !== "function") return;
  await prisma[model].deleteMany();
}

async function main() {
  console.log("Cleaning database...");

  const cleanupOrder = [
    "activityLog",
    "saleEditAccessRequest",
    "warrantyClaim",
    "userWarranty",
    "saleReturnItem",
    "saleReturn",
    "saleItem",
    "sale",
    "purchaseReturnCompensationItem",
    "purchaseReturnCompensationShipment",
    "purchaseReturnPayment",
    "purchaseReturnItem",
    "purchaseReturn",
    "purchaseShipmentItem",
    "purchaseShipment",
    "purchaseItem",
    "purchase",
    "transferReceiptItem",
    "transferReceipt",
    "transferItem",
    "transfer",
    "requisitionSectionItem",
    "requisitionSection",
    "requisitionItem",
    "requisition",
    "productionMaterial",
    "productionProducts",
    "production",
    "repairOrderItem",
    "repairOrder",
    "damageRecordItem",
    "damageRecord",
    "productRepairItem",
    "productRepair",
    "materialRepairItem",
    "materialRepair",
    "scrapProduct",
    "scrapProductRecord",
    "scrapMaterial",
    "scrapMaterialRecord",
    "stockAdjustment",
    "transactions",
    "cashRegisterRecord",
    "cashRegisterWithdraw",
    "cashRegisterAssignment",
    "entityAccount",
    "expense",
    "expenseCategory",
    "salary",
    "leaveApproval",
    "leaveRequest",
    "leaveCategory",
    "holiday",
    "clockInOut",
    "employeeProfile",
    "userManager",
    "userAssociate",
    "dailyStockSnapshotItem",
    "dailyStockSnapshot",
    "productMaterial",
    "storeProduct",
    "shopProduct",
    "factoryProduct",
    "storeMaterial",
    "shopMaterial",
    "factoryMaterial",
    "notification",
    "profile",
    "customer",
    "supplier",
    "shop",
    "store",
    "factory",
    "product",
    "material",
    "productCategory",
    "brand",
    "unit",
    "unitRelation",
    "bankAccount",
    "accounts",
    "cashRegister",
    "businessSettings",
    "user",
    "permission",
  ];

  for (const model of cleanupOrder) {
    await safeDelete(model);
  }

  console.log("Database cleaned.");

  const adminPermission = await prisma.permission.create({
    data: {
      name: "admin",
      permissions: [],
    },
  });

  const passwordHash = await bcrypt.hash("asd123", 10);

  const adminUser = await prisma.user.create({
    data: {
      email: "admin@example.com",
      username: "adminuser",
      name: "Admin User",
      password: passwordHash,
      permissionId: adminPermission.id,
      isActive: true,
      deleted_at: false,
      bypassGlobalAccessWindow: true,
    },
  });

  const brandRows = loadCSV("brand.csv");
  const unitRows = loadCSV("unit.csv");
  const productRows = loadCSV("product.csv");
  const customerRows = loadCSV("customer.csv");

  const brandSet = new Set();
  const unitSet = new Set();
  const categorySet = new Set();
  const usedProductCodes = new Set();

  const products = productRows
    .map((row, index) => {
      const productCol = row.Product ?? row.product ?? "";
      const categoryCol = normalizeText(row.Category ?? row.category ?? "");
      const brandCol = normalizeText(row.Brand ?? row.brand ?? "");
      const unitCol = normalizeText(row.Units ?? row.Unit ?? row.unit ?? "");
      const sl = normalizeText(row["S.L"] ?? row["SL"] ?? "");

      const extracted = extractProductNameAndCode(productCol, sl);
      const name = normalizeText(extracted.name);
      if (!name) return null;

      const category = categoryCol || "";
      const brand = brandCol || null;
      const unit = unitCol || "PC";
      const barcode = makeUniqueCode(extracted.code || sl || `AUTO${index + 1}`, usedProductCodes, "AUTO");

      categorySet.add(category);
      unitSet.add(unit);
      if (brand) brandSet.add(brand);

      return {
        name,
        description: null,
        brand,
        image: null,
        unit,
        sale_price: 0,
        wholesale_price: 0,
        cost: 0,
        barcode,
        category,
        stock: 0,
        alert_quantity: 0,
        deleted_at: false,
      };
    })
    .filter(Boolean);

  for (const row of brandRows) {
    const name = normalizeText(row.Name ?? row.name ?? "");
    if (name) brandSet.add(name);
  }

  for (const row of unitRows) {
    const name = normalizeText(row.Name ?? row.name ?? "");
    if (name) unitSet.add(name);
  }

  const brands = [...brandSet].map((name) => ({ name, status: "active" }));
  const units = [...unitSet].map((name) => ({ name, status: "active" }));
  const categories = [...categorySet].map((name) => ({ name, status: "active" }));

  if (brands.length) {
    await prisma.brand.createMany({ data: brands, skipDuplicates: true });
  }
  if (units.length) {
    await prisma.unit.createMany({ data: units, skipDuplicates: true });
  }
  if (categories.length) {
    await prisma.productCategory.createMany({ data: categories, skipDuplicates: true });
  }
  if (products.length) {
    await prisma.product.createMany({ data: products, skipDuplicates: true });
  }

  const usedMobiles = new Set();
  const usedEmails = new Set();
  const customers = customerRows
    .map((row, index) => {
      const name = normalizeText(row.name ?? row.Name ?? "");
      if (!name) return null;

      const mobile = extractMobile(row.phone ?? row.Phone ?? "", name, index, usedMobiles);

      const emailRaw = normalizeText(row.email ?? row.Email ?? "").toLowerCase();
      let email = emailRaw && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw) ? emailRaw : null;
      if (email) {
        if (usedEmails.has(email)) email = null;
        else usedEmails.add(email);
      }

      const address = normalizeText(row.address ?? row.Address ?? "") || null;
      const combinedNumbers = [
        normalizeText(row.total_purchase ?? row.totalPurchase ?? ""),
        ...(Array.isArray(row.__extra) ? row.__extra.map((v) => normalizeText(v)) : []),
        normalizeText(row.total_due ?? row.totalDue ?? ""),
      ].filter(Boolean);
      const { totalPurchase, totalDue } = splitPurchaseDue(combinedNumbers);

      return {
        name,
        mobile,
        email,
        address,
        total_purchase: totalPurchase,
        total_due: totalDue,
        deleted_at: false,
      };
    })
    .filter(Boolean);

  if (customers.length) {
    await prisma.customer.createMany({ data: customers, skipDuplicates: true });
  }

  console.log(`Brands created: ${brands.length}`);
  console.log(`Units created: ${units.length}`);
  console.log(`Categories created: ${categories.length}`);
  console.log(`Products created: ${products.length}`);
  console.log(`Customers created: ${customers.length}`);
  console.log("Seed completed.");
  console.log(`Permission created: ${adminPermission.name} (#${adminPermission.id})`);
  console.log(`User created: ${adminUser.username} (${adminUser.email})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
