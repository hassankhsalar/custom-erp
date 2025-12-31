const express = require("express");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const router = express.Router();

// Create transfer from store to shop
router.post("/", async (req, res) => {
  try {
    const { storeId, shopId, items } = req.body;
//, notes
    if (!storeId || !shopId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Store ID, Shop ID, and items are required" });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Validate items and check stock (but don't deduct yet)
      for (const item of items) {
        if (item.type === 'product') {
          const storeProduct = await tx.storeProduct.findUnique({
            where: {
              store_id_product_id: {
                store_id: parseInt(storeId),
                product_id: item.productId
              }
            }
          });

          if (!storeProduct) {
            throw new Error(`Product ${item.productId} not found in store`);
          }

          if (storeProduct.stock < item.quantity) {
            throw new Error(`Insufficient stock for product ${item.productId}. Available: ${storeProduct.stock}, Requested: ${item.quantity}`);
          }
        } else if (item.type === 'material') {
          const storeMaterial = await tx.storeMaterial.findUnique({
            where: {
              store_id_material_id: {
                store_id: parseInt(storeId),
                material_id: item.materialId
              }
            }
          });

          if (!storeMaterial) {
            throw new Error(`Material ${item.materialId} not found in store`);
          }

          if (storeMaterial.stock < item.quantity) {
            throw new Error(`Insufficient stock for material ${item.materialId}. Available: ${storeMaterial.stock}, Requested: ${item.quantity}`);
          }
        }
      }

      // Create transfer record (status: pending)
      const transfer = await tx.storeToShopTransfer.create({
        data: {
          reference: `TRF-${Date.now()}`,
          storeId: parseInt(storeId),
          shopId: parseInt(shopId),
          totalItems: items.length,
          //notes: notes || null,
          status: 'pending',
          transferItems: {
            create: items.map(item => ({
              productId: item.type === 'product' ? item.productId : null,
              materialId: item.type === 'material' ? item.materialId : null,
              quantity: item.quantity,
              type: item.type
            }))
          }
        },
        include: {
          transferItems: {
            include: {
              product: true,
              material: true
            }
          },
          store: true,
          shop: true
        }
      });

      return transfer;
    });

    res.status(201).json({
      message: "Transfer created successfully. Status: Pending - Waiting for approval",
      transfer: result
    });

  } catch (err) {
    console.error("Create transfer error:", err);
    res.status(400).json({ error: err.message });
  }
});

// Get all transfers
router.get("/", async (req, res) => {
  try {
    const transfers = await prisma.storeToShopTransfer.findMany({
      include: {
        store: { select: { id: true, name: true } },
        shop: { select: { id: true, name: true } },
        transferItems: {
          include: {
            product: { select: { id: true, name: true, barcode: true } },
            material: { select: { id: true, name: true, unit: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(transfers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update transfer status
router.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    //, notes
    if (!['pending', 'being_shipped', 'transferred'].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const transfer = await tx.storeToShopTransfer.findUnique({
        where: { id: parseInt(id) },
        include: { transferItems: true }
      });

      if (!transfer) {
        throw new Error("Transfer not found");
      }

      // If changing to 'being_shipped', deduct stock from store
      if (status === 'being_shipped' && transfer.status === 'pending') {
        for (const item of transfer.transferItems) {
          if (item.type === 'product') {
            // Decrease store stock
            await tx.storeProduct.update({
              where: {
                store_id_product_id: {
                  store_id: transfer.storeId,
                  product_id: item.productId
                }
              },
              data: { stock: { decrement: item.quantity } }
            });

            console.log(`Deducted ${item.quantity} of product ${item.productId} from store ${transfer.storeId}`);

          } else if (item.type === 'material') {
            // Decrease store stock
            await tx.storeMaterial.update({
              where: {
                store_id_material_id: {
                  store_id: transfer.storeId,
                  material_id: item.materialId
                }
              },
              data: { stock: { decrement: item.quantity } }
            });

            console.log(`Deducted ${item.quantity} of material ${item.materialId} from store ${transfer.storeId}`);
          }
        }
      }

      // If changing to 'transferred', add stock to shop
      if (status === 'transferred' && transfer.status === 'being_shipped') {
        for (const item of transfer.transferItems) {
          if (item.type === 'product') {
            // Add to shop stock
            const shopProduct = await tx.shopProduct.findUnique({
              where: {
                shop_id_product_id: {
                  shop_id: transfer.shopId,
                  product_id: item.productId
                }
              }
            });

            if (shopProduct) {
              await tx.shopProduct.update({
                where: {
                  shop_id_product_id: {
                    shop_id: transfer.shopId,
                    product_id: item.productId
                  }
                },
                data: { stock: { increment: item.quantity } }
              });
            } else {
              await tx.shopProduct.create({
                data: {
                  shop_id: transfer.shopId,
                  product_id: item.productId,
                  stock: item.quantity
                }
              });
            }

            console.log(`Added ${item.quantity} of product ${item.productId} to shop ${transfer.shopId}`);

          } else if (item.type === 'material') {
            // Add to shop stock
            const shopMaterial = await tx.shopMaterial.findUnique({
              where: {
                shop_id_material_id: {
                  shop_id: transfer.shopId,
                  material_id: item.materialId
                }
              }
            });

            if (shopMaterial) {
              await tx.shopMaterial.update({
                where: {
                  shop_id_material_id: {
                    shop_id: transfer.shopId,
                    material_id: item.materialId
                  }
                },
                data: { stock: { increment: item.quantity } }
              });
            } else {
              await tx.shopMaterial.create({
                data: {
                  shop_id: transfer.shopId,
                  material_id: item.materialId,
                  stock: item.quantity
                }
              });
            }

            console.log(`Added ${item.quantity} of material ${item.materialId} to shop ${transfer.shopId}`);
          }
        }
      }

      // Update transfer status
      const updateData = { status };
      // if (notes) {
      //   updateData.notes = notes;
      // }

      const updatedTransfer = await tx.storeToShopTransfer.update({
        where: { id: parseInt(id) },
        data: updateData,
        include: {
          store: true,
          shop: true,
          transferItems: {
            include: {
              product: true,
              material: true
            }
          }
        }
      });

      return updatedTransfer;
    });

    res.json({
      message: `Transfer status updated to ${status} successfully`,
      transfer: result
    });

  } catch (err) {
    console.error("Update transfer status error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get shops for transfer
router.get("/shops", async (req, res) => {
  try {
    const shops = await prisma.shop.findMany({
      select: {
        id: true,
        name: true,
        address: true
      },
      orderBy: { name: 'asc' }
    });

    res.json(shops);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single transfer by ID
router.get("/:id", async (req, res) => {
  try {
    const transfer = await prisma.storeToShopTransfer.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        store: true,
        shop: true,
        transferItems: {
          include: {
            product: true,
            material: true
          }
        }
      }
    });

    if (!transfer) {
      return res.status(404).json({ error: "Transfer not found" });
    }

    res.json(transfer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;