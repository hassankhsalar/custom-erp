const express = require("express");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const router = express.Router();
const { createTransaction } = require('../utils/transactionHelper');
const { createNotification } = require('../utils/notificationHelper');
const { rollbackAndDeleteTransactionsByWhere } = require('../utils/transactionRollback');
const { buildScope, ensureTypeScope, ensureIdScope } = require("../utils/associateScope");
const { getAvailableBatches, decrementBatch } = require("../utils/batchDetails");
const { assertActivePlace, assertActiveItem } = require("../utils/softDelete");
const { registerSaleEditAccessRoutes } = require("./shop-sales/editAccessRoutes");
const { registerShopSaleWarrantyRoutes } = require("./shop-sales/warrantyRoutes");
const { registerShopSaleReturnRoutes } = require("./shop-sales/returnRoutes");
const {
  normalizeEditGrantLimits,
  buildEditGrantUpdateData,
  getEditGrantStateForUser,
  getEditUsageUpdateOnSuccessfulEdit,
  getEditGrantSummary,
} = require("../services/saleEditAccessPolicy");

const isAdminPermission = (permissionName) => permissionName === "admin" || permissionName === "superadmin";
const isSameCalendarDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const getRequesterAccessContext = async (userId) => {
  const user = await prisma.user.findFirst({
    where: { id: Number(userId), deleted_at: false },
    include: {
      permission: {
        select: {
          name: true,
          permissions: true,
        },
      },
    },
  });

  const permissionName = user?.permission?.name || null;
  const permissionList = Array.isArray(user?.permission?.permissions) ? user.permission.permissions : [];
  const isAdmin = isAdminPermission(permissionName);
  const canSalesOpenClose = isAdmin || permissionList.includes("sales_open_close");
  const canEditAnyDay = isAdmin || permissionList.includes("sales_edit_any_day");
  const canEditToday = isAdmin || permissionList.includes("sales_edit_today") || permissionList.includes("sales_edit");
  const canGrantSaleEdit = canSalesOpenClose || isAdmin;

  return {
    user,
    permissionName,
    permissionList,
    isAdmin,
    canSalesOpenClose,
    canEditAnyDay,
    canEditToday,
    canGrantSaleEdit,
  };
};

const canEditSaleForUser = (sale, requesterId, access) => {
  if (!sale || !access) return false;

  const transactionClosed = (sale.transactionStatus || "open") === "closed";
  if (transactionClosed && !access.isAdmin && !access.canSalesOpenClose) {
    return false;
  }

  const isTodaySale = isSameCalendarDay(new Date(sale.createdAt), new Date());
  const isCreator = Number(sale.createdById || 0) === Number(requesterId || 0);
  const grantState = getEditGrantStateForUser(sale, requesterId);
  const hasSaleGrant = grantState.allowed;
  const isEditOpen = String(sale.editStatus || "closed").toLowerCase() === "open";
  const grantedToUserId = Number(sale.editGrantedToUserId || 0);
  const requesterIsGrantedUser = grantedToUserId === Number(requesterId || 0);

  if (isEditOpen && requesterIsGrantedUser && !hasSaleGrant && !access.isAdmin && !access.canSalesOpenClose) {
    return false;
  }
  if (
    isEditOpen &&
    grantedToUserId > 0 &&
    !requesterIsGrantedUser &&
    !access.isAdmin &&
    !access.canSalesOpenClose &&
    !access.canEditAnyDay
  ) {
    return false;
  }

  if (access.isAdmin || access.canSalesOpenClose || access.canEditAnyDay) return true;
  if (hasSaleGrant) return true;
  if (isTodaySale && (access.canEditToday || isCreator)) return true;

  return false;
};

const mapSaleWithPermissions = (sale, requesterId, access) => {
  const canEdit = canEditSaleForUser(sale, requesterId, access);
  const canDelete = canEdit;
  const canCloseTransaction = access?.isAdmin || access?.canSalesOpenClose;
  const grantSummary = getEditGrantSummary(sale);
  const isSaleEditOpen =
    (sale.editStatus || "closed") === "open" && !grantSummary.isLimitReached;

  return {
    ...sale,
    canEdit,
    canDelete,
    canGrantSaleEdit: !!(access?.canGrantSaleEdit),
    canCloseTransaction: !!canCloseTransaction,
    isTransactionClosed: (sale.transactionStatus || "open") === "closed",
    isSaleEditOpen,
    ...grantSummary,
  };
};

const parseDateQuery = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const parsePositiveInt = (value) => {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const normalizeSortDirection = (value, fallback = "desc") => {
  return String(value || "").toLowerCase() === "asc" ? "asc" : fallback;
};

const allowedSaleSortFields = new Set([
  "createdAt",
  "grandTotal",
  "totalAmount",
  "discount",
  "paidAmount",
  "reference",
]);

const buildSaleListOrderBy = (sortBy, sortDir) => {
  const field = allowedSaleSortFields.has(sortBy) ? sortBy : "createdAt";
  const direction = normalizeSortDirection(sortDir);
  return { [field]: direction };
};

const buildShopSaleListWhere = ({ scope, shopId, customerId, customerSearch, dateFrom, dateTo }) => {
  const where = scope.isAdmin ? { shopId: { not: null } } : { shopId: { in: Array.from(scope.shops) } };

  if (shopId) {
    where.shopId = shopId;
  }

  if (customerId) {
    where.customerId = customerId;
  } else if (customerSearch) {
    where.customer = {
      OR: [
        { name: { contains: customerSearch, mode: "insensitive" } },
        { mobile: { contains: customerSearch, mode: "insensitive" } },
      ],
    };
  }

  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = dateFrom;
    if (dateTo) where.createdAt.lte = dateTo;
  }

  return where;
};

// Get all shops for POS
router.get("/shops", async (req, res) => {
  try {
    const scope = await buildScope(prisma, req.user?.userId || 0);
    if (!scope.isAdmin) {
      ensureTypeScope(scope, "shop");
    }
    const where = scope.isAdmin ? { deleted_at: false } : { id: { in: Array.from(scope.shops) }, deleted_at: false };

    const shops = await prisma.shop.findMany({
      where,
      select: {
        id: true,
        name: true,
        address: true,
        shop_keeper: true,
        mobile: true
      },
      orderBy: { name: "asc" }
    });
    res.json(shops);
  } catch (err) {
    if (err.status === 403) {
      return res.json([]);
    }
    res.status(500).json({ error: err.message });
  }
});

// Get unified items (products + materials) for a specific shop
router.get("/items/shop/:shopId", async (req, res) => {
  try {
    const { shopId } = req.params;
    const { search } = req.query;

    const scope = await buildScope(prisma, req.user?.userId || 0);
    ensureIdScope(scope, "shop", parseInt(shopId));
    await assertActivePlace(prisma, "shop", parseInt(shopId));
    
    // Fetch shop products
    const shopProducts = await prisma.shopProduct.findMany({
      where: { 
        shop_id: parseInt(shopId),
        deleted_at: false,
        product: search
          ? {
              deleted_at: false,
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { barcode: { contains: search, mode: 'insensitive' } },
                { category: { contains: search, mode: 'insensitive' } }
              ]
            }
          : { deleted_at: false }
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sale_price: true,
            wholesale_price: true,
            barcode: true,
            category: true,
            unit: true,
            alternative_names: true,
            alternative_units: true,
            stock: true,
            alert_quantity: true,
            image: true
          }
        }
      }
    });

    // Fetch shop materials
    const shopMaterials = await prisma.shopMaterial.findMany({
      where: { 
        shop_id: parseInt(shopId),
        deleted_at: false,
        material: search
          ? {
              deleted_at: false,
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { barcode: { contains: search, mode: 'insensitive' } },
                { brand: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } }
              ]
            }
          : { deleted_at: false }
      },
      include: {
        material: {
          select: {
            id: true,
            name: true,
            sale_price: true,
            unit_cost: true,
            barcode: true,
            category: true,
            brand: true,
            unit: true,
            alternative_names: true,
            alternative_units: true,
            current_stock: true,
            alert_quantity: true,
            image: true
          }
        }
      }
    });

    // Transform the data to unified format
    const products = shopProducts.map(sp => ({
      id: sp.product.id,
      name: sp.product.name,
      type: "product",
      sale_price: sp.product.sale_price,
      wholesale_price: sp.product.wholesale_price,
      cost_price: null,
      barcode: sp.product.barcode,
      category: sp.product.category,
      brand: null,
      unit: sp.product.unit || "unit",
      alternative_names: sp.product.alternative_names || [],
      alternative_units: sp.product.alternative_units || [],
      stock: sp.stock,
      shop_stock: sp.stock,
      global_stock: sp.product.stock,
      alert_quantity: sp.product.alert_quantity,
      image: sp.product.image,
      batches: getAvailableBatches(sp.batchDetails),
      minStock: 0
    }));

    const materials = shopMaterials.map(sm => ({
      id: sm.material.id,
      name: sm.material.name,
      type: "material",
      sale_price: sm.material.sale_price,
      wholesale_price: null,
      cost_price: sm.material.unit_cost,
      barcode: sm.material.barcode,
      category: sm.material.category,
      brand: sm.material.brand,
      unit: sm.material.unit,
      alternative_names: sm.material.alternative_names || [],
      alternative_units: sm.material.alternative_units || [],
      stock: sm.stock,
      shop_stock: sm.stock,
      global_stock: sm.material.current_stock,
      alert_quantity: sm.material.alert_quantity,
      image: sm.material.image,
      batches: getAvailableBatches(sm.batchDetails),
      minStock: 0
    }));

    // Combine and sort by name
    const items = [...products, ...materials].sort((a, b) => 
      a.name.localeCompare(b.name)
    );

    res.json(items);
  } catch (err) {
    if (err.status === 403) {
      return res.json([]);
    }
    res.status(500).json({ error: err.message });
  }
});

// Create a new sale for shop (updated for products & materials)
router.post("/", async (req, res) => {
  try {
    const { shopId, customerId, paymentType, discount, items, bankAccountId, paidAmount, cashRegisterId } = req.body;
    const scope = await buildScope(prisma, req.user?.userId || 0);
    ensureIdScope(scope, "shop", parseInt(shopId));
    await assertActivePlace(prisma, "shop", parseInt(shopId));

    // Validate required fields
    if (!shopId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Shop ID and at least one item are required" });
    }

    // Validate items
    for (const item of items) {
      if (!item.type || !item.quantity || !item.unitPrice) {
        return res.status(400).json({ error: "Each item must have type, quantity, and unitPrice" });
      }
      if (item.quantity <= 0 || item.unitPrice <= 0) {
        return res.status(400).json({ error: "Quantity and unitPrice must be positive numbers" });
      }
      if (!['product', 'material'].includes(item.type)) {
        return res.status(400).json({ error: "Item type must be 'product' or 'material'" });
      }
      if (!item.itemId) {
        return res.status(400).json({ error: "Each item must have itemId" });
      }
      await assertActiveItem(prisma, item.type, parseInt(item.itemId));
      if (item.warrantyEnabled) {
        if (!item.warrantyExpiryDate) {
          return res.status(400).json({ error: "warrantyExpiryDate is required when warrantyEnabled is true" });
        }
        const exp = new Date(item.warrantyExpiryDate);
        if (Number.isNaN(exp.getTime())) {
          return res.status(400).json({ error: "Invalid warrantyExpiryDate" });
        }
      }
    }
    
    const normalizedPaymentType = (paymentType || "cash").toLowerCase();
    const paid = paidAmount !== undefined && paidAmount !== null ? parseFloat(paidAmount) : null;

    if (paid !== null && (isNaN(paid) || paid < 0)) {
      return res.status(400).json({ error: "Paid amount must be a non-negative number" });
    }

    if (["bank", "card"].includes(normalizedPaymentType) && paid > 0 && !bankAccountId) {
      return res.status(400).json({ error: "Bank account is required for card/bank payments" });
    }
    if (normalizedPaymentType === "cash" && paid > 0 && !cashRegisterId) {
      return res.status(400).json({ error: "Cash register is required for cash payments" });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Calculate totals
      const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      const grandTotal = Math.max(0, totalAmount - (parseFloat(discount) || 0));
      const finalPaidAmount = paid !== null ? paid : grandTotal;

      // Generate reference
      const reference = `SALE-${Date.now()}`;

      const entityAccount = await tx.entityAccount.findFirst({
        where: {
          entityType: 'shop',
          entityId: parseInt(shopId),
          isPrimary: true
        },
        include: { account: true }
      });

      if (!entityAccount) {
        throw new Error("No primary account found for this shop");
      }

      // Create the sale
      let bankRecord = null;
      let cashRegisterRecord = null;
      if (["bank", "card"].includes(normalizedPaymentType) && bankAccountId && finalPaidAmount > 0) {
        bankRecord = await tx.bankAccount.update({
          where: { id: parseInt(bankAccountId) },
          data: { current_balance: { increment: finalPaidAmount } }
        });
      }
      if (normalizedPaymentType === "cash" && cashRegisterId && finalPaidAmount > 0) {
        const registerId = parseInt(cashRegisterId);
        const assignment = await tx.cashRegisterAssignment.findFirst({
          where: {
            entityType: "shop",
            entityId: parseInt(shopId),
            cashRegisterId: registerId,
            isActive: true,
          },
        });
        if (!assignment) {
          throw new Error("Selected cash register is not assigned to this shop");
        }
        const existingRegister = await tx.cashRegister.findFirst({
          where: { id: registerId, deleted_at: false },
          select: { id: true, status: true }
        });
        if (!existingRegister || existingRegister.status !== "active") {
          throw new Error("Selected cash register is not active");
        }
        cashRegisterRecord = await tx.cashRegister.update({
          where: { id: registerId },
          data: { cash_in_hand: { increment: finalPaidAmount } },
        });
      }

      const sale = await tx.sale.create({
        data: {
          reference,
          shopId: parseInt(shopId),
          customerId: customerId ? parseInt(customerId) : null,
          totalAmount,
          discount: parseFloat(discount) || 0,
          grandTotal,
          paidAmount: finalPaidAmount,
          paymentType: paymentType || "cash",
          createdById: req.user?.userId || null,
          transactionStatus: finalPaidAmount < grandTotal ? "open" : "closed",
          editStatus: "closed",
          editGrantedToUserId: null,
          editGrantedByUserId: req.user?.userId || null,
          editOpenedAt: new Date(),
          bankAccountId: bankRecord ? bankRecord.id : null,
          bankName: bankRecord ? bankRecord.name : null,
        },
      });

      // Process each sale item
      const saleItems = [];
      let totalCost = 0;
      let customer = customerId ? parseInt(customerId) : null;
      let stockAfterSale = 0;
      
      for (const item of items) {
        let itemNameForNotification = item.selectedName
          ? String(item.selectedName).trim()
          : `Item ${item.itemId}`;

        // Check stock based on item type
        if (item.type === "product") {
          // Check and update shop product stock
          const shopProduct = await tx.shopProduct.findUnique({
            where: {
              shop_id_product_id: {
                shop_id: parseInt(shopId),
                product_id: parseInt(item.itemId),
              },
            },
            include: { product: true },
          });

          if (!shopProduct) {
            throw new Error(`Product ${item.itemId} not found in shop ${shopId}`);
          }

          if (shopProduct.stock < parseFloat(item.quantity)) {
            throw new Error(`Insufficient stock for product ${item.itemId}. Available: ${shopProduct.stock}, Requested: ${item.quantity}`);
          }

          // Update shop product stock
          const productUpdateData = {
            stock: { decrement: parseFloat(item.quantity) },
          };
          if (item.batchNumber) {
            productUpdateData.batchDetails = decrementBatch(
              shopProduct.batchDetails,
              { batchNumber: item.batchNumber, expiryDate: item.expiryDate },
              parseFloat(item.quantity)
            );
          }

          await tx.shopProduct.update({
            where: {
              shop_id_product_id: {
                shop_id: parseInt(shopId),
                product_id: parseInt(item.itemId),
              },
            },
            data: productUpdateData,
          });

          // Update global product stock
          await tx.product.update({
            where: { id: parseInt(item.itemId) },
            data: {
              stock: { decrement: parseFloat(item.quantity) },
            },
          });

          item.avg_cost = shopProduct.avg_cost;
          item.alert_quantity = shopProduct.product.alert_quantity;
          itemNameForNotification = shopProduct.product?.name || itemNameForNotification;
          totalCost += parseFloat(item.avg_cost) * parseFloat(item.quantity);
          stockAfterSale = shopProduct.stock - parseFloat(item.quantity);

        } else if (item.type === "material") {
          // Check and update shop material stock
          const shopMaterial = await tx.shopMaterial.findUnique({
            where: {
              shop_id_material_id: {
                shop_id: parseInt(shopId),
                material_id: parseInt(item.itemId),
              },
            },
            include: {
              material: true
            }
          });

          if (!shopMaterial) {
            throw new Error(`Material ${item.itemId} not found in shop ${shopId}`);
          }

          if (shopMaterial.stock < parseFloat(item.quantity)) {
            throw new Error(`Insufficient stock for material ${item.itemId}. Available: ${shopMaterial.stock}, Requested: ${item.quantity}`);
          }

          // Update shop material stock
          const materialUpdateData = {
            stock: { decrement: parseFloat(item.quantity) },
          };
          if (item.batchNumber) {
            materialUpdateData.batchDetails = decrementBatch(
              shopMaterial.batchDetails,
              { batchNumber: item.batchNumber, expiryDate: item.expiryDate },
              parseFloat(item.quantity)
            );
          }

          await tx.shopMaterial.update({
            where: {
              shop_id_material_id: {
                shop_id: parseInt(shopId),
                material_id: parseInt(item.itemId),
              },
            },
            data: materialUpdateData,
          });

          // Update global material stock
          await tx.material.update({
            where: { id: parseInt(item.itemId) },
            data: {
              current_stock: { decrement: parseFloat(item.quantity) },
            },
          });

          item.avg_cost = shopMaterial.avg_cost;
          item.alert_quantity = shopMaterial.material.alert_quantity;
          itemNameForNotification = shopMaterial.material?.name || itemNameForNotification;
          totalCost += parseFloat(item.avg_cost) * parseFloat(item.quantity);
          stockAfterSale = shopMaterial.stock - parseFloat(item.quantity);

        }

        if( item.alert_quantity > 0 && stockAfterSale <= item.alert_quantity ) {
          let shopName = await tx.shop.findUnique({
            where: { id: parseInt(shopId) },
            select: { name: true }
          });
          const notificationData = {
            title: `Item ${itemNameForNotification} is low stock at ${shopName?.name || "shop"}`,
          };
          await createNotification(prisma, notificationData);
        }

        // Create sale item record
        const warrantyEnabled = item.type === "product" && !!item.warrantyEnabled;
        const warrantyStart = warrantyEnabled ? new Date() : null;
        const warrantyEnd = warrantyEnabled && item.warrantyExpiryDate ? new Date(item.warrantyExpiryDate) : null;
        const computedWarrantyDays = warrantyEnabled && warrantyStart && warrantyEnd
          ? Math.max(0, Math.ceil((warrantyEnd.getTime() - warrantyStart.getTime()) / (1000 * 60 * 60 * 24)))
          : 0;

        const saleItemData = {
          saleId: sale.id,
          selectedName: item.selectedName ? String(item.selectedName).trim() : null,
          selectedUnit: item.selectedUnit ? String(item.selectedUnit).trim() : null,
          selectedQuantity: item.selectedQuantity !== undefined && item.selectedQuantity !== null ? parseFloat(item.selectedQuantity) : null,
          batchNumber: item.batchNumber ? String(item.batchNumber).trim() : null,
          expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
          warrantyDays: computedWarrantyDays,
          warrantyStartDate: warrantyStart,
          warrantyEndDate: warrantyEnd,
          warrantySerial: item.warrantySerial ? String(item.warrantySerial).trim() : null,
          warrantyNotes: item.warrantyNotes ? String(item.warrantyNotes).trim() : null,
          quantity: parseFloat(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
          avg_cost: parseFloat(item.avg_cost),
          totalPrice: parseFloat(item.quantity) * parseFloat(item.unitPrice),
        };

        // Set productId or materialId based on type
        if (item.type === "product") {
          saleItemData.productId = parseInt(item.itemId);
        } else if (item.type === "material") {
          saleItemData.materialId = parseInt(item.itemId);
        }

        // Create sale item
        const saleItem = await tx.saleItem.create({
          data: saleItemData,
        });

        if ((item.type === "product" || item.type === "material") && warrantyEnabled && warrantyEnd) {
          const warrantyCode = `WAR-${Date.now()}-${sale.id}-${saleItem.id}`;
          await tx.userWarranty.create({
            data: {
              warrantyCode,
              status: "active",
              serialNumber: saleItemData.warrantySerial,
              notes: saleItemData.warrantyNotes,
              startDate: saleItemData.warrantyStartDate,
              endDate: saleItemData.warrantyEndDate,
              saleId: sale.id,
              saleItemId: saleItem.id,
              productId: item.type === "product" ? parseInt(item.itemId) : null,
              materialId: item.type === "material" ? parseInt(item.itemId) : null,
              customerId: customer || null,
            },
          });
        }

        saleItems.push(saleItem);
      }

      await tx.sale.update({
        where: { id: sale.id },
        data: { total_cost: totalCost },
      });

      if(customer) {
        await tx.customer.update({
          where: { id: customer },
          data: { total_purchase: { increment: finalPaidAmount } , total_due: { increment: (grandTotal - finalPaidAmount) } }
        });
      }

      if (finalPaidAmount > 0) {
        const updatedAccount = await tx.accounts.update({
          where: { id: entityAccount.accountId },
          data: { balance: { increment: finalPaidAmount } }
        });

        const createdById = req.user?.userId || 1;
        await createTransaction(tx, {
          reference: `SALE-${Date.now()}`,
          createdById,
          cashRegisterId: cashRegisterRecord ? cashRegisterRecord.id : null,
          accountId: entityAccount.accountId,
          bankAccountId: bankRecord ? bankRecord.id : null,
          saleId: sale.id,
          purpose: "Sale Payment",
          added_to_account: true,
          amount: finalPaidAmount,
          payment_method: paymentType || "cash",
          current_account_balance: updatedAccount.balance,
          note: `Payment for sale ${sale.reference}`
        });
      }

      if (finalPaidAmount > grandTotal) {
        await createNotification(tx, {
          title: `Overpayment detected on sale ${sale.reference}`,
          description: `Paid amount (${finalPaidAmount.toFixed(2)}) is greater than grand total (${grandTotal.toFixed(2)}). Admin should add a negative payment adjustment.`,
          forRole: "admin",
          link: `/sale/all`
        });
      }

      return { sale, saleItems };
    });

    res.status(201).json({
      message: "Sale created successfully",
      sale: result.sale,
      items: result.saleItems,
    });

  } catch (err) {
    console.error("Sale creation error:", err);

    if (err.status === 403) {
      return res.status(403).json({ error: "Forbidden" });
    }
    
    if (err.message.includes("Insufficient stock") || err.message.includes("not found in shop")) {
      return res.status(400).json({ error: err.message });
    }
    
    res.status(500).json({ error: err.message });
  }
});

router.get("/cash-registers/shop/:shopId", async (req, res) => {
  try {
    const shopId = parseInt(req.params.shopId, 10);
    if (!shopId) {
      return res.status(400).json({ error: "Invalid shopId" });
    }

    const scope = await buildScope(prisma, req.user?.userId || 0);
    ensureIdScope(scope, "shop", shopId);

    const assignments = await prisma.cashRegisterAssignment.findMany({
      where: {
        entityType: "shop",
        entityId: shopId,
        isActive: true,
        cashRegister: { status: "active" },
      },
      include: {
        cashRegister: {
          select: { id: true, name: true, status: true, cash_in_hand: true },
        },
      },
      orderBy: { assignedAt: "desc" },
    });

    res.json(assignments.map((a) => a.cashRegister));
  } catch (err) {
    if (err.status === 403) {
      return res.json([]);
    }
    res.status(500).json({ error: err.message });
  }
});

registerShopSaleWarrantyRoutes({ router, prisma });

// Get all shop sales with both product and material details (with pagination)
router.get("/", async (req, res) => {
  try {
    let startTime = new Date();
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const take = Math.min(200, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * take;
    const shopId = parsePositiveInt(req.query.shopId);
    const customerId = parsePositiveInt(req.query.customerId);
    const customerSearch = String(req.query.customer || "").trim();
    const dateFrom = parseDateQuery(req.query.dateFrom);
    const dateTo = parseDateQuery(req.query.dateTo);
    const orderBy = buildSaleListOrderBy(req.query.sortBy, req.query.sortDir);

    const scope = await buildScope(prisma, req.user?.userId || 0);
    if (!scope.isAdmin && scope.shops.size === 0) {
      const err = new Error("Forbidden");
      err.status = 403;
      throw err;
    }

    if (shopId) {
      ensureIdScope(scope, "shop", shopId);
    }

    const where = buildShopSaleListWhere({
      scope,
      shopId,
      customerId,
      customerSearch,
      dateFrom,
      dateTo,
    });

    // Get total count for pagination
    const totalCount = await prisma.sale.count({ where });

    // Get paginated sales with a lean payload
    const sales = await prisma.sale.findMany({
      where,
      select: {
        id: true,
        reference: true,
        totalAmount: true,
        discount: true,
        grandTotal: true,
        paidAmount: true,
        paymentType: true,
        createdAt: true,
        transactionStatus: true,
        editStatus: true,
        editMaxCount: true,
        editUsedCount: true,
        shop: {
          select: {
            id: true,
            name: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            mobile: true,
          },
        },
      },
      orderBy,
      skip,
      take,
    });

    res.json({
      sales,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / take),
        totalCount,
        limit: take,
      },
    });
  } catch (err) {
    if (err.status === 403) {
      return res.status(403).json({ error: "Forbidden" });
    }
    res.status(500).json({ error: err.message });
  }
});

router.get("/overview", async (req, res) => {
  try {
    const scope = await buildScope(prisma, req.user?.userId || 0);
    if (!scope.isAdmin && scope.shops.size === 0) {
      const err = new Error("Forbidden");
      err.status = 403;
      throw err;
    }

    const shopId = parsePositiveInt(req.query.shopId);
    const customerId = parsePositiveInt(req.query.customerId);
    const customerSearch = String(req.query.customer || "").trim();
    const dateFrom = parseDateQuery(req.query.dateFrom);
    const dateTo = parseDateQuery(req.query.dateTo);

    if (shopId) {
      ensureIdScope(scope, "shop", shopId);
    }

    const where = buildShopSaleListWhere({
      scope,
      shopId,
      customerId,
      customerSearch,
      dateFrom,
      dateTo,
    });

    const [aggregate, saleCount] = await Promise.all([
      prisma.sale.aggregate({
        where,
        _sum: {
          grandTotal: true,
          discount: true,
        },
      }),
      prisma.sale.count({ where }),
    ]);

    const totalRevenue = Number(aggregate._sum.grandTotal || 0);
    const totalDiscount = Number(aggregate._sum.discount || 0);

    res.json({
      totalRevenue,
      totalDiscount,
      saleCount,
      averageSale: saleCount > 0 ? totalRevenue / saleCount : 0,
    });
  } catch (err) {
    if (err.status === 403) {
      return res.status(403).json({ error: "Forbidden" });
    }
    res.status(500).json({ error: err.message });
  }
});

registerSaleEditAccessRoutes({
  router,
  prisma,
  buildScope,
  ensureIdScope,
  getRequesterAccessContext,
  createNotification,
  normalizeEditGrantLimits,
  buildEditGrantUpdateData,
});

// Set transaction status (open/closed)
router.post("/:id/transaction-status", async (req, res) => {
  try {
    const saleId = parseInt(req.params.id, 10);
    const status = String(req.body?.status || "").toLowerCase();
    if (!saleId || !["open", "closed"].includes(status)) {
      return res.status(400).json({ error: "sale id and valid status (open|closed) are required" });
    }

    const sale = await prisma.sale.findUnique({ where: { id: saleId } });
    if (!sale) return res.status(404).json({ error: "Sale not found" });

    const scope = await buildScope(prisma, req.user?.userId || 0);
    ensureIdScope(scope, "shop", sale.shopId);

    const access = await getRequesterAccessContext(req.user?.userId || 0);
    if (!access.canSalesOpenClose) {
      return res.status(403).json({ error: "You do not have permission to change transaction status" });
    }

    const updated = await prisma.sale.update({
      where: { id: saleId },
      data: {
        transactionStatus: status,
        transactionClosedById: status === "closed" ? (req.user?.userId || null) : null,
        transactionClosedAt: status === "closed" ? new Date() : null,
      },
    });

    return res.json({ success: true, sale: updated });
  } catch (err) {
    if (err.status === 403) return res.status(403).json({ error: "Forbidden" });
    return res.status(500).json({ error: err.message });
  }
});

// Add payment to sale
router.post("/:id/payments", async (req, res) => {
  try {
    const saleId = parseInt(req.params.id);
    if (isNaN(saleId)) {
      return res.status(400).json({ error: "Invalid sale ID" });
    }

    const { amount, payment_method, bankAccountId, cashRegisterId, note } = req.body;
    const paymentAmount = parseFloat(amount);
    if (!Number.isFinite(paymentAmount) || paymentAmount === 0) {
      return res.status(400).json({ error: "Payment amount cannot be zero" });
    }

    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: { shop: true }
    });
    if (!sale) {
      return res.status(404).json({ error: "Sale not found" });
    }

    const scope = await buildScope(prisma, req.user?.userId || 0);
    ensureIdScope(scope, "shop", sale.shopId);
    const access = await getRequesterAccessContext(req.user?.userId || 0);
    const canModifySale = canEditSaleForUser(sale, req.user?.userId || 0, access);
    if (!canModifySale) {
      return res.status(403).json({ error: "You do not have permission to modify this sale" });
    }

    if ((sale.transactionStatus || "open") === "closed" && !access.isAdmin && !access.canSalesOpenClose) {
      return res.status(403).json({ error: "This sale transaction is closed and cannot be modified" });
    }

    if (paymentAmount < 0 && !access.isAdmin && !access.canSalesOpenClose) {
      return res.status(403).json({ error: "Only admin or authorized users can add negative payments" });
    }

    const normalizedMethod = (payment_method || "cash").toLowerCase();
    if (["bank", "card"].includes(normalizedMethod) && !bankAccountId) {
      return res.status(400).json({ error: "Bank account is required for card/bank payments" });
    }

    const dueAmount = (parseFloat(sale.grandTotal) || 0) - (parseFloat(sale.paidAmount) || 0);
    if ((parseFloat(sale.paidAmount) || 0) + paymentAmount < 0) {
      return res.status(400).json({ error: "Payment adjustment cannot reduce paid amount below zero" });
    }

    const entityAccount = await prisma.entityAccount.findFirst({
      where: {
        entityType: "shop",
        entityId: sale.shopId,
        isPrimary: true
      },
      include: { account: true }
    });
    if (!entityAccount) {
      return res.status(400).json({ error: "No primary account found for this shop" });
    }

    const result = await prisma.$transaction(async (tx) => {
      let bankRecord = null;
      let cashRegisterRecord = null;
      if (["bank", "card"].includes((payment_method || "cash").toLowerCase()) && bankAccountId) {
        bankRecord = await tx.bankAccount.update({
          where: { id: parseInt(bankAccountId) },
          data: { current_balance: { increment: paymentAmount } }
        });
      }
      if ((payment_method || "cash").toLowerCase() === "cash" && cashRegisterId) {
        const registerId = parseInt(cashRegisterId);
        const assignment = await tx.cashRegisterAssignment.findFirst({
          where: {
            entityType: "shop",
            entityId: sale.shopId,
            cashRegisterId: registerId,
            isActive: true,
          },
        });
        if (!assignment) {
          throw new Error("Selected cash register is not assigned to this shop");
        }
        const existingRegister = await tx.cashRegister.findFirst({
          where: { id: registerId, deleted_at: false },
          select: { id: true, status: true }
        });
        if (!existingRegister || existingRegister.status !== "active") {
          throw new Error("Selected cash register is not active");
        }
        cashRegisterRecord = await tx.cashRegister.update({
          where: { id: registerId },
          data: { cash_in_hand: { increment: paymentAmount } },
        });
      }

      const updatedSale = await tx.sale.update({
        where: { id: saleId },
        data: { paidAmount: { increment: paymentAmount } }
      });

      const updatedAccount = await tx.accounts.update({
        where: { id: entityAccount.accountId },
        data: { balance: { increment: paymentAmount } }
      });

      const createdById = req.user?.userId || 1;
      const txn = await createTransaction(tx, {
        reference: `SALE-${Date.now()}`,
        createdById,
        cashRegisterId: cashRegisterRecord ? cashRegisterRecord.id : null,
        accountId: entityAccount.accountId,
        bankAccountId: bankRecord ? bankRecord.id : null,
        saleId: updatedSale.id,
        purpose: "Sale Payment",
        added_to_account: true,
        amount: paymentAmount,
        payment_method: payment_method || "cash",
        current_account_balance: updatedAccount.balance,
        note: note || `Payment for sale ${updatedSale.reference}`
      });

      if (paymentAmount > dueAmount) {
        await createNotification(tx, {
          title: `Overpayment detected on sale ${sale.reference}`,
          description: `Payment (${paymentAmount.toFixed(2)}) exceeded due (${Math.max(0, dueAmount).toFixed(2)}). Admin may add negative payment to adjust.`,
          forRole: "admin",
          link: `/sale/all`
        });
      }

      return { updatedSale, txn };
    });

    res.json({
      success: true,
      sale: result.updatedSale,
      transaction: result.txn
    });
  } catch (err) {
    if (err.status === 403) {
      return res.status(403).json({ error: "Forbidden" });
    }
    res.status(500).json({ error: err.message });
  }
});

// Get payment history for sale
router.get("/:id/payments", async (req, res) => {
  try {
    const saleId = parseInt(req.params.id);
    if (isNaN(saleId)) {
      return res.status(400).json({ error: "Invalid sale ID" });
    }

    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      select: { id: true, shopId: true }
    });
    if (!sale) {
      return res.status(404).json({ error: "Sale not found" });
    }

    const scope = await buildScope(prisma, req.user?.userId || 0);
    ensureIdScope(scope, "shop", sale.shopId);

    const transactions = await prisma.transactions.findMany({
      where: { saleId },
      orderBy: { createdAt: "desc" },
      include: {
        account: true,
        createdBy: { select: { id: true, name: true, email: true } },
        bankAccount: true
      }
    });

    res.json({ payments: transactions });
  } catch (err) {
    if (err.status === 403) {
      return res.json({ payments: [] });
    }
    res.status(500).json({ error: err.message });
  }
});

// Get sale details by id
router.get("/details/:id", async (req, res) => {
  try {
    const saleId = parseInt(req.params.id, 10);
    if (!saleId) return res.status(400).json({ error: "Invalid sale ID" });

    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        shop: {
          select: { id: true, name: true, shop_keeper: true },
        },
        transactions: {
          orderBy: { createdAt: "desc" },
          include: {
            account: true,
            createdBy: { select: { id: true, name: true, email: true } },
            bankAccount: true,
          },
        },
        saleItems: {
          include: {
            product: {
              select: { id: true, name: true, barcode: true, unit: true, sale_price: true },
            },
            material: {
              select: { id: true, name: true, barcode: true, unit: true, sale_price: true },
            },
          },
        },
        customer: {
          select: { id: true, name: true, mobile: true, email: true },
        },
      },
    });

    if (!sale) return res.status(404).json({ error: "Sale not found" });

    const scope = await buildScope(prisma, req.user?.userId || 0);
    ensureIdScope(scope, "shop", sale.shopId);
    const access = await getRequesterAccessContext(req.user?.userId || 0);

    return res.json(mapSaleWithPermissions(sale, req.user?.userId || 0, access));
  } catch (err) {
    if (err.status === 403) return res.status(403).json({ error: "Forbidden" });
    return res.status(500).json({ error: err.message });
  }
});

// Update sale (full edit)
router.put("/:id", async (req, res) => {
  try {
    const saleId = parseInt(req.params.id);
    if (isNaN(saleId)) {
      return res.status(400).json({ error: "Invalid sale ID" });
    }

    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        saleItems: true,
      },
    });
    if (!sale) {
      return res.status(404).json({ error: "Sale not found" });
    }

    const scope = await buildScope(prisma, req.user?.userId || 0);
    ensureIdScope(scope, "shop", sale.shopId);
    const access = await getRequesterAccessContext(req.user?.userId || 0);
    const canEdit = canEditSaleForUser(sale, req.user?.userId || 0, access);
    if (!canEdit) {
      return res.status(403).json({ error: "You do not have permission to edit this sale" });
    }

    if ((sale.transactionStatus || "open") === "closed" && !access.isAdmin && !access.canSalesOpenClose) {
      return res.status(403).json({ error: "This sale transaction is closed and cannot be edited" });
    }

    const {
      customerId,
      discount,
      paymentType,
      bankAccountId,
      cashRegisterId,
      paidAmount,
      items,
    } = req.body || {};

    const normalizedItems = Array.isArray(items) && items.length > 0
      ? items
      : sale.saleItems.map((si) => ({
          type: si.productId ? "product" : "material",
          itemId: si.productId || si.materialId,
          quantity: Number(si.quantity || 0),
          unitPrice: Number(si.unitPrice || 0),
          selectedName: si.selectedName || null,
          selectedUnit: si.selectedUnit || null,
          selectedQuantity: si.selectedQuantity || null,
          batchNumber: si.batchNumber || null,
          expiryDate: si.expiryDate || null,
          warrantyEnabled: false,
          warrantyExpiryDate: null,
          warrantyNotes: si.warrantyNotes || null,
          warrantySerial: si.warrantySerial || null,
        }));

    if (!Array.isArray(normalizedItems) || normalizedItems.length === 0) {
      return res.status(400).json({ error: "At least one sale item is required" });
    }
    for (const item of normalizedItems) {
      if (!item.type || !["product", "material"].includes(item.type)) {
        return res.status(400).json({ error: "Each item must have a valid type" });
      }
      if (!item.itemId || Number(item.itemId) <= 0) {
        return res.status(400).json({ error: "Each item must have a valid itemId" });
      }
      if (!Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0) {
        return res.status(400).json({ error: "Each item must have quantity > 0" });
      }
      if (!Number.isFinite(Number(item.unitPrice)) || Number(item.unitPrice) <= 0) {
        return res.status(400).json({ error: "Each item must have unitPrice > 0" });
      }
    }

    const normalizedPaymentType = String(paymentType || sale.paymentType || "cash").toLowerCase();
    const oldPaid = Number(sale.paidAmount || 0);
    const requestedPaid = paidAmount !== undefined && paidAmount !== null ? Number(paidAmount) : oldPaid;
    if (!Number.isFinite(requestedPaid) || requestedPaid < 0) {
      return res.status(400).json({ error: "paidAmount must be a non-negative number" });
    }

    const totalAmount = normalizedItems.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0);
    const newDiscount = discount !== undefined ? Math.max(0, Number(discount) || 0) : Number(sale.discount || 0);
    const newGrandTotal = Math.max(0, totalAmount - newDiscount);
    const deltaPaid = requestedPaid - oldPaid;
    const editUsageUpdate = getEditUsageUpdateOnSuccessfulEdit(
      sale,
      req.user?.userId || 0,
      new Date()
    );

    if (deltaPaid !== 0 && ["bank", "card"].includes(normalizedPaymentType) && !bankAccountId) {
      return res.status(400).json({ error: "Bank account is required for bank/card payment adjustment" });
    }
    if (deltaPaid > 0 && normalizedPaymentType === "cash" && !cashRegisterId) {
      return res.status(400).json({ error: "Cash register is required for positive cash adjustment" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const entityAccount = await tx.entityAccount.findFirst({
        where: {
          entityType: "shop",
          entityId: sale.shopId,
          isPrimary: true,
        },
        include: { account: true },
      });
      if (!entityAccount) {
        throw new Error("No primary account found for this shop");
      }

      // 1) Revert old stock
      for (const oldItem of sale.saleItems) {
        if (oldItem.productId) {
          await tx.shopProduct.update({
            where: {
              shop_id_product_id: {
                shop_id: sale.shopId,
                product_id: oldItem.productId,
              },
            },
            data: { stock: { increment: Number(oldItem.quantity || 0) } },
          });
          await tx.product.update({
            where: { id: oldItem.productId },
            data: { stock: { increment: Number(oldItem.quantity || 0) } },
          });
        } else if (oldItem.materialId) {
          await tx.shopMaterial.update({
            where: {
              shop_id_material_id: {
                shop_id: sale.shopId,
                material_id: oldItem.materialId,
              },
            },
            data: { stock: { increment: Number(oldItem.quantity || 0) } },
          });
          await tx.material.update({
            where: { id: oldItem.materialId },
            data: { current_stock: { increment: Number(oldItem.quantity || 0) } },
          });
        }
      }

      // 2) Apply new stock and compute avg cost
      const preparedItems = [];
      for (const item of normalizedItems) {
        const qty = Number(item.quantity);
        if (item.type === "product") {
          const shopProduct = await tx.shopProduct.findUnique({
            where: {
              shop_id_product_id: {
                shop_id: sale.shopId,
                product_id: Number(item.itemId),
              },
            },
            include: { product: true },
          });
          if (!shopProduct) throw new Error(`Product ${item.itemId} not found in shop`);
          if (Number(shopProduct.stock || 0) < qty) {
            throw new Error(`Insufficient stock for product ${item.itemId}. Available: ${shopProduct.stock}, Requested: ${qty}`);
          }

          await tx.shopProduct.update({
            where: {
              shop_id_product_id: {
                shop_id: sale.shopId,
                product_id: Number(item.itemId),
              },
            },
            data: { stock: { decrement: qty } },
          });
          await tx.product.update({
            where: { id: Number(item.itemId) },
            data: { stock: { decrement: qty } },
          });

          preparedItems.push({
            ...item,
            quantity: qty,
            unitPrice: Number(item.unitPrice),
            avg_cost: Number(shopProduct.avg_cost || 0),
            productId: Number(item.itemId),
            materialId: null,
          });
        } else {
          const shopMaterial = await tx.shopMaterial.findUnique({
            where: {
              shop_id_material_id: {
                shop_id: sale.shopId,
                material_id: Number(item.itemId),
              },
            },
            include: { material: true },
          });
          if (!shopMaterial) throw new Error(`Material ${item.itemId} not found in shop`);
          if (Number(shopMaterial.stock || 0) < qty) {
            throw new Error(`Insufficient stock for material ${item.itemId}. Available: ${shopMaterial.stock}, Requested: ${qty}`);
          }

          await tx.shopMaterial.update({
            where: {
              shop_id_material_id: {
                shop_id: sale.shopId,
                material_id: Number(item.itemId),
              },
            },
            data: { stock: { decrement: qty } },
          });
          await tx.material.update({
            where: { id: Number(item.itemId) },
            data: { current_stock: { decrement: qty } },
          });

          preparedItems.push({
            ...item,
            quantity: qty,
            unitPrice: Number(item.unitPrice),
            avg_cost: Number(shopMaterial.avg_cost || 0),
            productId: null,
            materialId: Number(item.itemId),
          });
        }
      }

      // 3) Replace sale items
      await tx.saleItem.deleteMany({ where: { saleId } });
      for (const item of preparedItems) {
        await tx.saleItem.create({
          data: {
            saleId,
            productId: item.productId,
            materialId: item.materialId,
            selectedName: item.selectedName ? String(item.selectedName).trim() : null,
            selectedUnit: item.selectedUnit ? String(item.selectedUnit).trim() : null,
            selectedQuantity: item.selectedQuantity !== undefined && item.selectedQuantity !== null ? Number(item.selectedQuantity) : null,
            batchNumber: item.batchNumber ? String(item.batchNumber).trim() : null,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            avg_cost: Number(item.avg_cost || 0),
            totalPrice: Number(item.quantity) * Number(item.unitPrice),
            warrantySerial: item.warrantySerial ? String(item.warrantySerial).trim() : null,
            warrantyNotes: item.warrantyNotes ? String(item.warrantyNotes).trim() : null,
          },
        });
      }

      // 4) Update sale financials
      const updatedSale = await tx.sale.update({
        where: { id: saleId },
        data: {
          customerId: customerId ? Number(customerId) : null,
          totalAmount,
          discount: newDiscount,
          grandTotal: newGrandTotal,
          paidAmount: requestedPaid,
          paymentType: normalizedPaymentType,
          bankAccountId: ["bank", "card"].includes(normalizedPaymentType) && bankAccountId ? Number(bankAccountId) : null,
          ...editUsageUpdate,
        },
      });

      // 5) Customer contribution rebalance
      const oldDue = Math.max(0, Number(sale.grandTotal || 0) - oldPaid);
      const newDue = Math.max(0, newGrandTotal - requestedPaid);
      if (sale.customerId) {
        await tx.customer.update({
          where: { id: Number(sale.customerId) },
          data: {
            total_purchase: { decrement: oldPaid },
            total_due: { decrement: oldDue },
          },
        });
      }
      if (customerId) {
        await tx.customer.update({
          where: { id: Number(customerId) },
          data: {
            total_purchase: { increment: requestedPaid },
            total_due: { increment: newDue },
          },
        });
      }

      // 6) Apply payment delta (account + channel + transaction log)
      if (deltaPaid !== 0) {
        const updatedAccount = await tx.accounts.update({
          where: { id: entityAccount.accountId },
          data: { balance: { increment: deltaPaid } },
        });

        let bankRecord = null;
        let cashRegisterRecord = null;
        if (["bank", "card"].includes(normalizedPaymentType) && bankAccountId) {
          bankRecord = await tx.bankAccount.update({
            where: { id: Number(bankAccountId) },
            data: { current_balance: { increment: deltaPaid } },
          });
        }
        if (normalizedPaymentType === "cash" && cashRegisterId) {
          const registerId = Number(cashRegisterId);
          const assignment = await tx.cashRegisterAssignment.findFirst({
            where: {
              entityType: "shop",
              entityId: sale.shopId,
              cashRegisterId: registerId,
              isActive: true,
            },
          });
          if (!assignment) throw new Error("Selected cash register is not assigned to this shop");
          cashRegisterRecord = await tx.cashRegister.update({
            where: { id: registerId },
            data: { cash_in_hand: { increment: deltaPaid } },
          });
        }

        await createTransaction(tx, {
          reference: `SALE-EDIT-${Date.now()}`,
          createdById: req.user?.userId || 1,
          cashRegisterId: cashRegisterRecord ? cashRegisterRecord.id : null,
          accountId: entityAccount.accountId,
          bankAccountId: bankRecord ? bankRecord.id : null,
          saleId: updatedSale.id,
          purpose: "Sale Edit Adjustment",
          added_to_account: true,
          amount: deltaPaid,
          payment_method: normalizedPaymentType,
          current_account_balance: updatedAccount.balance,
          note: `Adjustment from sale edit (${sale.reference})`,
        });
      }

      if (requestedPaid > newGrandTotal) {
        await createNotification(tx, {
          title: `Overpayment detected on sale ${sale.reference}`,
          description: `Edited paid amount (${requestedPaid.toFixed(2)}) is greater than grand total (${newGrandTotal.toFixed(2)}). Admin may add negative payment adjustment.`,
          forRole: "admin",
          link: "/sale/all",
        });
      }

      return updatedSale;
    });

    res.json(result);
  } catch (err) {
    if (err.status === 403) {
      return res.status(403).json({ error: "Forbidden" });
    }
    res.status(500).json({ error: err.message });
  }
});

// Delete sale and rollback all linked payment balances
router.delete("/:id", async (req, res) => {
  try {
    const saleId = parseInt(req.params.id);
    if (isNaN(saleId)) {
      return res.status(400).json({ error: "Invalid sale ID" });
    }

    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        saleItems: true,
        saleReturns: { include: { returnItems: true } },
      }
    });
    if (!sale) {
      return res.status(404).json({ error: "Sale not found" });
    }

    const scope = await buildScope(prisma, req.user?.userId || 0);
    ensureIdScope(scope, "shop", sale.shopId);
    const access = await getRequesterAccessContext(req.user?.userId || 0);
    const canDelete = canEditSaleForUser(sale, req.user?.userId || 0, access);
    if (!canDelete) {
      return res.status(403).json({ error: "You do not have permission to delete this sale" });
    }
    await prisma.$transaction(async (tx) => {
      for (const saleReturn of sale.saleReturns || []) {
        for (const item of saleReturn.returnItems || []) {
          const qty = parseFloat(item.quantity || 0);
          if (qty <= 0) continue;
          if (item.productId) {
            await tx.shopProduct.updateMany({
              where: { shop_id: sale.shopId, product_id: item.productId },
              data: { stock: { decrement: qty } },
            });
            await tx.product.updateMany({
              where: { id: item.productId },
              data: { stock: { decrement: qty } },
            });
          }
          if (item.materialId) {
            await tx.shopMaterial.updateMany({
              where: { shop_id: sale.shopId, material_id: item.materialId },
              data: { stock: { decrement: qty } },
            });
            await tx.material.updateMany({
              where: { id: item.materialId },
              data: { current_stock: { decrement: qty } },
            });
          }
        }
      }

      for (const item of sale.saleItems) {
        if (item.productId) {
          await tx.shopProduct.update({
            where: {
              shop_id_product_id: {
                shop_id: sale.shopId,
                product_id: item.productId
              }
            },
            data: { stock: { increment: parseFloat(item.quantity) } }
          });
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: parseFloat(item.quantity) } }
          });
        }
        if (item.materialId) {
          await tx.shopMaterial.update({
            where: {
              shop_id_material_id: {
                shop_id: sale.shopId,
                material_id: item.materialId
              }
            },
            data: { stock: { increment: parseFloat(item.quantity) } }
          });
          await tx.material.update({
            where: { id: item.materialId },
            data: { current_stock: { increment: parseFloat(item.quantity) } }
          });
        }
      }

      await tx.saleReturnItem.deleteMany({ where: { saleReturn: { saleId } } });
      await tx.saleReturn.deleteMany({ where: { saleId } });
      await tx.warrantyClaim.deleteMany({ where: { warranty: { saleId } } });
      await tx.userWarranty.deleteMany({ where: { saleId } });
      await rollbackAndDeleteTransactionsByWhere(tx, { saleId }, { reverseBalances: true });
      await tx.saleItem.deleteMany({ where: { saleId } });
      await tx.sale.delete({ where: { id: saleId } });
    });

    res.json({ success: true, message: "Sale deleted successfully" });
  } catch (err) {
    if (err.status === 403) {
      return res.status(403).json({ error: "Forbidden" });
    }
    res.status(500).json({ error: err.message });
  }
});

registerShopSaleReturnRoutes({ router, prisma, buildScope, ensureIdScope });
module.exports = router;
