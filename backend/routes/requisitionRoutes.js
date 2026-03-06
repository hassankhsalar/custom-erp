const express = require("express");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const { buildScope, ensureIdScope } = require("../utils/associateScope");
const { createNotification } = require("../utils/notificationHelper");
const { assertActivePlace, assertActiveItem } = require("../utils/softDelete");

const prisma = new PrismaClient();
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

const getLocationName = async (type, id) => {
  if (!type || !id) return null;
  if (type === "shop") return (await prisma.shop.findFirst({ where: { id, deleted_at: false }, select: { name: true } }))?.name || null;
  if (type === "store") return (await prisma.store.findFirst({ where: { id, deleted_at: false }, select: { name: true } }))?.name || null;
  if (type === "factory") return (await prisma.factory.findFirst({ where: { id, deleted_at: false }, select: { name: true } }))?.name || null;
  return null;
};

const buildLocationNameMap = async (rows) => {
  const shopIds = new Set();
  const storeIds = new Set();
  const factoryIds = new Set();

  for (const row of rows || []) {
    const id = Number(row?.requesterId || 0);
    if (!id) continue;
    if (row.requesterType === "shop") shopIds.add(id);
    if (row.requesterType === "store") storeIds.add(id);
    if (row.requesterType === "factory") factoryIds.add(id);
  }

  const [shops, stores, factories] = await Promise.all([
    shopIds.size
      ? prisma.shop.findMany({
          where: { id: { in: Array.from(shopIds) }, deleted_at: false },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    storeIds.size
      ? prisma.store.findMany({
          where: { id: { in: Array.from(storeIds) }, deleted_at: false },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    factoryIds.size
      ? prisma.factory.findMany({
          where: { id: { in: Array.from(factoryIds) }, deleted_at: false },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
  ]);

  const map = new Map();
  for (const row of shops) map.set(`shop:${row.id}`, row.name);
  for (const row of stores) map.set(`store:${row.id}`, row.name);
  for (const row of factories) map.set(`factory:${row.id}`, row.name);
  return map;
};

const canAccessRequisition = (scope, requisition) => {
  if (scope.isAdmin) return true;
  if (requisition.requesterType === "shop" && scope.shops.has(requisition.requesterId)) return true;
  if (requisition.requesterType === "store" && scope.stores.has(requisition.requesterId)) return true;
  if (requisition.requesterType === "factory" && scope.factories.has(requisition.requesterId)) return true;
  return false;
};

const getSectionDestination = (section) => {
  if (!section) return { type: null, id: null, name: null };
  if (section.shopId) return { type: "shop", id: section.shopId, name: section.shop?.name || null };
  if (section.storeId) return { type: "store", id: section.storeId, name: section.store?.name || null };
  if (section.factoryId) return { type: "factory", id: section.factoryId, name: section.factory?.name || null };
  if (section.destinationType && section.destinationId) return { type: section.destinationType, id: section.destinationId, name: null };
  return { type: null, id: null, name: null };
};

const mapDestinationToForeignKeys = (destinationType, destinationId) => {
  const idNum = destinationId ? parseInt(destinationId, 10) : null;
  return {
    storeId: destinationType === "store" ? idNum : null,
    shopId: destinationType === "shop" ? idNum : null,
    factoryId: destinationType === "factory" ? idNum : null,
  };
};

const recalculateRequisitionStatus = async (tx, requisitionId) => {
  const sections = await tx.requisitionSection.findMany({
    where: { requisitionId },
    select: { status: true },
  });
  if (!sections.length) return;

  const statuses = new Set(sections.map((s) => s.status));
  let next = "segmented";
  if (statuses.size === 1 && statuses.has("rejected")) {
    next = "rejected";
  } else if (
    statuses.has("in_process") ||
    statuses.has("transfer_ordered") ||
    statuses.has("production_ordered") ||
    statuses.has("purchase_ordered")
  ) {
    next = "in_process";
  } else if (
    !statuses.has("pending") &&
    !statuses.has("in_process") &&
    !statuses.has("transfer_ordered") &&
    !statuses.has("production_ordered") &&
    !statuses.has("purchase_ordered")
  ) {
    next = statuses.has("rejected") ? "partially_approved" : "approved";
  }

  await tx.requisition.update({
    where: { id: requisitionId },
    data: { status: next },
  });
};

router.get("/places", authenticateToken, async (req, res) => {
  try {
    const scope = await buildScope(prisma, req.user?.userId || 0);
    const [shops, stores, factories] = await Promise.all([
      prisma.shop.findMany({
        where: scope.isAdmin ? { deleted_at: false } : { id: { in: Array.from(scope.shops) }, deleted_at: false },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.store.findMany({
        where: scope.isAdmin ? { deleted_at: false } : { id: { in: Array.from(scope.stores) }, deleted_at: false },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.factory.findMany({
        where: scope.isAdmin ? { deleted_at: false } : { id: { in: Array.from(scope.factories) }, deleted_at: false },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

    res.json({ shops, stores, factories });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to fetch places" });
  }
});

router.get("/lookup/items", authenticateToken, async (req, res) => {
  try {
    const { placeType, placeId, search = "" } = req.query;
    if (!placeType || !placeId) {
      return res.status(400).json({ error: "placeType and placeId are required" });
    }
    const scopedId = parseInt(placeId, 10);
    if (!scopedId) {
      return res.status(400).json({ error: "Invalid placeId" });
    }

    const scope = await buildScope(prisma, req.user?.userId || 0);
    ensureIdScope(scope, placeType, scopedId);

    const productModel =
      placeType === "shop" ? prisma.shopProduct :
      placeType === "store" ? prisma.storeProduct :
      prisma.factoryProduct;

    const materialModel =
      placeType === "shop" ? prisma.shopMaterial :
      placeType === "store" ? prisma.storeMaterial :
      prisma.factoryMaterial;

    const productWhere =
      placeType === "shop"
        ? { shop_id: scopedId, stock: { gt: 0 } }
        : placeType === "store"
          ? { store_id: scopedId, stock: { gt: 0 } }
          : { factoryId: scopedId, stock: { gt: 0 } };

    const materialWhere =
      placeType === "shop"
        ? { shop_id: scopedId, stock: { gt: 0 } }
        : placeType === "store"
          ? { store_id: scopedId, stock: { gt: 0 } }
          : { factoryId: scopedId, stock: { gt: 0 } };

    const [products, materials] = await Promise.all([
      productModel.findMany({
        where: {
          ...productWhere,
          deleted_at: false,
          product: search
            ? { deleted_at: false, name: { contains: search } }
            : { deleted_at: false },
        },
        include: { product: true },
      }),
      materialModel.findMany({
        where: {
          ...materialWhere,
          deleted_at: false,
          material: search
            ? { deleted_at: false, name: { contains: search } }
            : { deleted_at: false },
        },
        include: { material: true },
      }),
    ]);

    const mappedProducts = products.map((row) => ({
      itemType: "product",
      itemId: placeType === "factory" ? row.productId : row.product_id,
      name: row.product?.name || "Unknown Product",
      stock: row.stock || 0,
      image: row.product?.image || null,
    }));
    const mappedMaterials = materials.map((row) => ({
      itemType: "material",
      itemId: placeType === "factory" ? row.materialId : row.material_id,
      name: row.material?.name || "Unknown Material",
      stock: row.stock || 0,
      image: row.material?.image || null,
    }));

    res.json([...mappedProducts, ...mappedMaterials]);
  } catch (error) {
    if (error.status === 403) return res.status(403).json({ error: "Forbidden" });
    res.status(500).json({ error: error.message || "Failed to fetch items" });
  }
});

router.post("/", authenticateToken, async (req, res) => {
  try {
    const {
      title,
      note,
      requestType = "items",
      requestedAmount,
      amountPurpose,
      currency,
      requesterType,
      requesterId,
      parentRequisitionId,
      items = [],
    } = req.body;

    if (!requesterType || !requesterId) {
      return res.status(400).json({ error: "requesterType and requesterId are required" });
    }
    if (requestType === "items" && (!Array.isArray(items) || items.length === 0)) {
      return res.status(400).json({ error: "At least one item is required for item requisition" });
    }
    if (requestType === "money" && (!requestedAmount || parseFloat(requestedAmount) <= 0)) {
      return res.status(400).json({ error: "requestedAmount is required for money requisition" });
    }

    const scope = await buildScope(prisma, req.user?.userId || 0);
    ensureIdScope(scope, requesterType, parseInt(requesterId, 10));
    await assertActivePlace(prisma, requesterType, parseInt(requesterId, 10));
    for (const item of requestType === "items" ? items : []) {
      await assertActiveItem(prisma, item.itemType, parseInt(item.itemId, 10));
    }

    const created = await prisma.requisition.create({
      data: {
        reference: `REQ-${Date.now()}`,
        title: title || null,
        note: note || null,
        requestType: requestType === "money" ? "money" : "items",
        requestedAmount: requestType === "money" ? parseFloat(requestedAmount) : null,
        amountPurpose: requestType === "money" ? (amountPurpose || null) : null,
        currency: currency || "BDT",
        requesterType,
        requesterId: parseInt(requesterId, 10),
        requesterUserId: req.user?.userId || null,
        parentRequisitionId: parentRequisitionId ? parseInt(parentRequisitionId, 10) : null,
        items: {
          create: (requestType === "items" ? items : []).map((item) => ({
            itemType: item.itemType,
            productId: item.itemType === "product" ? parseInt(item.itemId, 10) : null,
            materialId: item.itemType === "material" ? parseInt(item.itemId, 10) : null,
            requestedQty: parseFloat(item.quantity || 0),
            note: item.note || null,
          })),
        },
      },
      include: {
        items: {
          include: { product: true, material: true },
        },
      },
    });

    await createNotification(prisma, {
      title: `New requisition (${created.reference || created.id})`,
      description: `A new requisition ${created.reference || created.id} was created.`,
      forRole: "admin",
      link: "/requisition/all"
    });

    res.status(201).json(created);
  } catch (error) {
    if (error.status === 403) return res.status(403).json({ error: "Forbidden" });
    res.status(500).json({ error: error.message || "Failed to create requisition" });
  }
});

router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { title, note, requestType = "items", requestedAmount, amountPurpose, currency, items = [] } = req.body;
    const existing = await prisma.requisition.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!existing) return res.status(404).json({ error: "Requisition not found" });

    if (existing.isSegmented) {
      return res.status(400).json({ error: "Segmented requisition cannot be edited" });
    }
    if (existing.requesterUserId && existing.requesterUserId !== (req.user?.userId || 0)) {
      return res.status(403).json({ error: "Only creator can edit this requisition" });
    }

    const scope = await buildScope(prisma, req.user?.userId || 0);
    ensureIdScope(scope, existing.requesterType, existing.requesterId);

    const updated = await prisma.$transaction(async (tx) => {
      await tx.requisitionItem.deleteMany({ where: { requisitionId: id } });
      return tx.requisition.update({
        where: { id },
        data: {
          title: title || null,
          note: note || null,
          requestType: requestType === "money" ? "money" : "items",
          requestedAmount: requestType === "money" ? parseFloat(requestedAmount || 0) : null,
          amountPurpose: requestType === "money" ? (amountPurpose || null) : null,
          currency: currency || existing.currency || "BDT",
          items: {
            create: (requestType === "items" ? items : []).map((item) => ({
              itemType: item.itemType,
              productId: item.itemType === "product" ? parseInt(item.itemId, 10) : null,
              materialId: item.itemType === "material" ? parseInt(item.itemId, 10) : null,
              requestedQty: parseFloat(item.quantity || 0),
              note: item.note || null,
            })),
          },
        },
        include: {
          items: { include: { product: true, material: true } },
        },
      });
    });

    res.json(updated);
  } catch (error) {
    if (error.status === 403) return res.status(403).json({ error: "Forbidden" });
    res.status(500).json({ error: error.message || "Failed to update requisition" });
  }
});

router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: "Invalid requisition ID" });

    const existing = await prisma.requisition.findUnique({
      where: { id },
      include: { sections: { select: { id: true } } },
    });
    if (!existing) return res.status(404).json({ error: "Requisition not found" });

    const scope = await buildScope(prisma, req.user?.userId || 0);
    ensureIdScope(scope, existing.requesterType, existing.requesterId);

    const requesterId = req.user?.userId || 0;
    const isCreator = Number(existing.requesterUserId || 0) === Number(requesterId);
    if (!scope.isAdmin && existing.requesterUserId && !isCreator) {
      return res.status(403).json({ error: "Only creator can delete this requisition" });
    }
    const itemCount = await prisma.requisitionItem.count({ where: { requisitionId: id } });
    const sectionCount = (existing.sections || []).length;
    const sectionIds = (existing.sections || []).map((section) => section.id);
    const sectionItemCount = sectionIds.length
      ? await prisma.requisitionSectionItem.count({ where: { sectionId: { in: sectionIds } } })
      : 0;

    await prisma.$transaction(async (tx) => {
      const sectionIds = (existing.sections || []).map((section) => section.id);
      if (sectionIds.length > 0) {
        await tx.requisitionSectionItem.deleteMany({
          where: { sectionId: { in: sectionIds } },
        });
      }
      await tx.requisitionSection.deleteMany({ where: { requisitionId: id } });
      await tx.requisitionItem.deleteMany({ where: { requisitionId: id } });
      await tx.requisition.delete({ where: { id } });
    });
    const summary = {
      requisitionId: id,
      reference: existing.reference,
      requesterType: existing.requesterType,
      requesterId: existing.requesterId,
      itemCount,
      sectionCount,
      sectionItemCount,
    };
    req.setAuditTrail?.({
      action: "delete",
      entity: "requisition",
      entityId: id,
      description: `Deleted requisition ${existing.reference || `#${id}`}: removed ${itemCount} requisition items and ${sectionItemCount} section items.`,
      details: summary,
    });

    return res.json({ success: true, message: "Requisition deleted successfully", summary });
  } catch (error) {
    if (error.status === 403) return res.status(403).json({ error: "Forbidden" });
    return res.status(500).json({ error: error.message || "Failed to delete requisition" });
  }
});

router.get("/", authenticateToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      status = "",
      requesterType = "",
      requesterId = "",
      dateFrom = "",
      dateTo = "",
      sortBy = "createdAt",
      sortDirection = "desc",
    } = req.query;

    const scope = await buildScope(prisma, req.user?.userId || 0);
    const startDate = dateFrom ? new Date(dateFrom) : null;
    const endDate = dateTo ? new Date(dateTo) : null;
    const createdAtFilter = {};
    if (startDate && !Number.isNaN(startDate.getTime())) createdAtFilter.gte = startDate;
    if (endDate && !Number.isNaN(endDate.getTime())) createdAtFilter.lte = endDate;

    const parsedRequesterId = requesterId ? parseInt(requesterId, 10) : null;
    const baseWhere = {
      ...(status ? { status } : {}),
      ...(requesterType ? { requesterType } : {}),
      ...(parsedRequesterId ? { requesterId: parsedRequesterId } : {}),
      ...(Object.keys(createdAtFilter).length ? { createdAt: createdAtFilter } : {}),
      ...(search
        ? {
            OR: [
              { reference: { contains: search } },
              { title: { contains: search } },
            ],
          }
        : {}),
    };

    const scopeFilter = scope.isAdmin
      ? {}
      : {
          OR: [
            { requesterType: "shop", requesterId: { in: Array.from(scope.shops) } },
            { requesterType: "store", requesterId: { in: Array.from(scope.stores) } },
            { requesterType: "factory", requesterId: { in: Array.from(scope.factories) } },
            { requesterUserId: req.user?.userId || 0 },
          ],
        };

    const where = {
      AND: [scopeFilter, baseWhere],
    };

    const [rows, total] = await prisma.$transaction([
      prisma.requisition.findMany({
        where,
        skip: (parseInt(page, 10) - 1) * parseInt(limit, 10),
        take: parseInt(limit, 10),
        include: {
          requesterUser: { select: { id: true, name: true, username: true } },
          items: { include: { product: true, material: true } },
          sections: { include: { items: true } },
        },
        orderBy: { [sortBy]: sortDirection === "asc" ? "asc" : "desc" },
      }),
      prisma.requisition.count({ where }),
    ]);

    const locationNameMap = await buildLocationNameMap(rows);
    const enriched = rows.map((row) => ({
      ...row,
      requesterName: locationNameMap.get(`${row.requesterType}:${row.requesterId}`) || null,
    }));

    res.json({
      data: enriched,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        totalPages: Math.ceil(total / parseInt(limit, 10)),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to fetch requisitions" });
  }
});

router.get("/overview", authenticateToken, async (req, res) => {
  try {
    const {
      search = "",
      status = "",
      requesterType = "",
      requesterId = "",
      dateFrom = "",
      dateTo = "",
    } = req.query;

    const scope = await buildScope(prisma, req.user?.userId || 0);
    const startDate = dateFrom ? new Date(dateFrom) : null;
    const endDate = dateTo ? new Date(dateTo) : null;
    const createdAtFilter = {};
    if (startDate && !Number.isNaN(startDate.getTime())) createdAtFilter.gte = startDate;
    if (endDate && !Number.isNaN(endDate.getTime())) createdAtFilter.lte = endDate;

    const parsedRequesterId = requesterId ? parseInt(requesterId, 10) : null;
    const baseWhere = {
      ...(status ? { status } : {}),
      ...(requesterType ? { requesterType } : {}),
      ...(parsedRequesterId ? { requesterId: parsedRequesterId } : {}),
      ...(Object.keys(createdAtFilter).length ? { createdAt: createdAtFilter } : {}),
      ...(search
        ? {
            OR: [
              { reference: { contains: search } },
              { title: { contains: search } },
            ],
          }
        : {}),
    };

    const scopeFilter = scope.isAdmin
      ? {}
      : {
          OR: [
            { requesterType: "shop", requesterId: { in: Array.from(scope.shops) } },
            { requesterType: "store", requesterId: { in: Array.from(scope.stores) } },
            { requesterType: "factory", requesterId: { in: Array.from(scope.factories) } },
            { requesterUserId: req.user?.userId || 0 },
          ],
        };

    const where = {
      AND: [scopeFilter, baseWhere],
    };

    const [totalCount, grouped] = await Promise.all([
      prisma.requisition.count({ where }),
      prisma.requisition.groupBy({
        by: ["status"],
        where,
        _count: { id: true },
      }),
    ]);

    const byStatus = grouped.reduce((acc, row) => {
      acc[row.status || "unknown"] = Number(row._count?.id || 0);
      return acc;
    }, {});

    res.json({
      totalCount,
      byStatus,
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to fetch requisition overview" });
  }
});

router.get("/orders/transfer", authenticateToken, async (req, res) => {
  try {
    const scope = await buildScope(prisma, req.user?.userId || 0);
    const rows = await prisma.requisitionSection.findMany({
      where: {
        actionType: "transfer_order",
        status: { in: ["approved", "transfer_ordered", "in_process"] },
      },
      include: {
        requisition: true,
        store: { select: { id: true, name: true } },
        shop: { select: { id: true, name: true } },
        factory: { select: { id: true, name: true } },
        items: {
          include: {
            product: { include: { materials: { include: { material: true } } } },
            material: true,
            requisitionItem: {
              include: {
                product: { include: { materials: { include: { material: true } } } },
                material: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const filtered = rows.filter((row) => {
      if (scope.isAdmin) return true;
      const dest = getSectionDestination(row);
      if (dest.type === "shop") return scope.shops.has(dest.id || 0);
      if (dest.type === "store") return scope.stores.has(dest.id || 0);
      if (dest.type === "factory") return scope.factories.has(dest.id || 0);
      return false;
    });

    res.json(filtered.map((row) => {
      const dest = getSectionDestination(row);
      return {
        ...row,
        destinationType: dest.type || row.destinationType || null,
        destinationId: dest.id || row.destinationId || null,
        destinationName: dest.name || null,
      };
    }));
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to fetch transfer orders" });
  }
});

router.get("/orders/production", authenticateToken, async (req, res) => {
  try {
    const scope = await buildScope(prisma, req.user?.userId || 0);
    const rows = await prisma.requisitionSection.findMany({
      where: {
        actionType: "production_order",
        status: { in: ["approved", "production_ordered", "in_process"] },
      },
      include: {
        requisition: true,
        store: { select: { id: true, name: true } },
        shop: { select: { id: true, name: true } },
        factory: { select: { id: true, name: true } },
        items: {
          include: {
            product: { include: { materials: { include: { material: true } } } },
            material: true,
            requisitionItem: {
              include: {
                product: { include: { materials: { include: { material: true } } } },
                material: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const filtered = rows.filter((row) => {
      if (scope.isAdmin) return true;
      const dest = getSectionDestination(row);
      if (dest.type === "factory") return scope.factories.has(dest.id || 0);
      return false;
    });

    res.json(filtered.map((row) => {
      const dest = getSectionDestination(row);
      return {
        ...row,
        destinationType: dest.type || row.destinationType || null,
        destinationId: dest.id || row.destinationId || null,
        destinationName: dest.name || null,
      };
    }));
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to fetch production orders" });
  }
});

router.get("/orders/purchase", authenticateToken, async (req, res) => {
  try {
    const scope = await buildScope(prisma, req.user?.userId || 0);
    const rows = await prisma.requisitionSection.findMany({
      where: {
        actionType: "purchase_order",
        status: { in: ["approved", "purchase_ordered", "in_process"] },
      },
      include: {
        requisition: true,
        store: { select: { id: true, name: true } },
        shop: { select: { id: true, name: true } },
        factory: { select: { id: true, name: true } },
        items: {
          include: {
            product: { include: { materials: { include: { material: true } } } },
            material: true,
            requisitionItem: {
              include: {
                product: { include: { materials: { include: { material: true } } } },
                material: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const filtered = rows.filter((row) => {
      if (scope.isAdmin) return true;
      const dest = getSectionDestination(row);
      if (dest.type === "shop") return scope.shops.has(dest.id || 0);
      if (dest.type === "store") return scope.stores.has(dest.id || 0);
      if (dest.type === "factory") return scope.factories.has(dest.id || 0);
      return false;
    });

    res.json(filtered.map((row) => {
      const dest = getSectionDestination(row);
      return {
        ...row,
        destinationType: dest.type || row.destinationType || null,
        destinationId: dest.id || row.destinationId || null,
        destinationName: dest.name || null,
      };
    }));
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to fetch purchase orders" });
  }
});

router.get("/sections/:sectionId", authenticateToken, async (req, res) => {
  try {
    const sectionId = parseInt(req.params.sectionId, 10);
    if (!Number.isFinite(sectionId) || sectionId <= 0) {
      return res.status(400).json({ error: "Invalid section ID" });
    }

    const section = await prisma.requisitionSection.findUnique({
      where: { id: sectionId },
      include: {
        requisition: true,
        store: { select: { id: true, name: true } },
        shop: { select: { id: true, name: true } },
        factory: { select: { id: true, name: true } },
        items: {
          include: {
            product: { include: { materials: { include: { material: true } } } },
            material: true,
            requisitionItem: {
              include: {
                product: { include: { materials: { include: { material: true } } } },
                material: true,
              },
            },
          },
        },
      },
    });

    if (!section) return res.status(404).json({ error: "Section not found" });

    const scope = await buildScope(prisma, req.user?.userId || 0);
    if (!scope.isAdmin) {
      const dest = getSectionDestination(section);
      if (!dest.type || !dest.id) {
        return res.status(403).json({ error: "Forbidden" });
      }
      ensureIdScope(scope, dest.type, dest.id);
    }

    const dest = getSectionDestination(section);
    return res.json({
      ...section,
      destinationType: dest.type || section.destinationType || null,
      destinationId: dest.id || section.destinationId || null,
      destinationName: dest.name || null,
    });
  } catch (error) {
    if (error.status === 403) return res.status(403).json({ error: "Forbidden" });
    res.status(500).json({ error: error.message || "Failed to fetch requisition section" });
  }
});

router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const requisition = await prisma.requisition.findUnique({
      where: { id },
      include: {
        requesterUser: { select: { id: true, name: true, username: true } },
        approvedBy: { select: { id: true, name: true, username: true } },
        parentRequisition: { select: { id: true, reference: true } },
        childRequisitions: { select: { id: true, reference: true, status: true, createdAt: true } },
        items: { include: { product: true, material: true } },
        sections: {
          include: {
            assignedBy: { select: { id: true, name: true } },
            store: { select: { id: true, name: true } },
            shop: { select: { id: true, name: true } },
            factory: { select: { id: true, name: true } },
            items: { include: { product: true, material: true, requisitionItem: true } },
            transfers: true,
            productions: true,
          },
          orderBy: { sectionNo: "asc" },
        },
        transfers: true,
        productions: true,
      },
    });
    if (!requisition) return res.status(404).json({ error: "Requisition not found" });

    const scope = await buildScope(prisma, req.user?.userId || 0);
    if (!canAccessRequisition(scope, requisition)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const requesterName = await getLocationName(requisition.requesterType, requisition.requesterId);
    res.json({ ...requisition, requesterName });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to fetch requisition" });
  }
});

router.post("/:id/approve", authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await prisma.requisition.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Requisition not found" });

    const updated = await prisma.requisition.update({
      where: { id },
      data: {
        status: "approved",
        approvedById: req.user?.userId || null,
        approvedAt: new Date(),
      },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to approve requisition" });
  }
});

router.post("/:id/reject", authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await prisma.requisition.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Requisition not found" });

    const updated = await prisma.requisition.update({
      where: { id },
      data: {
        status: "rejected",
        approvedById: req.user?.userId || null,
        approvedAt: new Date(),
      },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to reject requisition" });
  }
});

router.post("/:id/sections", authenticateToken, async (req, res) => {
  try {
    const requisitionId = parseInt(req.params.id, 10);
    const { sections = [] } = req.body;
    if (!Array.isArray(sections) || sections.length === 0) {
      return res.status(400).json({ error: "sections are required" });
    }

    const requisition = await prisma.requisition.findUnique({
      where: { id: requisitionId },
      include: { items: true },
    });
    if (!requisition) return res.status(404).json({ error: "Requisition not found" });

    const created = await prisma.$transaction(async (tx) => {
      await tx.requisitionSection.deleteMany({ where: { requisitionId } });

      for (let i = 0; i < sections.length; i += 1) {
        const section = sections[i];
        const sectionNo = i + 1;
        const allowedActionTypes =
          requisition.requestType === "money"
            ? ["approval", "rejected"]
            : ["transfer_order", "production_order", "purchase_order", "rejected"];
        const normalizedActionType = allowedActionTypes.includes(section.actionType)
          ? section.actionType
          : (requisition.requestType === "money" ? "approval" : "transfer_order");
        const destinationType = normalizedActionType === "approval" || normalizedActionType === "rejected"
          ? null
          : (section.destinationType || null);
        const destinationId = normalizedActionType === "approval" || normalizedActionType === "rejected"
          ? null
          : (section.destinationId ? parseInt(section.destinationId, 10) : null);
        const destinationForeignKeys = mapDestinationToForeignKeys(destinationType, destinationId);
        const createdSection = await tx.requisitionSection.create({
          data: {
            requisitionId,
            sectionNo,
            title: section.title || `Section ${sectionNo}`,
            note: section.note || null,
            actionType: normalizedActionType,
            status:
              normalizedActionType === "transfer_order"
                ? "transfer_ordered"
                : normalizedActionType === "production_order"
                  ? "production_ordered"
                  : normalizedActionType === "purchase_order"
                    ? "purchase_ordered"
                : normalizedActionType === "rejected"
                    ? "rejected"
                    : "approved",
            destinationType,
            destinationId,
            ...destinationForeignKeys,
            assignedById: req.user?.userId || null,
          },
        });

        const sectionItems = (requisition.requestType === "items" ? (section.items || []) : []).map((item) => ({
          sectionId: createdSection.id,
          requisitionItemId: item.requisitionItemId ? parseInt(item.requisitionItemId, 10) : null,
          itemType: item.itemType,
          productId: item.itemType === "product" ? parseInt(item.itemId || item.productId, 10) : null,
          materialId: item.itemType === "material" ? parseInt(item.itemId || item.materialId, 10) : null,
          quantity: parseFloat(item.quantity || 0),
          status:
            normalizedActionType === "rejected"
              ? "rejected"
              : normalizedActionType === "approval"
                ? "approved"
                : "ordered",
          note: item.note || null,
        }));

        if (sectionItems.length > 0) {
          await tx.requisitionSectionItem.createMany({ data: sectionItems });
        }
      }

      await tx.requisition.update({
        where: { id: requisitionId },
        data: {
          isSegmented: true,
          segmentedAt: new Date(),
          status: "segmented",
          approvedById: req.user?.userId || null,
          approvedAt: new Date(),
        },
      });

      await recalculateRequisitionStatus(tx, requisitionId);
      return tx.requisition.findUnique({
        where: { id: requisitionId },
        include: {
          items: true,
          sections: { include: { items: true } },
        },
      });
    });

    res.json(created);
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to segment requisition" });
  }
});

router.post("/sections/:sectionId/action", authenticateToken, async (req, res) => {
  try {
    const sectionId = parseInt(req.params.sectionId, 10);
    const { actionType, status, destinationType, destinationId, note } = req.body;
    const existing = await prisma.requisitionSection.findUnique({
      where: { id: sectionId },
      include: { requisition: true },
    });
    if (!existing) return res.status(404).json({ error: "Section not found" });

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.requisitionSection.update({
        where: { id: sectionId },
        data: {
          actionType: actionType || existing.actionType,
          status: status || existing.status,
          destinationType: destinationType === undefined ? existing.destinationType : destinationType,
          destinationId: destinationId === undefined ? existing.destinationId : (destinationId ? parseInt(destinationId, 10) : null),
          ...(
            destinationType !== undefined || destinationId !== undefined
              ? mapDestinationToForeignKeys(
                  destinationType === undefined ? existing.destinationType : destinationType,
                  destinationId === undefined ? existing.destinationId : (destinationId ? parseInt(destinationId, 10) : null)
                )
              : {}
          ),
          note: note === undefined ? existing.note : note,
        },
        include: { items: true },
      });
      await recalculateRequisitionStatus(tx, existing.requisitionId);
      return row;
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to update section action" });
  }
});

router.post("/sections/:sectionId/complete", authenticateToken, async (req, res) => {
  try {
    const sectionId = parseInt(req.params.sectionId, 10);
    const { status = "done", note } = req.body || {};
    const section = await prisma.requisitionSection.findUnique({
      where: { id: sectionId },
      include: { requisition: true },
    });
    if (!section) return res.status(404).json({ error: "Section not found" });
    const scope = await buildScope(prisma, req.user?.userId || 0);
    const sectionDestination = getSectionDestination(section);
    const allowed =
      scope.isAdmin ||
      (sectionDestination.type === "shop" && scope.shops.has(sectionDestination.id || 0)) ||
      (sectionDestination.type === "store" && scope.stores.has(sectionDestination.id || 0)) ||
      (sectionDestination.type === "factory" && scope.factories.has(sectionDestination.id || 0));
    if (!allowed) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.requisitionSection.update({
        where: { id: sectionId },
        data: {
          status,
          note: note === undefined ? section.note : note,
        },
      });

      await tx.requisitionSectionItem.updateMany({
        where: { sectionId },
        data: { status: status === "rejected" ? "rejected" : "approved" },
      });

      await recalculateRequisitionStatus(tx, section.requisitionId);
      return row;
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to complete section" });
  }
});

router.post("/:id/child", authenticateToken, async (req, res) => {
  try {
    const parentId = parseInt(req.params.id, 10);
    const {
      title,
      note,
      requestType = "items",
      requestedAmount,
      amountPurpose,
      currency,
      requesterType,
      requesterId,
      items = [],
    } = req.body;
    if (!requesterType || !requesterId) {
      return res.status(400).json({ error: "requesterType and requesterId are required" });
    }
    if (requestType === "items" && (!Array.isArray(items) || items.length === 0)) {
      return res.status(400).json({ error: "items are required for item requisition" });
    }
    if (requestType === "money" && (!requestedAmount || parseFloat(requestedAmount) <= 0)) {
      return res.status(400).json({ error: "requestedAmount is required for money requisition" });
    }

    const parent = await prisma.requisition.findUnique({ where: { id: parentId } });
    if (!parent) return res.status(404).json({ error: "Parent requisition not found" });

    const scope = await buildScope(prisma, req.user?.userId || 0);
    ensureIdScope(scope, requesterType, parseInt(requesterId, 10));
    await assertActivePlace(prisma, requesterType, parseInt(requesterId, 10));
    for (const item of requestType === "items" ? items : []) {
      await assertActiveItem(prisma, item.itemType, parseInt(item.itemId, 10));
    }

    const created = await prisma.requisition.create({
      data: {
        reference: `REQ-${Date.now()}`,
        title: title || null,
        note: note || null,
        requestType: requestType === "money" ? "money" : "items",
        requestedAmount: requestType === "money" ? parseFloat(requestedAmount) : null,
        amountPurpose: requestType === "money" ? (amountPurpose || null) : null,
        currency: currency || "BDT",
        requesterType,
        requesterId: parseInt(requesterId, 10),
        requesterUserId: req.user?.userId || null,
        parentRequisitionId: parentId,
        items: {
          create: (requestType === "items" ? items : []).map((item) => ({
            itemType: item.itemType,
            productId: item.itemType === "product" ? parseInt(item.itemId, 10) : null,
            materialId: item.itemType === "material" ? parseInt(item.itemId, 10) : null,
            requestedQty: parseFloat(item.quantity || 0),
            note: item.note || null,
          })),
        },
      },
      include: { items: true },
    });

    await createNotification(prisma, {
      title: `New requisition (${created.reference || created.id})`,
      description: `A child requisition ${created.reference || created.id} was created.`,
      forRole: "admin",
      link: "/requisition/all"
    });

    res.status(201).json(created);
  } catch (error) {
    if (error.status === 403) return res.status(403).json({ error: "Forbidden" });
    res.status(500).json({ error: error.message || "Failed to create child requisition" });
  }
});

module.exports = router;
