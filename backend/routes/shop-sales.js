const express = require("express");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const router = express.Router();
const { createTransaction } = require('../utils/transactionHelper');
const { createNotification } = require('../utils/notificationHelper');
const { buildScope, ensureTypeScope, ensureIdScope } = require("../utils/associateScope");
const { getAvailableBatches, decrementBatch } = require("../utils/batchDetails");

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
            stock: true,
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
            brand: true,
            unit: true,
            current_stock: true,
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
      unit: null,
      stock: sp.stock,
      shop_stock: sp.stock,
      global_stock: sp.product.stock,
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
      category: null,
      brand: sm.material.brand,
      unit: sm.material.unit,
      stock: sm.stock,
      shop_stock: sm.stock,
      global_stock: sm.material.current_stock,
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

      if (finalPaidAmount.toFixed(2) > (grandTotal.toFixed(2) + 0.001)) {
        throw new Error("Paid amount cannot exceed grand total");
      }

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
          totalCost += parseFloat(item.avg_cost) * parseFloat(item.quantity);
          stockAfterSale = shopMaterial.stock - parseFloat(item.quantity);

        }

        if( item.alert_quantity > 0 && stockAfterSale <= item.alert_quantity ) {
          let shopName = await tx.shop.findUnique({
            where: { id: parseInt(shopId) },
            select: { name: true }
          })
          notificationData = {
            title: "Item " + (item.type === "product" ? item.product.name : item.material.name) + " is low stock at " + shopName.name,
          }
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

    res.json({
      sales,
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

// Add payment to sale
router.post("/:id/payments", async (req, res) => {
  try {
    const saleId = parseInt(req.params.id);
    if (isNaN(saleId)) {
      return res.status(400).json({ error: "Invalid sale ID" });
    }

    const { amount, payment_method, bankAccountId, cashRegisterId, note } = req.body;
    const paymentAmount = parseFloat(amount);
    if (!paymentAmount || paymentAmount <= 0) {
      return res.status(400).json({ error: "Payment amount must be greater than 0" });
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

    const dueAmount = Math.max(0, (parseFloat(sale.grandTotal) || 0) - (parseFloat(sale.paidAmount) || 0));
    if (dueAmount.toFixed(2) < paymentAmount.toFixed(2)) {
      return res.status(400).json({ error: `Payment amount ($${paymentAmount.toFixed(2)}) exceeds due amount ($${dueAmount.toFixed(2)})` });
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

// Update sale (limited fields)
router.put("/:id", async (req, res) => {
  try {
    const saleId = parseInt(req.params.id);
    if (isNaN(saleId)) {
      return res.status(400).json({ error: "Invalid sale ID" });
    }

    const { customerId, discount } = req.body;
    const sale = await prisma.sale.findUnique({ where: { id: saleId } });
    if (!sale) {
      return res.status(404).json({ error: "Sale not found" });
    }

    const scope = await buildScope(prisma, req.user?.userId || 0);
    ensureIdScope(scope, "shop", sale.shopId);

    if ((parseFloat(sale.paidAmount) || 0) > 0) {
      return res.status(400).json({ error: "Cannot edit sale with payments" });
    }

    const newDiscount = discount !== undefined ? parseFloat(discount) || 0 : sale.discount;
    const newGrandTotal = Math.max(0, (parseFloat(sale.totalAmount) || 0) - newDiscount);

    const updatedSale = await prisma.sale.update({
      where: { id: saleId },
      data: {
        customerId: customerId ? parseInt(customerId) : null,
        discount: newDiscount,
        grandTotal: newGrandTotal
      }
    });

    res.json(updatedSale);
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

// Get return-eligible sales for a shop (FIXED VERSION)
router.get("/return-eligible", async (req, res) => {
  try {
    const { shopId } = req.query;
    
    if (!shopId) {
      return res.status(400).json({ error: 'Shop ID is required' });
    }

    const scope = await buildScope(prisma, req.user?.userId || 0);
    ensureIdScope(scope, "shop", parseInt(shopId));

    // Get all sales for the shop, then filter in JavaScript
    const allSales = await prisma.sale.findMany({
      where: {
        shopId: parseInt(shopId),
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
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Filter sales that are not returned
    // Handle both false boolean and 0 number
    const eligibleSales = allSales.filter(sale => {
      return sale.isReturned === false || 
             sale.isReturned === 0 || 
             sale.isReturned === null;
    });

    console.log(`Found ${allSales.length} total sales, ${eligibleSales.length} eligible for return`);
    
    res.json(eligibleSales);
  } catch (error) {
    console.error('Error fetching return-eligible sales:', error);
    if (error.status === 403) {
      return res.json([]);
    }
    res.status(500).json({ 
      error: 'Failed to fetch sales',
      details: error.message 
    });
  }
});

// Process a return (UPDATED VERSION)
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
              product: true,
              material: true
            }
          },
          shop: true
        }
      });

      if (!originalSale) {
        throw new Error("Sale not found");
      }

      ensureIdScope(scope, "shop", originalSale.shopId);

      if (!originalSale.shopId) {
        throw new Error("This sale is not associated with a shop");
      }

      // Check if sale is already returned
      if (originalSale.isReturned) {
        throw new Error("Sale has already been returned");
      }

      // Validate return items against original sale
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

        if (returnItem.quantity > originalItem.quantity) {
          const itemType = returnItem.type === "product" ? "Product" : "Material";
          throw new Error(`Cannot return more than originally sold for ${itemType} ${returnItem.itemId}. Original: ${originalItem.quantity}, Return: ${returnItem.quantity}`);
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

      // Update the sale as returned
      await tx.sale.update({
        where: { id: parseInt(saleId) },
        data: {
          isReturned: true,
          returnedAt: new Date(),
        },
      });

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

      return { saleReturn };
    });

    res.status(201).json({
      message: "Return processed successfully",
      return: result.saleReturn
    });

  } catch (err) {
    console.error("Return processing error:", err);

    if (err.status === 403) {
      return res.status(403).json({ error: "Forbidden" });
    }
    
    if (err.message.includes("Sale not found") || 
        err.message.includes("not associated with a shop") ||
        err.message.includes("has already been returned") ||
        err.message.includes("was not part of the original sale") ||
        err.message.includes("Cannot return more than originally sold")) {
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
