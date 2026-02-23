const express = require("express");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const router = express.Router();
const { createTransaction } = require('../utils/transactionHelper');
const { createNotification } = require('../utils/notificationHelper');
const { buildScope, ensureTypeScope, ensureIdScope } = require("../utils/associateScope");
const { getAvailableBatches, decrementBatch } = require("../utils/batchDetails");

const isAdminPermission = (permissionName) => permissionName === "admin" || permissionName === "superadmin";
const isSameCalendarDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const getRequesterAccessContext = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: Number(userId) },
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
  const hasSaleGrant = (sale.editStatus || "closed") === "open" && Number(sale.editGrantedToUserId || 0) === Number(requesterId || 0);

  if (access.isAdmin || access.canSalesOpenClose || access.canEditAnyDay) return true;
  if (hasSaleGrant) return true;
  if (isTodaySale && (access.canEditToday || isCreator)) return true;

  return false;
};

const mapSaleWithPermissions = (sale, requesterId, access) => {
  const canEdit = canEditSaleForUser(sale, requesterId, access);
  const canDelete = canEdit;
  const canCloseTransaction = access?.isAdmin || access?.canSalesOpenClose;

  return {
    ...sale,
    canEdit,
    canDelete,
    canGrantSaleEdit: !!(access?.canGrantSaleEdit),
    canCloseTransaction: !!canCloseTransaction,
    isTransactionClosed: (sale.transactionStatus || "open") === "closed",
    isSaleEditOpen: (sale.editStatus || "closed") === "open",
  };
};

// Get all shops for POS
router.get("/shops", async (req, res) => {
  try {
    const scope = await buildScope(prisma, req.user?.userId || 0);
    if (!scope.isAdmin) {
      ensureTypeScope(scope, "shop");
    }
    const where = scope.isAdmin ? {} : { id: { in: Array.from(scope.shops) } };

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
    
    // Fetch shop products
    const shopProducts = await prisma.shopProduct.findMany({
      where: { 
        shop_id: parseInt(shopId),
        ...(search ? {
          product: {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { barcode: { contains: search, mode: 'insensitive' } },
              { category: { contains: search, mode: 'insensitive' } }
            ]
          }
        } : {})
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
        ...(search ? {
          material: {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { barcode: { contains: search, mode: 'insensitive' } },
              { brand: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } }
            ]
          }
        } : {})
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
        const existingRegister = await tx.cashRegister.findUnique({
          where: { id: registerId },
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
          transactionStatus: "open",
          editStatus: "open",
          editGrantedToUserId: req.user?.userId || null,
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

router.get("/warranties", async (req, res) => {
  try {
    const { status, mobile, serial, customer, item, itemType, expiryFrom, expiryTo, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status) where.status = String(status);
    if (serial) where.serialNumber = { contains: String(serial) };
    if (customer) {
      where.customer = {
        ...(where.customer || {}),
        name: { contains: String(customer) }
      };
    }
    if (mobile) {
      where.customer = {
        ...(where.customer || {}),
        mobile: { contains: String(mobile) }
      };
    }
    if (itemType === "product") {
      where.product = { name: { contains: String(item || "") } };
    } else if (itemType === "material") {
      where.material = { name: { contains: String(item || "") } };
    } else if (item) {
      where.OR = [
        { product: { name: { contains: String(item) } } },
        { material: { name: { contains: String(item) } } },
      ];
    }
    if (expiryFrom || expiryTo) {
      where.endDate = {};
      if (expiryFrom) where.endDate.gte = new Date(expiryFrom);
      if (expiryTo) where.endDate.lte = new Date(expiryTo);
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const [rows, total] = await prisma.$transaction([
      prisma.userWarranty.findMany({
        where,
        include: {
          product: { select: { id: true, name: true, barcode: true } },
          material: { select: { id: true, name: true, barcode: true } },
          customer: { select: { id: true, name: true, mobile: true } },
          sale: { select: { id: true, reference: true, createdAt: true } },
          saleItem: { select: { id: true, quantity: true, unitPrice: true } },
          claims: {
            orderBy: { createdAt: "desc" },
            take: 1,
          }
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.userWarranty.count({ where }),
    ]);

    res.json({ data: rows, total, page: parseInt(page, 10), limit: take });
  } catch (error) {
    console.error("Warranty list error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch warranties" });
  }
});

router.put("/warranties/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { notes, endDate, status } = req.body;
    if (!id) {
      return res.status(400).json({ error: "Invalid id" });
    }
    const updated = await prisma.userWarranty.update({
      where: { id },
      data: {
        notes: notes !== undefined ? String(notes || "") : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        status: status ? String(status) : undefined,
      },
    });
    res.json(updated);
  } catch (error) {
    console.error("Warranty edit error:", error);
    res.status(500).json({ error: error.message || "Failed to update warranty" });
  }
});

router.get("/warranties/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const warranty = await prisma.userWarranty.findUnique({
      where: { id },
      include: {
        product: { select: { id: true, name: true, barcode: true, category: true } },
        material: { select: { id: true, name: true, barcode: true, unit: true, brand: true } },
        customer: { select: { id: true, name: true, mobile: true, email: true, address: true } },
        sale: { select: { id: true, reference: true, createdAt: true, shopId: true, paymentType: true, grandTotal: true } },
        saleItem: { select: { id: true, quantity: true, unitPrice: true, totalPrice: true, batchNumber: true, expiryDate: true } },
        claims: {
          orderBy: { createdAt: "desc" }
        }
      }
    });

    if (!warranty) {
      return res.status(404).json({ error: "Warranty not found" });
    }

    res.json(warranty);
  } catch (error) {
    console.error("Warranty details error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch warranty details" });
  }
});

router.delete("/warranties/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) {
      return res.status(400).json({ error: "Invalid id" });
    }
    await prisma.userWarranty.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error("Warranty delete error:", error);
    res.status(500).json({ error: error.message || "Failed to delete warranty" });
  }
});

router.post("/warranties/:id/claims", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { receivingDate, providingDate, issueDescription, resolution, status = "received", note } = req.body;
    if (!id || !receivingDate) {
      return res.status(400).json({ error: "warranty id and receivingDate are required" });
    }
    const warranty = await prisma.userWarranty.findUnique({ where: { id } });
    if (!warranty) {
      return res.status(404).json({ error: "Warranty not found" });
    }

    const latestClaim = await prisma.warrantyClaim.findFirst({
      where: { warrantyId: id },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true },
    });
    const closedStatuses = new Set(["hand_over", "handover", "completed", "closed", "resolved"]);
    if (latestClaim && !closedStatuses.has(String(latestClaim.status || "").toLowerCase())) {
      return res.status(400).json({
        error: "Previous claim is still open. Please hand over/close it before creating a new claim.",
      });
    }

    const claim = await prisma.$transaction(async (tx) => {
      const created = await tx.warrantyClaim.create({
        data: {
          warrantyId: id,
          receivingDate: new Date(receivingDate),
          providingDate: providingDate ? new Date(providingDate) : null,
          issueDescription: issueDescription || null,
          resolution: resolution || null,
          status: String(status),
          note: note || null,
        },
      });

      await tx.userWarranty.update({
        where: { id },
        data: {
          status: "claimed",
          claimedAt: new Date(),
          claimCount: { increment: 1 },
        },
      });

      return created;
    });

    res.status(201).json(claim);
  } catch (error) {
    console.error("Warranty claim create error:", error);
    res.status(500).json({ error: error.message || "Failed to create warranty claim" });
  }
});

router.put("/warranties/:warrantyId/claims/:claimId", async (req, res) => {
  try {
    const warrantyId = parseInt(req.params.warrantyId, 10);
    const claimId = parseInt(req.params.claimId, 10);
    const { status, issueDescription, resolution, note, providingDate } = req.body;

    if (!warrantyId || !claimId || !status) {
      return res.status(400).json({ error: "warrantyId, claimId and status are required" });
    }

    const existing = await prisma.warrantyClaim.findFirst({
      where: { id: claimId, warrantyId },
      select: { id: true, warrantyId: true, status: true, providingDate: true },
    });
    if (!existing) {
      return res.status(404).json({ error: "Claim not found" });
    }

    const normalizedStatus = String(status).trim().toLowerCase();
    const handOverStatuses = new Set(["hand_over", "handover", "completed", "closed", "resolved"]);
    const shouldSetProvidingDate = handOverStatuses.has(normalizedStatus);

    const updatedClaim = await prisma.$transaction(async (tx) => {
      const updated = await tx.warrantyClaim.update({
        where: { id: claimId },
        data: {
          status: normalizedStatus,
          issueDescription: issueDescription !== undefined ? (issueDescription || null) : undefined,
          resolution: resolution !== undefined ? (resolution || null) : undefined,
          note: note !== undefined ? (note || null) : undefined,
          providingDate:
            providingDate
              ? new Date(providingDate)
              : shouldSetProvidingDate
                ? (existing.providingDate || new Date())
                : undefined,
        },
      });

      await tx.userWarranty.update({
        where: { id: warrantyId },
        data: {
          status: shouldSetProvidingDate ? "active" : "claimed",
          claimedAt: shouldSetProvidingDate ? undefined : new Date(),
        },
      });

      return updated;
    });

    res.json(updatedClaim);
  } catch (error) {
    console.error("Warranty claim update error:", error);
    res.status(500).json({ error: error.message || "Failed to update warranty claim" });
  }
});

router.put("/warranties/:id/status", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { status, notes } = req.body;
    if (!id || !status) {
      return res.status(400).json({ error: "id and status are required" });
    }
    const allowed = ["active", "claimed", "expired", "void"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Allowed: ${allowed.join(", ")}` });
    }

    const updated = await prisma.userWarranty.update({
      where: { id },
      data: {
        status,
        notes: notes !== undefined ? String(notes || "") : undefined,
        claimedAt: status === "claimed" ? new Date() : undefined,
        voidedAt: status === "void" ? new Date() : undefined,
        claimCount: status === "claimed" ? { increment: 1 } : undefined,
      },
    });
    res.json(updated);
  } catch (error) {
    console.error("Warranty status update error:", error);
    res.status(500).json({ error: error.message || "Failed to update warranty status" });
  }
});

// Get all shop sales with both product and material details (with pagination)
router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const scope = await buildScope(prisma, req.user?.userId || 0);
    if (!scope.isAdmin && scope.shops.size === 0) {
      const err = new Error("Forbidden");
      err.status = 403;
      throw err;
    }
    const where = scope.isAdmin ? { shopId: { not: null } } : { shopId: { in: Array.from(scope.shops) } };

    // Get total count for pagination
    const totalCount = await prisma.sale.count({ where });

    // Get paginated sales
    const sales = await prisma.sale.findMany({
      where,
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            shop_keeper: true,
          },
        },
        transactions: {
          orderBy: { createdAt: "desc" },
          include: {
            account: true,
            createdBy: {
              select: { id: true, name: true, email: true }
            },
            bankAccount: true
          }
        },
        saleItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                barcode: true,
                unit: true,
                sale_price: true,
              },
            },
            material: {
              select: {
                id: true,
                name: true,
                barcode: true,
                unit: true,
                sale_price: true,
              },
            },
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            mobile: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    });

    const access = await getRequesterAccessContext(req.user?.userId || 0);
    const salesWithAccess = sales.map((sale) =>
      mapSaleWithPermissions(sale, req.user?.userId || 0, access)
    );

    res.json({
      sales: salesWithAccess,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / take),
        totalCount,
        limit: take
      }
    });
  } catch (err) {
    if (err.status === 403) {
      return res.status(403).json({ error: "Forbidden" });
    }
    res.status(500).json({ error: err.message });
  }
});

// Open sale for edit to a specific user (one user at a time)
router.post("/:id/edit-access/open", async (req, res) => {
  try {
    const saleId = parseInt(req.params.id, 10);
    const targetUserId = parseInt(req.body?.userId, 10);
    if (!saleId || !targetUserId) {
      return res.status(400).json({ error: "sale id and userId are required" });
    }

    const sale = await prisma.sale.findUnique({ where: { id: saleId } });
    if (!sale) return res.status(404).json({ error: "Sale not found" });

    const scope = await buildScope(prisma, req.user?.userId || 0);
    ensureIdScope(scope, "shop", sale.shopId);

    const access = await getRequesterAccessContext(req.user?.userId || 0);
    if (!access.canGrantSaleEdit) {
      return res.status(403).json({ error: "You do not have permission to open sale edit access" });
    }

    if ((sale.editStatus || "closed") === "open" && Number(sale.editGrantedToUserId || 0) !== targetUserId) {
      return res.status(409).json({
        error: `Sale is already open for another user (userId: ${sale.editGrantedToUserId}). Close it first.`,
      });
    }

    const updated = await prisma.sale.update({
      where: { id: saleId },
      data: {
        editStatus: "open",
        editGrantedToUserId: targetUserId,
        editGrantedByUserId: req.user?.userId || null,
        editOpenedAt: new Date(),
      },
    });

    return res.json({ success: true, sale: updated });
  } catch (err) {
    if (err.status === 403) return res.status(403).json({ error: "Forbidden" });
    return res.status(500).json({ error: err.message });
  }
});

// Request sale edit access (for users without direct grant rights)
router.post("/:id/edit-access/request", async (req, res) => {
  try {
    const saleId = parseInt(req.params.id, 10);
    if (!saleId) {
      return res.status(400).json({ error: "Invalid sale ID" });
    }

    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        shop: { select: { id: true, name: true } },
      },
    });
    if (!sale) return res.status(404).json({ error: "Sale not found" });

    const scope = await buildScope(prisma, req.user?.userId || 0);
    ensureIdScope(scope, "shop", sale.shopId);

    const requester = await prisma.user.findUnique({
      where: { id: req.user?.userId || 0 },
      select: { id: true, name: true, username: true, email: true },
    });

    const existingPending = await prisma.saleEditAccessRequest.findFirst({
      where: {
        saleId,
        requesterUserId: req.user?.userId || 0,
        status: "pending",
      },
      select: { id: true },
    });
    if (existingPending) {
      return res.status(409).json({ error: "You already have a pending request for this sale." });
    }

    const requestRow = await prisma.saleEditAccessRequest.create({
      data: {
        saleId,
        requesterUserId: req.user?.userId || 0,
        status: "pending",
      },
    });

    await createNotification(prisma, {
      title: `Edit access request for sale ${sale.reference}`,
      description: `User ${requester?.name || requester?.username || requester?.email || req.user?.userId} requested edit access for sale ${sale.reference} at ${sale.shop?.name || "shop"}. Request ID: ${requestRow.id}`,
      forRole: "admin",
      link: "/sale/edit-requests",
    });

    return res.json({ success: true, message: "Edit access request sent to admin." });
  } catch (err) {
    if (err.status === 403) return res.status(403).json({ error: "Forbidden" });
    return res.status(500).json({ error: err.message });
  }
});

// List sale edit access requests
router.get("/edit-access/requests", async (req, res) => {
  try {
    const status = String(req.query.status || "pending").toLowerCase();
    const allowedStatuses = new Set(["pending", "approved", "rejected", "all"]);
    if (!allowedStatuses.has(status)) {
      return res.status(400).json({ error: "Invalid status filter" });
    }

    const access = await getRequesterAccessContext(req.user?.userId || 0);
    if (!access.canGrantSaleEdit) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const scope = await buildScope(prisma, req.user?.userId || 0);
    const saleWhere = scope.isAdmin ? {} : { shopId: { in: Array.from(scope.shops) } };
    const allowedSales = await prisma.sale.findMany({
      where: saleWhere,
      select: { id: true },
    });
    const allowedSaleIds = allowedSales.map((s) => s.id);

    if (allowedSaleIds.length === 0) {
      return res.json({ rows: [] });
    }

    const where = {
      saleId: { in: allowedSaleIds },
      ...(status === "all" ? {} : { status }),
    };

    const rows = await prisma.saleEditAccessRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        sale: {
          select: {
            id: true,
            reference: true,
            shopId: true,
            editStatus: true,
            editGrantedToUserId: true,
            transactionStatus: true,
            createdAt: true,
            shop: { select: { id: true, name: true } },
          },
        },
      },
    });

    const requesterIds = Array.from(new Set(rows.map((r) => r.requesterUserId).filter(Boolean)));
    const resolverIds = Array.from(new Set(rows.map((r) => r.resolvedByUserId).filter(Boolean)));
    const users = await prisma.user.findMany({
      where: { id: { in: Array.from(new Set([...requesterIds, ...resolverIds])) } },
      select: { id: true, name: true, username: true, email: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const enriched = rows.map((row) => ({
      ...row,
      requester: userMap.get(row.requesterUserId) || null,
      resolvedBy: row.resolvedByUserId ? (userMap.get(row.resolvedByUserId) || null) : null,
    }));

    return res.json({ rows: enriched });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Approve sale edit request and open access for requested user
router.post("/edit-access/requests/:requestId/approve", async (req, res) => {
  try {
    const requestId = parseInt(req.params.requestId, 10);
    if (!requestId) return res.status(400).json({ error: "Invalid request ID" });

    const access = await getRequesterAccessContext(req.user?.userId || 0);
    if (!access.canGrantSaleEdit) return res.status(403).json({ error: "Forbidden" });

    const requestRow = await prisma.saleEditAccessRequest.findUnique({ where: { id: requestId } });
    if (!requestRow) return res.status(404).json({ error: "Request not found" });
    if (requestRow.status !== "pending") return res.status(400).json({ error: "Request is not pending" });

    const sale = await prisma.sale.findUnique({ where: { id: requestRow.saleId } });
    if (!sale) return res.status(404).json({ error: "Sale not found" });

    const scope = await buildScope(prisma, req.user?.userId || 0);
    ensureIdScope(scope, "shop", sale.shopId);

    if ((sale.editStatus || "closed") === "open" && Number(sale.editGrantedToUserId || 0) !== Number(requestRow.requesterUserId)) {
      return res.status(409).json({ error: "Sale is already open for another user. Close it first." });
    }

    await prisma.$transaction(async (tx) => {
      await tx.sale.update({
        where: { id: sale.id },
        data: {
          editStatus: "open",
          editGrantedToUserId: requestRow.requesterUserId,
          editGrantedByUserId: req.user?.userId || null,
          editOpenedAt: new Date(),
        },
      });

      await tx.saleEditAccessRequest.update({
        where: { id: requestId },
        data: {
          status: "approved",
          resolvedByUserId: req.user?.userId || null,
          resolvedAt: new Date(),
        },
      });
    });

    await createNotification(prisma, {
      title: `Edit access approved for sale ${sale.reference}`,
      description: `Your request to edit sale ${sale.reference} was approved.`,
      forRole: "admin",
      link: "/sale/all",
    });

    return res.json({ success: true });
  } catch (err) {
    if (err.status === 403) return res.status(403).json({ error: "Forbidden" });
    return res.status(500).json({ error: err.message });
  }
});

// Reject sale edit request
router.post("/edit-access/requests/:requestId/reject", async (req, res) => {
  try {
    const requestId = parseInt(req.params.requestId, 10);
    if (!requestId) return res.status(400).json({ error: "Invalid request ID" });

    const access = await getRequesterAccessContext(req.user?.userId || 0);
    if (!access.canGrantSaleEdit) return res.status(403).json({ error: "Forbidden" });

    const requestRow = await prisma.saleEditAccessRequest.findUnique({ where: { id: requestId } });
    if (!requestRow) return res.status(404).json({ error: "Request not found" });
    if (requestRow.status !== "pending") return res.status(400).json({ error: "Request is not pending" });

    const sale = await prisma.sale.findUnique({ where: { id: requestRow.saleId } });
    if (!sale) return res.status(404).json({ error: "Sale not found" });

    const scope = await buildScope(prisma, req.user?.userId || 0);
    ensureIdScope(scope, "shop", sale.shopId);

    await prisma.saleEditAccessRequest.update({
      where: { id: requestId },
      data: {
        status: "rejected",
        resolvedByUserId: req.user?.userId || null,
        resolvedAt: new Date(),
      },
    });

    return res.json({ success: true });
  } catch (err) {
    if (err.status === 403) return res.status(403).json({ error: "Forbidden" });
    return res.status(500).json({ error: err.message });
  }
});

// Close sale edit access
router.post("/:id/edit-access/close", async (req, res) => {
  try {
    const saleId = parseInt(req.params.id, 10);
    if (!saleId) return res.status(400).json({ error: "Invalid sale ID" });

    const sale = await prisma.sale.findUnique({ where: { id: saleId } });
    if (!sale) return res.status(404).json({ error: "Sale not found" });

    const scope = await buildScope(prisma, req.user?.userId || 0);
    ensureIdScope(scope, "shop", sale.shopId);

    const access = await getRequesterAccessContext(req.user?.userId || 0);
    const isGrantedUser = Number(sale.editGrantedToUserId || 0) === Number(req.user?.userId || 0);
    if (!access.canGrantSaleEdit && !isGrantedUser) {
      return res.status(403).json({ error: "You do not have permission to close sale edit access" });
    }

    const updated = await prisma.sale.update({
      where: { id: saleId },
      data: {
        editStatus: "closed",
        editClosedAt: new Date(),
      },
    });

    return res.json({ success: true, sale: updated });
  } catch (err) {
    if (err.status === 403) return res.status(403).json({ error: "Forbidden" });
    return res.status(500).json({ error: err.message });
  }
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
        const existingRegister = await tx.cashRegister.findUnique({
          where: { id: registerId },
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

// Delete sale (only if no payments)
router.delete("/:id", async (req, res) => {
  try {
    const saleId = parseInt(req.params.id);
    if (isNaN(saleId)) {
      return res.status(400).json({ error: "Invalid sale ID" });
    }

    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: { saleItems: true }
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
    if ((parseFloat(sale.paidAmount) || 0) > 0) {
      return res.status(400).json({ error: "Cannot delete sale with payments" });
    }

    await prisma.$transaction(async (tx) => {
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

      await tx.saleItem.deleteMany({ where: { saleId } });
      await tx.transactions.deleteMany({ where: { saleId } });
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

// Get sale return by ID - FIXED VERSION
router.get("/returns/:id", async (req, res) => {
  console.log(`📥 GET /returns/${req.params.id} called`);
  
  try {
    // Validate the ID parameter
    const returnId = parseInt(req.params.id);
    
    if (isNaN(returnId)) {
      return res.status(400).json({ 
        error: "Invalid return ID. Must be a number." 
      });
    }
    
    console.log(`Looking for sale return with ID: ${returnId}`);
    
    // Use findFirst instead of findUnique if findUnique is causing issues
    const saleReturn = await prisma.saleReturn.findFirst({
      where: { 
        id: returnId,  // Make sure this is correctly typed
        shopId: { not: null } // Additional filter if needed
      },
      include: {
        sale: {
          include: {
            shop: true,
            saleItems: {
              include: {
                product: true,
                material: true
              }
            }
          }
        },
        shop: true,
        returnItems: {
          include: {
            product: true,
            material: true
          }
        }
      }
    });

    console.log("Sale return found:", !!saleReturn);
    
    if (!saleReturn) {
      return res.status(404).json({ 
        error: `Sale return with ID ${returnId} not found` 
      });
    }

    const scope = await buildScope(prisma, req.user?.userId || 0);
    ensureIdScope(scope, "shop", saleReturn.shopId);

    res.json(saleReturn);
  } catch (err) {
    console.error(`❌ Error in /returns/${req.params.id}:`, err.message);
    console.error("Full error:", err);
    
    if (err.status === 403) {
      return res.status(403).json({ error: "Forbidden" });
    }
    res.status(500).json({ 
      error: "Failed to fetch sale return",
      details: err.message 
    });
  }
});

// Get return-eligible sales for a shop with pagination (UPDATED)
router.get("/return-eligible", async (req, res) => {
  try {
    const { shopId, page = 1, limit = 10 } = req.query;
    
    console.log(`📥 GET /return-eligible called with shopId: ${shopId}, page: ${page}, limit: ${limit}`);
    
    if (!shopId) {
      return res.status(400).json({ error: 'Shop ID is required' });
    }

    const shopIdInt = parseInt(shopId);
    if (isNaN(shopIdInt)) {
      return res.status(400).json({ error: 'Invalid Shop ID' });
    }

    // Check if user has access to this shop
    try {
      const scope = await buildScope(prisma, req.user?.userId || 0);
      ensureIdScope(scope, "shop", shopIdInt);
    } catch (scopeError) {
      console.error('Scope error:', scopeError);
      return res.status(403).json({ error: "You don't have access to this shop" });
    }

    const pageInt = parseInt(page);
    const limitInt = parseInt(limit);
    const skip = (pageInt - 1) * limitInt;

    // Get all sales for this shop first (we need to check returnable quantities)
    const allSales = await prisma.sale.findMany({
      where: {
        shopId: shopIdInt,
        // Don't filter by isReturned here - we need to check if any items are still returnable
      },
      include: {
        saleItems: true,
        saleReturns: {
          include: {
            returnItems: true
          }
        }
      }
    });

    // Filter sales that have at least one item with remaining quantity to return
    const eligibleSales = allSales.filter(sale => {
      // Calculate returned quantities for this sale
      const returnedQuantities = {};
      
      if (sale.saleReturns && sale.saleReturns.length > 0) {
        for (const saleReturn of sale.saleReturns) {
          for (const returnItem of saleReturn.returnItems) {
            const key = returnItem.productId 
              ? `product-${returnItem.productId}` 
              : `material-${returnItem.materialId}`;
            
            if (!returnedQuantities[key]) {
              returnedQuantities[key] = 0;
            }
            returnedQuantities[key] += returnItem.quantity;
          }
        }
      }

      // Check if any item still has quantity available for return
      for (const saleItem of sale.saleItems) {
        const key = saleItem.productId 
          ? `product-${saleItem.productId}` 
          : `material-${saleItem.materialId}`;
        
        const returnedQty = returnedQuantities[key] || 0;
        
        if (returnedQty < saleItem.quantity) {
          return true; // This sale has at least one returnable item
        }
      }
      
      return false; // All items are fully returned
    });

    const totalCount = eligibleSales.length;
    
    // Apply pagination to the filtered results
    const paginatedSales = eligibleSales.slice(skip, skip + limitInt);

    // Now fetch the full details for the paginated sales
    const salesWithDetails = await prisma.sale.findMany({
      where: {
        id: { in: paginatedSales.map(s => s.id) }
      },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            shop_keeper: true,
          },
        },
        saleItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                barcode: true,
                sale_price: true,
              },
            },
            material: {
              select: {
                id: true,
                name: true,
                barcode: true,
                unit: true,
                sale_price: true,
              },
            },
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            mobile: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    
    res.json({
      sales: salesWithDetails,
      pagination: {
        currentPage: pageInt,
        totalPages: Math.ceil(totalCount / limitInt),
        totalCount,
        limit: limitInt
      }
    });
  } catch (error) {
    console.error('❌ Error in /return-eligible:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    if (error.code) {
      console.error('Prisma error code:', error.code);
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch sales',
      message: error.message,
      code: error.code || 'UNKNOWN_ERROR'
    });
  }
});

// Process a return (UPDATED VERSION WITH WARRANTY CHECK)
router.post("/return", async (req, res) => {
  try {
    const { saleId, items } = req.body;

    // Validate required fields
    if (!saleId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Sale ID and at least one return item are required" });
    }

    // Validate each return item
    for (const item of items) {
      if (!item.type || !item.itemId || !item.quantity || !item.unitPrice) {
        return res.status(400).json({ 
          error: "Each return item must have type, itemId, quantity, and unitPrice" 
        });
      }
      if (item.quantity <= 0 || item.unitPrice <= 0) {
        return res.status(400).json({ error: "Quantity and unitPrice must be positive numbers" });
      }
      if (!['product', 'material'].includes(item.type)) {
        return res.status(400).json({ error: "Item type must be 'product' or 'material'" });
      }
    }

    const scope = await buildScope(prisma, req.user?.userId || 0);

    const result = await prisma.$transaction(async (tx) => {
      // Get the original sale to validate
      const originalSale = await tx.sale.findUnique({
        where: { id: parseInt(saleId) },
        include: {
          saleItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  warranty: true, // Get warranty days from product
                }
              },
              material: true
            }
          },
          shop: true,
          saleReturns: {
            include: {
              returnItems: true
            }
          }
        }
      });

      if (!originalSale) {
        throw new Error("Sale not found");
      }

      ensureIdScope(scope, "shop", originalSale.shopId);

      if (!originalSale.shopId) {
        throw new Error("This sale is not associated with a shop");
      }

      // Calculate already returned quantities for each item
      const returnedQuantities = {};
      
      if (originalSale.saleReturns && originalSale.saleReturns.length > 0) {
        for (const saleReturn of originalSale.saleReturns) {
          for (const returnItem of saleReturn.returnItems) {
            const key = returnItem.productId 
              ? `product-${returnItem.productId}` 
              : `material-${returnItem.materialId}`;
            
            if (!returnedQuantities[key]) {
              returnedQuantities[key] = 0;
            }
            returnedQuantities[key] += returnItem.quantity;
          }
        }
      }

      // Calculate days between sale and return for warranty check
      const saleDate = new Date(originalSale.createdAt);
      const currentDate = new Date();
      const daysSinceSale = Math.floor((currentDate - saleDate) / (1000 * 60 * 60 * 24));

      // Validate return items against original sale and warranty for products
      for (const returnItem of items) {
        const originalItem = originalSale.saleItems.find(item => {
          if (returnItem.type === "product") {
            return item.productId === parseInt(returnItem.itemId);
          } else {
            return item.materialId === parseInt(returnItem.itemId);
          }
        });

        if (!originalItem) {
          const itemType = returnItem.type === "product" ? "Product" : "Material";
          throw new Error(`${itemType} ${returnItem.itemId} was not part of the original sale`);
        }

        const key = returnItem.type === "product" 
          ? `product-${returnItem.itemId}` 
          : `material-${returnItem.itemId}`;
        
        const alreadyReturned = returnedQuantities[key] || 0;
        const availableForReturn = originalItem.quantity - alreadyReturned;

        if (returnItem.quantity > availableForReturn) {
          const itemType = returnItem.type === "product" ? "Product" : "Material";
          throw new Error(
            `Cannot return more than available for ${itemType} ${returnItem.itemId}. ` +
            `Original: ${originalItem.quantity}, Already returned: ${alreadyReturned}, ` +
            `Available: ${availableForReturn}, Requested: ${returnItem.quantity}`
          );
        }

        // Check warranty for products only
        if (returnItem.type === "product") {
          const productWarrantyDays = originalItem.product?.warranty || 0;
          
          // If product has warranty (warranty days > 0), check if return is within warranty period
          if (productWarrantyDays > 0) {
            if (daysSinceSale > productWarrantyDays) {
              throw new Error(
                `Cannot return product "${originalItem.product?.name}" (ID: ${returnItem.itemId}) as it is outside warranty period. ` +
                `Sale was ${daysSinceSale} days ago, warranty is ${productWarrantyDays} days.`
              );
            }
          }
          // If product has no warranty (warranty days = 0 or null), allow return regardless of time
          // No need to throw error for products without warranty
        }
      }

      // Calculate total return amount
      const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

      // Generate return reference
      const reference = `SR-${Date.now()}`;

      // Create sale return with items
      const saleReturn = await tx.saleReturn.create({
        data: {
          reference,
          saleId: parseInt(saleId),
          shopId: originalSale.shopId,
          totalAmount,
          returnItems: {
            create: items.map(item => ({
              productId: item.type === "product" ? parseInt(item.itemId) : null,
              materialId: item.type === "material" ? parseInt(item.itemId) : null,
              quantity: parseFloat(item.quantity),
              unitPrice: parseFloat(item.unitPrice),
              totalPrice: parseFloat(item.quantity) * parseFloat(item.unitPrice)
            }))
          }
        },
        include: {
          returnItems: {
            include: {
              product: true,
              material: true
            }
          },
          shop: true
        }
      });

      // Update returned quantities tracking
      for (const returnItem of items) {
        const key = returnItem.type === "product" 
          ? `product-${returnItem.itemId}` 
          : `material-${returnItem.itemId}`;
        
        if (!returnedQuantities[key]) {
          returnedQuantities[key] = 0;
        }
        returnedQuantities[key] += returnItem.quantity;
      }

      // Check if all items in the sale are fully returned
      let allItemsFullyReturned = true;
      
      for (const originalItem of originalSale.saleItems) {
        const key = originalItem.productId 
          ? `product-${originalItem.productId}` 
          : `material-${originalItem.materialId}`;
        
        const returnedQty = returnedQuantities[key] || 0;
        
        if (returnedQty < originalItem.quantity) {
          allItemsFullyReturned = false;
          break;
        }
      }

      // Update sale's isReturned status only if all items are fully returned
      if (allItemsFullyReturned) {
        await tx.sale.update({
          where: { id: parseInt(saleId) },
          data: {
            isReturned: true,
            returnedAt: new Date(),
          },
        });
        console.log(`Sale ${saleId} marked as fully returned`);
      } else {
        console.log(`Sale ${saleId} has partial returns, isReturned remains false`);
      }

      // Restore shop stock based on item type
      for (const item of items) {
        if (item.type === "product") {
          // Restore shop product stock
          const existingShopStock = await tx.shopProduct.findUnique({
            where: {
              shop_id_product_id: {
                shop_id: originalSale.shopId,
                product_id: parseInt(item.itemId)
              }
            }
          });

          if (existingShopStock) {
            await tx.shopProduct.update({
              where: {
                shop_id_product_id: {
                  shop_id: originalSale.shopId,
                  product_id: parseInt(item.itemId)
                }
              },
              data: {
                stock: { increment: parseFloat(item.quantity) }
              }
            });
          } else {
            // Create shop product record if it doesn't exist
            await tx.shopProduct.create({
              data: {
                shop_id: originalSale.shopId,
                product_id: parseInt(item.itemId),
                stock: parseFloat(item.quantity)
              }
            });
          }

          // Update global product stock
          await tx.product.update({
            where: { id: parseInt(item.itemId) },
            data: {
              stock: { increment: parseFloat(item.quantity) }
            }
          });

        } else if (item.type === "material") {
          // Restore shop material stock
          const existingShopStock = await tx.shopMaterial.findUnique({
            where: {
              shop_id_material_id: {
                shop_id: originalSale.shopId,
                material_id: parseInt(item.itemId)
              }
            }
          });

          if (existingShopStock) {
            await tx.shopMaterial.update({
              where: {
                shop_id_material_id: {
                  shop_id: originalSale.shopId,
                  material_id: parseInt(item.itemId)
                }
              },
              data: {
                stock: { increment: parseFloat(item.quantity) }
              }
            });
          } else {
            // Create shop material record if it doesn't exist
            await tx.shopMaterial.create({
              data: {
                shop_id: originalSale.shopId,
                material_id: parseInt(item.itemId),
                stock: parseFloat(item.quantity)
              }
            });
          }

          // Update global material stock
          await tx.material.update({
            where: { id: parseInt(item.itemId) },
            data: {
              current_stock: { increment: parseFloat(item.quantity) }
            }
          });
        }
      }

      return { saleReturn, allItemsFullyReturned, daysSinceSale };
    });

    let warrantyMessage = "";
    if (result.daysSinceSale > 0) {
      warrantyMessage = `\nDays since sale: ${result.daysSinceSale}`;
    }

    res.status(201).json({
      message: result.allItemsFullyReturned 
        ? "Return processed successfully. All items have been returned."
        : "Return processed successfully. Partial return completed.",
      return: result.saleReturn,
      fullyReturned: result.allItemsFullyReturned,
      daysSinceSale: result.daysSinceSale
    });

  } catch (err) {
    console.error("Return processing error:", err);

    if (err.status === 403) {
      return res.status(403).json({ error: "Forbidden" });
    }
    
    if (err.message.includes("Sale not found") || 
        err.message.includes("not associated with a shop") ||
        err.message.includes("was not part of the original sale") ||
        err.message.includes("Cannot return more than available") ||
        err.message.includes("outside warranty period")) {
      return res.status(400).json({ error: err.message });
    }
    
    res.status(500).json({ error: "Failed to process return: " + err.message });
  }
});

// NEW: Get all returns for the AllReturns page
router.get("/returns-list", async (req, res) => {
  
  try {
    const scope = await buildScope(prisma, req.user?.userId || 0);
    if (!scope.isAdmin && scope.shops.size === 0) {
      const err = new Error("Forbidden");
      err.status = 403;
      throw err;
    }
    const where = scope.isAdmin ? { shopId: { not: null } } : { shopId: { in: Array.from(scope.shops) } };

    const saleReturns = await prisma.saleReturn.findMany({
      where,
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            shop_keeper: true,
          },
        },
        sale: {
          select: {
            id: true,
            reference: true,
            customer: true,
            createdAt: true,
          },
        },
        returnItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                barcode: true,
                sale_price: true,
              },
            },
            material: {
              select: {
                id: true,
                name: true,
                barcode: true,
                unit: true,
                sale_price: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(saleReturns);
  } catch (err) {
    console.error("❌ Error in /returns-list:", err);
    if (err.status === 403) {
      return res.json([]);
    }
    res.status(500).json({ 
      error: "Failed to fetch returns",
      details: err.message 
    });
  }
});

// Get sale return by ID
router.get("/returns/:id", async (req, res) => {
  try {
    const saleReturn = await prisma.saleReturn.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        sale: {
          include: {
            shop: true,
            saleItems: {
              include: {
                product: true,
                material: true
              }
            }
          }
        },
        shop: true,
        returnItems: {
          include: {
            product: true,
            material: true
          }
        }
      }
    });

    if (!saleReturn) {
      return res.status(404).json({ error: "Sale return not found" });
    }

    const scope = await buildScope(prisma, req.user?.userId || 0);
    ensureIdScope(scope, "shop", saleReturn.shopId);

    res.json(saleReturn);
  } catch (err) {
    if (err.status === 403) {
      return res.json(null);
    }
    res.status(500).json({ error: err.message });
  }
});

// Get returns for a specific sale
router.get("/returns/sale/:saleId", async (req, res) => {
  try {
    const sale = await prisma.sale.findUnique({
      where: { id: parseInt(req.params.saleId) },
      select: { id: true, shopId: true }
    });
    if (!sale) {
      return res.status(404).json({ error: "Sale not found" });
    }

    const scope = await buildScope(prisma, req.user?.userId || 0);
    ensureIdScope(scope, "shop", sale.shopId);

    const saleReturns = await prisma.saleReturn.findMany({
      where: { 
        saleId: parseInt(req.params.saleId)
      },
      include: {
        returnItems: {
          include: {
            product: true,
            material: true
          }
        },
        shop: true
      },
      orderBy: { createdAt: "desc" }
    });

    res.json(saleReturns);
  } catch (err) {
    if (err.status === 403) {
      return res.json([]);
    }
    res.status(500).json({ error: err.message });
  }
});

// Get sale returns statistics (updated for materials)
router.get("/returns/stats", async (req, res) => {
  try {
    const scope = await buildScope(prisma, req.user?.userId || 0);
    if (!scope.isAdmin && scope.shops.size === 0) {
      const err = new Error("Forbidden");
      err.status = 403;
      throw err;
    }
    const where = scope.isAdmin ? { shopId: { not: null } } : { shopId: { in: Array.from(scope.shops) } };

    const totalReturns = await prisma.saleReturn.count({
      where
    });

    const totalReturnAmount = await prisma.saleReturn.aggregate({
      where,
      _sum: {
        totalAmount: true
      }
    });

    // Get unique shops with returns
    const shopsWithReturns = await prisma.saleReturn.groupBy({
      by: ['shopId'],
      where,
      _count: {
        id: true
      }
    });

    const uniqueShopCount = shopsWithReturns.length;

    res.json({
      totalReturns,
      totalReturnAmount: totalReturnAmount._sum.totalAmount || 0,
      uniqueShopCount
    });
  } catch (err) {
    console.error("Error fetching stats:", err);
    if (err.status === 403) {
      return res.json({
        totalReturns: 0,
        totalReturnAmount: 0,
        uniqueShopCount: 0
      });
    }
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
