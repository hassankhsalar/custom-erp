const { Prisma } = require("@prisma/client");

function registerShopSaleReturnRoutes({ router, prisma, buildScope, ensureIdScope }) {
  const { createNotification } = require("../../utils/notificationHelper");
  // Get sale return by ID - FIXED VERSION
  router.get("/returns/:id", async (req, res) => {
    console.log(`GET /returns/${req.params.id} called`);
    try {
      const returnId = parseInt(req.params.id);

      if (isNaN(returnId)) {
        return res.status(400).json({
          error: "Invalid return ID. Must be a number."
        });
      }

      const saleReturn = await prisma.saleReturn.findFirst({
        where: {
          id: returnId,
          shopId: { not: null }
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

      if (!saleReturn) {
        return res.status(404).json({
          error: `Sale return with ID ${returnId} not found`
        });
      }

      const scope = await buildScope(prisma, req.user?.userId || 0);
      ensureIdScope(scope, "shop", saleReturn.shopId);

      res.json(saleReturn);
    } catch (err) {
      console.error(`Error in /returns/${req.params.id}:`, err.message);
      if (err.status === 403) {
        return res.status(403).json({ error: "Forbidden" });
      }
      res.status(500).json({
        error: "Failed to fetch sale return",
        details: err.message
      });
    }
  });

  // Get return-eligible sales with pagination + server-side filtering/sorting
  router.get("/return-eligible", async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        shopId,
        customer = "",
        dateFrom,
        dateTo,
        sortBy = "createdAt",
        sortDir = "desc",
      } = req.query;

      const pageInt = Math.max(1, parseInt(page, 10) || 1);
      const limitInt = Math.min(200, Math.max(1, parseInt(limit, 10) || 10));
      const skip = (pageInt - 1) * limitInt;
      const scope = await buildScope(prisma, req.user?.userId || 0);
      if (!scope.isAdmin && scope.shops.size === 0) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const shopIdInt = shopId ? parseInt(shopId, 10) : null;
      if (shopId && Number.isNaN(shopIdInt)) {
        return res.status(400).json({ error: "Invalid shopId" });
      }
      if (shopIdInt) {
        ensureIdScope(scope, "shop", shopIdInt);
      }

      const where = {
        isReturned: false,
        ...(scope.isAdmin ? { shopId: { not: null } } : { shopId: { in: Array.from(scope.shops) } }),
      };

      if (shopIdInt) {
        where.shopId = shopIdInt;
      }

      const normalizedCustomer = String(customer || "").trim();
      if (normalizedCustomer) {
        where.customer = {
          OR: [
            { name: { contains: normalizedCustomer, mode: "insensitive" } },
            { mobile: { contains: normalizedCustomer, mode: "insensitive" } },
          ],
        };
      }

      const dFrom = dateFrom ? new Date(dateFrom) : null;
      const dTo = dateTo ? new Date(dateTo) : null;
      if ((dFrom && !Number.isNaN(dFrom.getTime())) || (dTo && !Number.isNaN(dTo.getTime()))) {
        where.createdAt = {};
        if (dFrom && !Number.isNaN(dFrom.getTime())) where.createdAt.gte = dFrom;
        if (dTo && !Number.isNaN(dTo.getTime())) where.createdAt.lte = dTo;
      }

      const sortableFields = new Set(["createdAt", "grandTotal", "reference", "paidAmount", "totalAmount"]);
      const finalSortBy = sortableFields.has(String(sortBy || "")) ? String(sortBy) : "createdAt";
      const finalSortDir = String(sortDir || "").toLowerCase() === "asc" ? "asc" : "desc";

      const [totalCount, sales] = await Promise.all([
        prisma.sale.count({ where }),
        prisma.sale.findMany({
          where,
          select: {
            id: true,
            reference: true,
            createdAt: true,
            grandTotal: true,
            totalAmount: true,
            paidAmount: true,
            paymentType: true,
            shop: { select: { id: true, name: true } },
            customer: { select: { id: true, name: true, mobile: true } },
          },
          orderBy: { [finalSortBy]: finalSortDir },
          skip,
          take: limitInt,
        }),
      ]);

      res.json({
        sales,
        pagination: {
          currentPage: pageInt,
          totalPages: Math.ceil(totalCount / limitInt),
          totalCount,
          limit: limitInt
        }
      });
    } catch (error) {
      res.status(500).json({
        error: "Failed to fetch sales",
        message: error.message,
        code: error.code || "UNKNOWN_ERROR"
      });
    }
  });

  // Process a return (UPDATED VERSION WITH WARRANTY CHECK)
  router.post("/return", async (req, res) => {
    try {
      const { saleId, items } = req.body;

      if (!saleId || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Sale ID and at least one return item are required" });
      }

      for (const item of items) {
        if (!item.type || !item.itemId || !item.quantity || !item.unitPrice) {
          return res.status(400).json({
            error: "Each return item must have type, itemId, quantity, and unitPrice"
          });
        }
        if (item.quantity <= 0 || item.unitPrice <= 0) {
          return res.status(400).json({ error: "Quantity and unitPrice must be positive numbers" });
        }
        if (!["product", "material"].includes(item.type)) {
          return res.status(400).json({ error: "Item type must be 'product' or 'material'" });
        }
      }

      const scope = await buildScope(prisma, req.user?.userId || 0);

      const result = await prisma.$transaction(async (tx) => {
        const originalSale = await tx.sale.findUnique({
          where: { id: parseInt(saleId) },
          include: {
            saleItems: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    defaultWarrantyDays: true,
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

        const returnedQuantities = {};
        if (originalSale.saleReturns && originalSale.saleReturns.length > 0) {
          for (const saleReturn of originalSale.saleReturns) {
            for (const returnItem of saleReturn.returnItems) {
              const key = returnItem.productId
                ? `product-${returnItem.productId}`
                : `material-${returnItem.materialId}`;
              if (!returnedQuantities[key]) returnedQuantities[key] = 0;
              returnedQuantities[key] += returnItem.quantity;
            }
          }
        }

        const saleDate = new Date(originalSale.createdAt);
        const currentDate = new Date();
        const daysSinceSale = Math.floor((currentDate - saleDate) / (1000 * 60 * 60 * 24));

        for (const returnItem of items) {
          const originalItem = originalSale.saleItems.find((item) => {
            if (returnItem.type === "product") return item.productId === parseInt(returnItem.itemId);
            return item.materialId === parseInt(returnItem.itemId);
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

          if (returnItem.type === "product") {
            const productWarrantyDays = originalItem.product?.defaultWarrantyDays || 0;
            if (productWarrantyDays > 0 && daysSinceSale > productWarrantyDays) {
              throw new Error(
                `Cannot return product "${originalItem.product?.name}" (ID: ${returnItem.itemId}) as it is outside warranty period. ` +
                `Sale was ${daysSinceSale} days ago, warranty is ${productWarrantyDays} days.`
              );
            }
          }
        }

        const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
        const reference = `SR-${Date.now()}`;

        const saleReturn = await tx.saleReturn.create({
          data: {
            reference,
            saleId: parseInt(saleId),
            shopId: originalSale.shopId,
            totalAmount,
            returnItems: {
              create: items.map((item) => ({
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

        for (const returnItem of items) {
          const key = returnItem.type === "product"
            ? `product-${returnItem.itemId}`
            : `material-${returnItem.itemId}`;
          if (!returnedQuantities[key]) returnedQuantities[key] = 0;
          returnedQuantities[key] += returnItem.quantity;
        }

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

        if (allItemsFullyReturned) {
          await tx.sale.update({
            where: { id: parseInt(saleId) },
            data: {
              isReturned: true,
              returnedAt: new Date(),
            },
          });
        }

        for (const item of items) {
          if (item.type === "product") {
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
              await tx.shopProduct.create({
                data: {
                  shop_id: originalSale.shopId,
                  product_id: parseInt(item.itemId),
                  stock: parseFloat(item.quantity)
                }
              });
            }

            await tx.product.update({
              where: { id: parseInt(item.itemId) },
              data: {
                stock: { increment: parseFloat(item.quantity) }
              }
            });
          } else if (item.type === "material") {
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
              await tx.shopMaterial.create({
                data: {
                  shop_id: originalSale.shopId,
                  material_id: parseInt(item.itemId),
                  stock: parseFloat(item.quantity)
                }
              });
            }

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

      await createNotification(prisma, {
        title: `Sale return created (${result.saleReturn.reference || result.saleReturn.id})`,
        description: `A ${result.allItemsFullyReturned ? "full" : "partial"} shop sale return was processed.`,
        forRole: "admin",
        link: "/shop-sales/returns"
      });

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
      if (
        err.message.includes("Sale not found") ||
        err.message.includes("not associated with a shop") ||
        err.message.includes("was not part of the original sale") ||
        err.message.includes("Cannot return more than available") ||
        err.message.includes("outside warranty period")
      ) {
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

      const shopsWithReturns = await prisma.saleReturn.groupBy({
        by: ["shopId"],
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

  router.delete("/returns/:id", async (req, res) => {
    try {
      const returnId = parseInt(req.params.id, 10);
      if (!returnId) return res.status(400).json({ error: "Invalid return id" });

      const scope = await buildScope(prisma, req.user?.userId || 0);

      await prisma.$transaction(async (tx) => {
        const saleReturn = await tx.saleReturn.findUnique({
          where: { id: returnId },
          include: {
            sale: { include: { saleItems: true, saleReturns: { include: { returnItems: true } } } },
            returnItems: true,
          },
        });
        if (!saleReturn) throw new Error("Sale return not found");
        ensureIdScope(scope, "shop", saleReturn.shopId);

        for (const item of saleReturn.returnItems || []) {
          const qty = parseFloat(item.quantity || 0);
          if (qty <= 0) continue;
          if (item.productId) {
            await tx.shopProduct.updateMany({
              where: { shop_id: saleReturn.shopId, product_id: item.productId },
              data: { stock: { decrement: qty } },
            });
            await tx.product.updateMany({
              where: { id: item.productId },
              data: { stock: { decrement: qty } },
            });
          }
          if (item.materialId) {
            await tx.shopMaterial.updateMany({
              where: { shop_id: saleReturn.shopId, material_id: item.materialId },
              data: { stock: { decrement: qty } },
            });
            await tx.material.updateMany({
              where: { id: item.materialId },
              data: { current_stock: { decrement: qty } },
            });
          }
        }

        await tx.saleReturn.delete({ where: { id: returnId } });

        if (saleReturn.saleId) {
          const remainingReturns = await tx.saleReturn.findMany({
            where: { saleId: saleReturn.saleId },
            include: { returnItems: true },
          });
          const returnedQty = new Map();
          for (const r of remainingReturns) {
            for (const ri of r.returnItems || []) {
              const key = ri.productId ? `p-${ri.productId}` : `m-${ri.materialId}`;
              returnedQty.set(key, (returnedQty.get(key) || 0) + (parseFloat(ri.quantity || 0)));
            }
          }
          const fullyReturned = (saleReturn.sale?.saleItems || []).every((si) => {
            const key = si.productId ? `p-${si.productId}` : `m-${si.materialId}`;
            return (returnedQty.get(key) || 0) >= (parseFloat(si.quantity || 0));
          });
          await tx.sale.update({
            where: { id: saleReturn.saleId },
            data: {
              isReturned: fullyReturned,
              returnedAt: fullyReturned ? new Date() : null,
            },
          });
        }
      });

      res.json({ success: true, message: "Sale return deleted successfully" });
    } catch (err) {
      if (err.status === 403) return res.status(403).json({ error: "Forbidden" });
      res.status(400).json({ error: err.message || "Failed to delete sale return" });
    }
  });
}

module.exports = { registerShopSaleReturnRoutes };
