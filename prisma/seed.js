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
      if (repaired) return repaired.replace(/\s*--\s*/g, ", ");
    } catch (_) {}
  }
  return raw.replace(/\s*--\s*/g, ", ");
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

function loadCSVOptional(fileName) {
  const fullPath = path.join(seedDataDir, fileName);
  if (!fs.existsSync(fullPath)) return [];
  return loadCSV(fileName);
}

function loadLegacySalesRowsOptional(fileName) {
  const fullPath = path.join(seedDataDir, fileName);
  if (!fs.existsSync(fullPath)) return [];
  const content = fs.readFileSync(fullPath, "utf8");
  if (!content || !content.trim()) return [];

  const normalized = content.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  if (lines.length <= 1) return [];

  const headerCols = lines[0].split(",").map((h) => normalizeText(h));
  const dataBody = lines.slice(1).join("\n");
  const rowStartRegex = /(?:^|\n)\s*\d+\s*,/g;
  const starts = [];
  let m = rowStartRegex.exec(dataBody);
  while (m) {
    starts.push(m.index + (m[0].startsWith("\n") ? 1 : 0));
    m = rowStartRegex.exec(dataBody);
  }
  if (!starts.length) return [];

  const rows = [];
  for (let i = 0; i < starts.length; i += 1) {
    const start = starts[i];
    const end = i + 1 < starts.length ? starts[i + 1] : dataBody.length;
    const chunk = dataBody.slice(start, end).replace(/\n+/g, " ").trim();
    if (!chunk) continue;
    const cols = chunk.split(",");
    const rowObj = {};
    for (let c = 0; c < headerCols.length; c += 1) {
      rowObj[headerCols[c]] = cols[c] ?? "";
    }
    if (cols.length > headerCols.length) {
      rowObj.__extra = cols.slice(headerCols.length);
    }
    rows.push(rowObj);
  }
  return rows;
}

function toNumber(value) {
  if (value === null || value === undefined) return 0;
  const cleaned = normalizeDigits(String(value)).replace(/,/g, "").trim();
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : 0;
}

function toLooseNumber(value) {
  if (value === null || value === undefined) return 0;
  const cleaned = normalizeDigits(String(value))
    .replace(/--/g, "")
    .replace(/,/g, "")
    .replace(/[^0-9.-]/g, "")
    .trim();
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : 0;
}

function parseLegacySaleDate(value) {
  const raw = normalizeText(value).replace(/--/g, ", ");
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseLegacySaleItems(value) {
  const html = String(value ?? "");
  const items = [];
  const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let match = liRegex.exec(html);

  while (match) {
    const text = normalizeText(match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));
    const parsed = text.match(/^(.*?)\s*Code:\s*([A-Za-z0-9-]+)\s*\*\s*([0-9.]+)\s*(?:pc|pcs|piece|pieces)?$/i);
    if (parsed) {
      items.push({
        name: normalizeText(parsed[1]),
        code: normalizeText(parsed[2]),
        quantity: Number.parseFloat(parsed[3]) || 0,
      });
    }
    match = liRegex.exec(html);
  }

  return items.filter((x) => x.code && x.quantity > 0);
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
    "cashRegisterDeposit",
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

  const testUser = await prisma.user.create({
    data: {
      email: "testuser@example.com",
      username: "testuser",
      name: "Test User",
      password: passwordHash,
      permissionId: adminPermission.id,
      isActive: true,
      deleted_at: false,
      bypassGlobalAccessWindow: true,
    },
  });

  const shopRows = loadCSVOptional("shop.csv");
  const usedShopNames = new Set();
  const shopsFromCsv = shopRows
    .map((row, index) => {
      const rawName = normalizeText(row.name ?? row.Name ?? row.shop ?? row.Shop ?? "");
      if (!rawName) return null;

      let name = rawName;
      let suffix = 1;
      while (usedShopNames.has(name.toLowerCase())) {
        suffix += 1;
        name = `${rawName} ${suffix}`;
      }
      usedShopNames.add(name.toLowerCase());

      return {
        name,
        address: normalizeText(row.address ?? row.Address ?? "") || null,
        shop_keeper: normalizeText(row.shop_keeper ?? row.shopKeeper ?? row.keeper ?? row.Keeper ?? "") || null,
        mobile: normalizeDigits(normalizeText(row.phone ?? row.Phone ?? row.mobile ?? row.Mobile ?? "")) || null,
      };
    })
    .filter(Boolean);

  const shops = await Promise.all(shopsFromCsv.map((shop) => prisma.shop.create({ data: shop })));

  const brandRows = loadCSV("brand.csv");
  const unitRows = loadCSV("unit.csv");
  const productRows = loadCSV("product.csv");
  const customerRows = loadCSV("customer.csv");
  const supplierRows = loadCSVOptional("supplier.csv");
  const salesRows = loadLegacySalesRowsOptional("sales.csv");

  const brandSet = new Set();
  const unitSet = new Set();
  const categorySet = new Set();
  const usedProductCodes = new Set();

  const products = [];
  const materials = [];

  for (let index = 0; index < productRows.length; index += 1) {
    const row = productRows[index];
    const productCol = row.Product ?? row.product ?? "";
    const categoryCol = normalizeText(row.Category ?? row.category ?? "");
    const brandCol = normalizeText(row.Brand ?? row.brand ?? "");
    const typeCol = normalizeText(row["Product/Material"] ?? row.product_material ?? row.Type ?? row.type ?? "");
    const unitCol = normalizeText(row.Units ?? row.Unit ?? row.unit ?? "");
    const sl = normalizeText(row["S.L"] ?? row["SL"] ?? "");

    const extracted = extractProductNameAndCode(productCol, sl);
    const name = normalizeText(extracted.name);
    if (!name) continue;

    const category = categoryCol || "";
    const brand = brandCol || null;
    const unit = unitCol || "PC";
    const barcode = makeUniqueCode(extracted.code || sl || `AUTO${index + 1}`, usedProductCodes, "AUTO");
    const salePrice = toNumber(row["Sale Price"] ?? row.sale_price ?? row.salePrice ?? row.saleprice);
    const costPrice = toNumber(row["Cost Price"] ?? row.cost ?? row.unit_cost ?? row.costPrice ?? row.costprice);
    const wholesalePrice = toNumber(row.Wholesale ?? row.wholesale_price ?? row.wholesale ?? row.wholesalePrice ?? row.wholesaleprice);

    categorySet.add(category);
    unitSet.add(unit);
    if (brand) brandSet.add(brand);

    if (typeCol.toLowerCase() === "material") {
      materials.push({
        name,
        description: null,
        category,
        brand,
        alternative_names: null,
        barcode,
        image: null,
        unit,
        alternative_units: null,
        unit_cost: costPrice,
        sale_price: salePrice,
        wholesale_price: wholesalePrice,
        current_stock: 0,
        deleted_at: false,
        alert_quantity: 0,
      });
    } else {
      products.push({
        name,
        description: null,
        brand,
        image: null,
        unit,
        sale_price: salePrice,
        wholesale_price: wholesalePrice,
        cost: costPrice,
        barcode,
        category,
        stock: 0,
        alert_quantity: 0,
        deleted_at: false,
      });
    }
  }

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
  if (materials.length) {
    await prisma.material.createMany({ data: materials, skipDuplicates: true });
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


  const suppliersFromCsv = supplierRows
    .map((row, index) => {
      const name = normalizeText(row.name ?? row.Name ?? "");
      if (!name) return null;

      const mobile = normalizeDigits(normalizeText(row.phone ?? row.Phone ?? row.mobile ?? row.Mobile ?? "")) || null;
      const address = normalizeText(row.address ?? row.Address ?? "") || null;
      const totalPurchase = toLooseNumber(row.total_purchase ?? row.totalPurchase ?? row["total purchase"] ?? row["Total Purchase"]);
      const totalDue = toLooseNumber(row.total_due ?? row.totalDue ?? row["total due"] ?? row["Total Due"]);

      return {
        name,
        mobile,
        address,
        total_purchase: totalPurchase,
        total_due: totalDue,
        deleted_at: false,
      };
    })
    .filter(Boolean);

  if (suppliersFromCsv.length) {
    await prisma.supplier.createMany({ data: suppliersFromCsv });
  }

  const suppliers = await prisma.supplier.findMany({
    where: { deleted_at: false },
    orderBy: { id: "asc" },
  });

  if (salesRows.length) {
    const existingShops = await prisma.shop.findMany({ select: { id: true, name: true } });
    const shopByName = new Map(existingShops.map((s) => [normalizeText(s.name).toLowerCase(), s]));

    const existingCustomers = await prisma.customer.findMany({
      where: { deleted_at: false },
      select: { id: true, name: true, mobile: true }
    });
    const customerByName = new Map(existingCustomers.map((c) => [normalizeText(c.name).toLowerCase(), c]));

    const existingProducts = await prisma.product.findMany({
      where: { deleted_at: false },
      select: { id: true, name: true, unit: true, cost: true, sale_price: true, barcode: true }
    });
    const existingMaterials = await prisma.material.findMany({
      where: { deleted_at: false },
      select: { id: true, name: true, unit: true, unit_cost: true, sale_price: true, barcode: true }
    });

    const productByCode = new Map();
    for (const product of existingProducts) {
      if (product.barcode) productByCode.set(normalizeText(product.barcode), product);
    }
    const usedProductCodesForSales = new Set(
      existingProducts
        .map((product) => normalizeText(product.barcode))
        .filter(Boolean)
    );

    const materialByCode = new Map();
    for (const material of existingMaterials) {
      if (material.barcode) materialByCode.set(normalizeText(material.barcode), material);
    }

    const usedSaleRefs = new Set(
      (await prisma.sale.findMany({ select: { reference: true } }))
        .map((s) => normalizeText(s.reference))
        .filter(Boolean)
    );

    for (let i = 0; i < salesRows.length; i += 1) {
      const row = salesRows[i];
      const invoiceRaw = normalizeText(row.invoice ?? row.Invoice ?? row.reference ?? row.Reference ?? "");
      if (!invoiceRaw) continue;

      const invoiceToken = (normalizeDigits(invoiceRaw).match(/\d+/) || [])[0] || String(i + 1);
      const baseRef = `INV-${invoiceToken}`.slice(0, 24);
      const reference = makeUniqueCode(baseRef, usedSaleRefs, "INV");
      const shopName = normalizeText(row.shop ?? row.Shop ?? "") || "Main Shop";
      const customerName = normalizeText(row.customer ?? row.Customer ?? "") || "Walk-in Customer";

      let shop = shopByName.get(shopName.toLowerCase());
      if (!shop) {
        shop = await prisma.shop.create({
          data: {
            name: shopName,
            address: null,
            shop_keeper: null,
            mobile: null,
          },
          select: { id: true, name: true }
        });
        shopByName.set(shopName.toLowerCase(), shop);
      }

      let customer = customerByName.get(customerName.toLowerCase()) || null;
      if (!customer) {
        const generatedMobile = `SCUST${String(i + 1).padStart(7, "0")}`;
        customer = await prisma.customer.create({
          data: {
            name: customerName,
            mobile: generatedMobile,
            total_purchase: 0,
            total_due: 0,
            deleted_at: false,
          },
          select: { id: true, name: true, mobile: true }
        });
        customerByName.set(customerName.toLowerCase(), customer);
      }

      const totalAmount = toLooseNumber(row.amount ?? row.Amount ?? row.total ?? row.Total);
      const discount = toLooseNumber(row.discount ?? row.Discount);
      const paidAmount = toLooseNumber(row.paid_amount ?? row.paidAmount ?? row.paid ?? row.Paid);
      const totalCost = toLooseNumber(row.cost ?? row.Cost);
      const createdAt = parseLegacySaleDate(row.date ?? row.Date) || new Date();

      const parsedItems = parseLegacySaleItems(row.items ?? row.Items ?? "");
      const saleItemsData = [];

      let knownItemsTotal = 0;
      let unknownItemsQty = 0;
      const totalParsedQty = parsedItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

      for (const parsedItem of parsedItems) {
        const code = normalizeText(parsedItem.code);
        const qty = Number(parsedItem.quantity || 0);
        if (!code || qty <= 0) continue;

        const product = productByCode.get(code);
        if (product) {
          knownItemsTotal += qty * Number(product.sale_price || 0);
          continue;
        }

        const material = materialByCode.get(code);
        if (material) {
          knownItemsTotal += qty * Number(material.sale_price || 0);
          continue;
        }

        unknownItemsQty += qty;
      }

      const averageUnitPrice = totalParsedQty > 0 ? totalAmount / totalParsedQty : 0;
      const remainingForUnknown = totalAmount - knownItemsTotal;
      const unknownUnitPrice = unknownItemsQty > 0
        ? (remainingForUnknown > 0 ? remainingForUnknown / unknownItemsQty : averageUnitPrice)
        : 0;

      for (const parsedItem of parsedItems) {
        const code = normalizeText(parsedItem.code);
        const qty = Number(parsedItem.quantity || 0);
        if (!code || qty <= 0) continue;

        const product = productByCode.get(code);
        if (product) {
          const unitPrice = Number(product.sale_price || 0);
          saleItemsData.push({
            productId: product.id,
            selectedName: product.name,
            selectedUnit: product.unit || "unit",
            selectedQuantity: qty,
            quantity: qty,
            unitPrice,
            avg_cost: Number(product.cost || 0),
            totalPrice: qty * unitPrice,
          });
          continue;
        }

        const material = materialByCode.get(code);
        if (material) {
          const unitPrice = Number(material.sale_price || 0);
          saleItemsData.push({
            materialId: material.id,
            selectedName: material.name,
            selectedUnit: material.unit || "unit",
            selectedQuantity: qty,
            quantity: qty,
            unitPrice,
            avg_cost: Number(material.unit_cost || 0),
            totalPrice: qty * unitPrice,
          });
          continue;
        }

        const generatedName = normalizeText(parsedItem.name) || `Imported Product ${code}`;
        const generatedBarcode = makeUniqueCode(code, usedProductCodesForSales, "AUTO");
        const generatedSalePrice = Number.isFinite(unknownUnitPrice) && unknownUnitPrice > 0 ? unknownUnitPrice : averageUnitPrice;

        const createdProduct = await prisma.product.create({
          data: {
            name: generatedName,
            unit: "pc",
            sale_price: generatedSalePrice > 0 ? generatedSalePrice : 0,
            wholesale_price: generatedSalePrice > 0 ? generatedSalePrice : 0,
            cost: 0,
            barcode: generatedBarcode,
            category: "Imported Sales",
            deleted_at: false,
          },
          select: { id: true, name: true, unit: true, cost: true, sale_price: true, barcode: true },
        });

        productByCode.set(code, createdProduct);
        if (createdProduct.barcode) {
          productByCode.set(normalizeText(createdProduct.barcode), createdProduct);
        }

        saleItemsData.push({
          productId: createdProduct.id,
          selectedName: createdProduct.name,
          selectedUnit: createdProduct.unit || "unit",
          selectedQuantity: qty,
          quantity: qty,
          unitPrice: Number(createdProduct.sale_price || 0),
          avg_cost: 0,
          totalPrice: qty * Number(createdProduct.sale_price || 0),
        });
      }

      await prisma.sale.create({
        data: {
          reference,
          shopId: shop.id,
          customerId: customer?.id || null,
          totalAmount,
          total_cost: totalCost,
          discount,
          grandTotal: totalAmount,
          paidAmount,
          paymentType: "cash",
          createdById: adminUser.id,
          transactionStatus: paidAmount >= totalAmount ? "closed" : "open",
          transactionClosedById: paidAmount >= totalAmount ? adminUser.id : null,
          transactionClosedAt: paidAmount >= totalAmount ? createdAt : null,
          createdAt,
          saleItems: saleItemsData.length ? { create: saleItemsData } : undefined,
        }
      });
    }
  }

  console.log(`Brands created: ${brands.length}`);
  console.log(`Units created: ${units.length}`);
  console.log(`Categories created: ${categories.length}`);
  console.log(`Products created: ${products.length}`);
  console.log(`Materials created: ${materials.length}`);
  console.log(`Customers created: ${customers.length}`);
  console.log(`Suppliers created: ${suppliers.length}`);
  console.log(`Shops created: ${shops.length}`);
  console.log(`Test user created: ${testUser.username} (${testUser.email})`);
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









