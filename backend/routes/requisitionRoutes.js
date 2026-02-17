const express = require("express");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const { buildScope, ensureIdScope } = require("../utils/associateScope");

const prisma = new PrismaClient();
const router = express.Router();
const JWT_SECRET = "your-secret-key";

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
  if (type === "shop") return (await prisma.shop.findUnique({ where: { id }, select: { name: true } }))?.name || null;
  if (type === "store") return (await prisma.store.findUnique({ where: { id }, select: { name: true } }))?.name || null;
  if (type === "factory") return (await prisma.factory.findUnique({ where: { id }, select: { name: true } }))?.name || null;
  return null;
};

const canAccessRequisition = (scope, requisition) => {
  if (scope.isAdmin) return true;
  if (requisition.requesterType === "shop" && scope.shops.has(requisition.requesterId)) return true;
  if (requisition.requesterType === "store" && scope.stores.has(requisition.requesterId)) return true;
  if (requisition.requesterType === "factory" && scope.factories.has(requisition.requesterId)) return true;
  return false;
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
        where: scope.isAdmin ? {} : { id: { in: Array.from(scope.shops) } },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.store.findMany({
        where: scope.isAdmin ? {} : { id: { in: Array.from(scope.stores) } },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.factory.findMany({
        where: scope.isAdmin ? {} : { id: { in: Array.from(scope.factories) } },
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
          ...(search ? { product: { name: { contains: search } } } : {}),
        },
        include: { product: true },
      }),
      materialModel.findMany({
        where: {
          ...materialWhere,
          ...(search ? { material: { name: { contains: search } } } : {}),
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

router.get("/", authenticateToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      status = "",
      requesterType = "",
      sortBy = "createdAt",
      sortDirection = "desc",
    } = req.query;

    const scope = await buildScope(prisma, req.user?.userId || 0);
    const baseWhere = {
      ...(status ? { status } : {}),
      ...(requesterType ? { requesterType } : {}),
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

    const enriched = await Promise.all(
      rows.map(async (row) => ({
        ...row,
        requesterName: await getLocationName(row.requesterType, row.requesterId),
      }))
    );

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
        items: { include: { product: { include: { materials: { include: { material: true } } } }, material: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const filtered = rows.filter((row) => {
      if (scope.isAdmin) return true;
      if (row.destinationType === "shop") return scope.shops.has(row.destinationId || 0);
      if (row.destinationType === "store") return scope.stores.has(row.destinationId || 0);
      if (row.destinationType === "factory") return scope.factories.has(row.destinationId || 0);
      return false;
    });

    res.json(filtered);
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
        items: { include: { product: { include: { materials: { include: { material: true } } } }, material: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const filtered = rows.filter((row) => {
      if (scope.isAdmin) return true;
      if (row.destinationType === "factory") return scope.factories.has(row.destinationId || 0);
      return false;
    });

    res.json(filtered);
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
        items: { include: { product: { include: { materials: { include: { material: true } } } }, material: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const filtered = rows.filter((row) => {
      if (scope.isAdmin) return true;
      if (row.destinationType === "shop") return scope.shops.has(row.destinationId || 0);
      if (row.destinationType === "store") return scope.stores.has(row.destinationId || 0);
      if (row.destinationType === "factory") return scope.factories.has(row.destinationId || 0);
      return false;
    });

    res.json(filtered);
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to fetch purchase orders" });
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
            destinationType: normalizedActionType === "approval" || normalizedActionType === "rejected" ? null : (section.destinationType || null),
            destinationId:
              normalizedActionType === "approval" || normalizedActionType === "rejected"
                ? null
                : (section.destinationId ? parseInt(section.destinationId, 10) : null),
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
    const allowed =
      scope.isAdmin ||
      (section.destinationType === "shop" && scope.shops.has(section.destinationId || 0)) ||
      (section.destinationType === "store" && scope.stores.has(section.destinationId || 0)) ||
      (section.destinationType === "factory" && scope.factories.has(section.destinationId || 0));
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

    res.status(201).json(created);
  } catch (error) {
    if (error.status === 403) return res.status(403).json({ error: "Forbidden" });
    res.status(500).json({ error: error.message || "Failed to create child requisition" });
  }
});

module.exports = router;
