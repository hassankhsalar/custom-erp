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

  const shops = await Promise.all([
    prisma.shop.create({
      data: {
        name: "Main Shop",
        address: "Main Market",
        shop_keeper: "Keeper 1",
        mobile: "01700000001",
      },
    }),
    prisma.shop.create({
      data: {
        name: "Second Shop",
        address: "Second Market",
        shop_keeper: "Keeper 2",
        mobile: "01700000002",
      },
    }),
  ]);

  const stores = await Promise.all([
    prisma.store.create({
      data: {
        name: "Main Store",
        address: "Store Area 1",
        store_keeper: "Store Keeper 1",
        mobile: "01800000001",
      },
    }),
    prisma.store.create({
      data: {
        name: "Second Store",
        address: "Store Area 2",
        store_keeper: "Store Keeper 2",
        mobile: "01800000002",
      },
    }),
  ]);

  const factories = await Promise.all([
    prisma.factory.create({
      data: {
        name: "Main Factory",
        address: "Factory Zone 1",
        manager: "Manager 1",
        phone: "01900000001",
        email: "factory1@example.com",
      },
    }),
    prisma.factory.create({
      data: {
        name: "Second Factory",
        address: "Factory Zone 2",
        manager: "Manager 2",
        phone: "01900000002",
        email: "factory2@example.com",
      },
    }),
  ]);

  const primaryAccount = await prisma.accounts.create({
    data: {
      name: "Primary Business Account",
      account_number: "ACC-PRIMARY-0001",
      status: "active",
      balance: 0,
      deleted_at: false,
    },
  });

  const entityAccountData = [
    ...shops.map((shop) => ({
      entityType: "shop",
      entityId: shop.id,
      accountId: primaryAccount.id,
      isPrimary: true,
      assignedById: adminUser.id,
    })),
    ...stores.map((store) => ({
      entityType: "store",
      entityId: store.id,
      accountId: primaryAccount.id,
      isPrimary: true,
      assignedById: adminUser.id,
    })),
    ...factories.map((factory) => ({
      entityType: "factory",
      entityId: factory.id,
      accountId: primaryAccount.id,
      isPrimary: true,
      assignedById: adminUser.id,
    })),
  ];
  await prisma.entityAccount.createMany({ data: entityAccountData, skipDuplicates: true });

  await prisma.userAssociate.createMany({
    data: [
      { userId: testUser.id, associateName: "shop", associateId: shops[0].id },
      { userId: testUser.id, associateName: "store", associateId: stores[0].id },
      { userId: testUser.id, associateName: "factory", associateId: factories[0].id },
    ],
    skipDuplicates: true,
  });

  const shopRegisters = await Promise.all(
    shops.map((shop, index) =>
      prisma.cashRegister.create({
        data: {
          name: `Shop Register ${index + 1}`,
          status: "open",
          cash_in_hand: 0,
          deleted_at: false,
        },
      })
    )
  );

  await prisma.cashRegisterAssignment.createMany({
    data: shopRegisters.map((register, index) => ({
      entityType: "shop",
      entityId: shops[index].id,
      cashRegisterId: register.id,
      assignedById: adminUser.id,
      isActive: true,
      notes: "Seeded default cash register for shop",
    })),
    skipDuplicates: true,
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

  const extraCustomers = await Promise.all([
    prisma.customer.create({
      data: {
        name: "Walk-in Customer",
        mobile: "01999000001",
        address: "Dhaka",
        total_purchase: 0,
        total_due: 0,
      },
    }),
    prisma.customer.create({
      data: {
        name: "Dealer Customer",
        mobile: "01999000002",
        address: "Chattogram",
        total_purchase: 0,
        total_due: 0,
      },
    }),
  ]);

  const suppliers = await Promise.all([
    prisma.supplier.create({
      data: {
        name: "Default Supplier A",
        mobile: "01888000001",
        address: "Supplier Area 1",
      },
    }),
    prisma.supplier.create({
      data: {
        name: "Default Supplier B",
        mobile: "01888000002",
        address: "Supplier Area 2",
      },
    }),
  ]);

  const productPool = await prisma.product.findMany({
    where: { deleted_at: false },
    orderBy: { id: "asc" },
    take: 60,
  });
  const customerPool = await prisma.customer.findMany({
    where: { deleted_at: false },
    orderBy: { id: "asc" },
    take: 80,
  });

  if (!productPool.length || !customerPool.length) {
    throw new Error("Seed dependencies missing: product/customer not found.");
  }

  const purchaseCount = 24;
  const saleCount = 24;
  const transferCount = 24;
  const damageCount = 24;
  const productionCount = 24;

  const ref = (prefix, n) => `${prefix}-${String(n).padStart(4, "0")}`;
  const pick = (arr, i) => arr[i % arr.length];

  for (let i = 1; i <= purchaseCount; i += 1) {
    const product = pick(productPool, i);
    const supplier = pick(suppliers, i);
    const route = i % 3;
    const destinationType = route === 0 ? "store" : route === 1 ? "shop" : "factory";
    const destinationId =
      destinationType === "store" ? pick(stores, i).id : destinationType === "shop" ? pick(shops, i).id : pick(factories, i).id;
    const quantity = 5 + (i % 8);
    const unitPrice = 80 + (i % 10) * 7;
    const totalPrice = quantity * unitPrice;
    const paid = totalPrice - (i % 4) * 50;

    const purchase = await prisma.purchase.create({
      data: {
        reference: ref("PUR", i),
        supplierId: supplier.id,
        destinationType,
        destinationId,
        grandTotal: totalPrice,
        paidAmount: Math.max(0, paid),
        shippingStatus: "received",
        shippingCost: 20 + (i % 5) * 5,
        discount: 0,
        tax: 0,
        accountId: primaryAccount.id,
        purchaseItems: {
          create: [
            {
              productId: product.id,
              itemType: "product",
              selectedName: product.name,
              selectedUnit: product.unit,
              selectedQuantity: quantity,
              quantity,
              unitPrice,
              totalPrice,
            },
          ],
        },
      },
      include: { purchaseItems: true },
    });

    await prisma.purchaseShipment.create({
      data: {
        purchaseId: purchase.id,
        reference: ref("PSHIP", i),
        status: "received",
        note: "Seed shipment",
        receivedAt: new Date(),
        items: {
          create: [
            {
              purchaseItemId: purchase.purchaseItems[0].id,
              itemType: "product",
              productId: product.id,
              quantity,
              received_quantity: quantity,
            },
          ],
        },
      },
    });
  }

  for (let i = 1; i <= saleCount; i += 1) {
    const product = pick(productPool, i + 3);
    const customer = pick(customerPool, i);
    const shop = pick(shops, i);
    const quantity = 1 + (i % 6);
    const unitPrice = 120 + (i % 11) * 9;
    const total = quantity * unitPrice;
    const paid = total - (i % 3) * 40;

    await prisma.sale.create({
      data: {
        reference: ref("SAL", i),
        shopId: shop.id,
        customerId: customer.id,
        totalAmount: total,
        total_cost: quantity * 90,
        discount: 0,
        grandTotal: total,
        paidAmount: Math.max(0, paid),
        paymentType: "cash",
        createdById: adminUser.id,
        transactionStatus: "closed",
        transactionClosedById: adminUser.id,
        transactionClosedAt: new Date(),
        saleItems: {
          create: [
            {
              productId: product.id,
              selectedName: product.name,
              selectedUnit: product.unit,
              selectedQuantity: quantity,
              quantity,
              unitPrice,
              avg_cost: 90,
              totalPrice: total,
            },
          ],
        },
      },
    });
  }

  for (let i = 1; i <= transferCount; i += 1) {
    const product = pick(productPool, i + 7);
    const quantity = 1 + (i % 5);
    const route = i % 3;

    const from = route === 0 ? "store" : route === 1 ? "factory" : "shop";
    const to = route === 0 ? "shop" : route === 1 ? "store" : "factory";
    const fromStoreId = from === "store" ? pick(stores, i).id : null;
    const fromFactoryId = from === "factory" ? pick(factories, i).id : null;
    const fromShopId = from === "shop" ? pick(shops, i).id : null;
    const toStoreId = to === "store" ? pick(stores, i + 1).id : null;
    const toFactoryId = to === "factory" ? pick(factories, i + 1).id : null;
    const toShopId = to === "shop" ? pick(shops, i + 1).id : null;
    const fromId = fromStoreId || fromFactoryId || fromShopId;
    const toId = toStoreId || toFactoryId || toShopId;

    const transfer = await prisma.transfer.create({
      data: {
        reference: ref("TRN", i),
        from,
        fromId,
        fromStoreId,
        fromFactoryId,
        fromShopId,
        to,
        toId,
        toStoreId,
        toFactoryId,
        toShopId,
        shipping_cost: 10 + (i % 6) * 3,
        status: "completed",
        isRecived: true,
        note: "Seed transfer",
        transferItems: {
          create: [
            {
              item: "product",
              itemId: product.id,
              productId: product.id,
              selectedName: product.name,
              selectedUnit: product.unit,
              selectedQuantity: quantity,
              quantity,
              receivedQuantity: quantity,
              avg_cost: 95,
            },
          ],
        },
      },
      include: { transferItems: true },
    });

    await prisma.transferReceipt.create({
      data: {
        transferId: transfer.id,
        reference: ref("TRN-RCV", i),
        receiptType: "receive",
        status: "partial",
        note: "Seed transfer receipt",
        createdById: adminUser.id,
        items: {
          create: [
            {
              transferItemId: transfer.transferItems[0].id,
              itemType: "product",
              itemId: product.id,
              productId: product.id,
              quantity,
            },
          ],
        },
      },
    });
  }

  for (let i = 1; i <= damageCount; i += 1) {
    const product = pick(productPool, i + 11);
    const lossPerUnit = 70 + (i % 8) * 10;
    const quantity = 1 + (i % 3);
    const fromType = i % 3 === 0 ? "shop" : i % 3 === 1 ? "store" : "factory";
    const shopId = fromType === "shop" ? pick(shops, i).id : null;
    const storeId = fromType === "store" ? pick(stores, i).id : null;
    const factoryId = fromType === "factory" ? pick(factories, i).id : null;
    const fromId = shopId || storeId || factoryId;

    await prisma.damageRecord.create({
      data: {
        reason: `Seed damage record ${i}`,
        note: "Damaged during handling",
        totalLoss: quantity * lossPerUnit,
        fromType,
        fromId,
        shopId,
        storeId,
        factoryId,
        items: {
          create: [
            {
              itemType: "product",
              productId: product.id,
              quantity,
              lossPerUnit,
            },
          ],
        },
      },
    });
  }

  for (let i = 1; i <= productionCount; i += 1) {
    const product = pick(productPool, i + 15);
    const factory = pick(factories, i);
    const quantity = 8 + (i % 12);
    const unitCost = 60 + (i % 9) * 8;
    const startDate = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const endDate = new Date(startDate.getTime() + 2 * 24 * 60 * 60 * 1000);

    await prisma.production.create({
      data: {
        reference: ref("PRD", i),
        start_date: startDate,
        estimated_end_date: endDate,
        end_date: endDate,
        factoryId: factory.id,
        status: "done",
        productionProducts: {
          create: [
            {
              productId: product.id,
              code: product.barcode || ref("PRD-CODE", i),
              quantity,
              unit_cost: unitCost,
              received: quantity,
              scrap: i % 2 === 0 ? 0 : 1,
            },
          ],
        },
      },
    });
  }

  console.log(`Brands created: ${brands.length}`);
  console.log(`Units created: ${units.length}`);
  console.log(`Categories created: ${categories.length}`);
  console.log(`Products created: ${products.length}`);
  console.log(`Customers created: ${customers.length}`);
  console.log(`Extra customers created: ${extraCustomers.length}`);
  console.log(`Suppliers created: ${suppliers.length}`);
  console.log(`Purchases created: ${purchaseCount}`);
  console.log(`Sales created: ${saleCount}`);
  console.log(`Transfers created: ${transferCount}`);
  console.log(`Damage records created: ${damageCount}`);
  console.log(`Productions created: ${productionCount}`);
  console.log(`Shops created: ${shops.length}`);
  console.log(`Stores created: ${stores.length}`);
  console.log(`Factories created: ${factories.length}`);
  console.log(`Cash registers created: ${shopRegisters.length}`);
  console.log(`Primary account created: ${primaryAccount.name} (#${primaryAccount.id})`);
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
