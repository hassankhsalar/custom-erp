const express = require("express");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const router = express.Router();

const ENTITY_CONFIG = {
  units: {
    model: prisma.unit,
    label: "Unit",
  },
  brands: {
    model: prisma.brand,
    label: "Brand",
  },
  "product-categories": {
    model: prisma.productCategory,
    label: "Category",
  },
};

const parsePagination = (query) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 100);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const parseSort = (query) => {
  const allowedSortFields = ["id", "name", "status", "createdAt", "updatedAt"];
  const sortBy = allowedSortFields.includes(query.sortBy) ? query.sortBy : "createdAt";
  const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";
  return { [sortBy]: sortOrder };
};

const buildWhere = (query) => {
  const where = {};

  if (query.search) {
    where.OR = [
      { name: { contains: query.search } },
      { description: { contains: query.search } },
    ];
  }

  if (query.status) {
    where.status = query.status;
  }

  return where;
};

const parseRelationWhere = (query) => {
  const where = {};

  if (query.search) {
    where.OR = [
      { primaryUnit: { contains: query.search } },
      { relatedUnit: { contains: query.search } },
      { note: { contains: query.search } },
    ];
  }

  if (query.status) {
    where.status = query.status;
  }

  if (query.primaryUnit) {
    where.primaryUnit = query.primaryUnit;
  }

  return where;
};

const resolveEntity = (req, res) => {
  const config = ENTITY_CONFIG[req.params.entity];
  if (!config) {
    res.status(404).json({ error: "Invalid entity" });
    return null;
  }
  return config;
};

router.get("/unit-relations", async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const where = parseRelationWhere(req.query);
    const orderBy = parseSort(req.query.sortBy ? req.query : { sortBy: "createdAt", sortOrder: "desc" });

    const [items, totalCount] = await Promise.all([
      prisma.unitRelation.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      prisma.unitRelation.count({ where }),
    ]);

    res.json({
      items,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/unit-relations/suggestions/:primaryUnit", async (req, res) => {
  try {
    const { primaryUnit } = req.params;
    const rows = await prisma.unitRelation.findMany({
      where: {
        primaryUnit,
        status: "active",
      },
      orderBy: [{ relatedUnit: "asc" }],
    });
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/unit-relations", async (req, res) => {
  try {
    const primaryUnit = String(req.body?.primaryUnit || "").trim();
    const relatedUnit = String(req.body?.relatedUnit || "").trim();
    const multiplier = parseFloat(req.body?.multiplier);
    const note = req.body?.note ? String(req.body.note).trim() : null;
    const status = req.body?.status === "inactive" ? "inactive" : "active";

    if (!primaryUnit || !relatedUnit) {
      return res.status(400).json({ error: "Primary unit and related unit are required" });
    }
    if (!Number.isFinite(multiplier) || multiplier <= 0) {
      return res.status(400).json({ error: "Multiplier must be greater than 0" });
    }

    const created = await prisma.unitRelation.create({
      data: { primaryUnit, relatedUnit, multiplier, note, status },
    });

    res.status(201).json(created);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put("/unit-relations/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const primaryUnit = String(req.body?.primaryUnit || "").trim();
    const relatedUnit = String(req.body?.relatedUnit || "").trim();
    const multiplier = parseFloat(req.body?.multiplier);
    const note = req.body?.note ? String(req.body.note).trim() : null;
    const status = req.body?.status === "inactive" ? "inactive" : "active";

    if (!primaryUnit || !relatedUnit) {
      return res.status(400).json({ error: "Primary unit and related unit are required" });
    }
    if (!Number.isFinite(multiplier) || multiplier <= 0) {
      return res.status(400).json({ error: "Multiplier must be greater than 0" });
    }

    const updated = await prisma.unitRelation.update({
      where: { id },
      data: { primaryUnit, relatedUnit, multiplier, note, status },
    });

    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/unit-relations/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }
    await prisma.unitRelation.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/:entity", async (req, res) => {
  try {
    const entity = resolveEntity(req, res);
    if (!entity) return;

    const { page, limit, skip } = parsePagination(req.query);
    const where = buildWhere(req.query);
    const orderBy = parseSort(req.query);

    const [items, totalCount] = await Promise.all([
      entity.model.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      entity.model.count({ where }),
    ]);

    res.json({
      items,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:entity/:id", async (req, res) => {
  try {
    const entity = resolveEntity(req, res);
    if (!entity) return;

    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const item = await entity.model.findUnique({ where: { id } });
    if (!item) {
      return res.status(404).json({ error: `${entity.label} not found` });
    }

    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/:entity", async (req, res) => {
  try {
    const entity = resolveEntity(req, res);
    if (!entity) return;

    const name = String(req.body?.name || "").trim();
    const description = req.body?.description ? String(req.body.description).trim() : null;
    const status = req.body?.status === "inactive" ? "inactive" : "active";

    if (!name) {
      return res.status(400).json({ error: `${entity.label} name is required` });
    }

    const created = await entity.model.create({
      data: { name, description, status },
    });

    res.status(201).json(created);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put("/:entity/:id", async (req, res) => {
  try {
    const entity = resolveEntity(req, res);
    if (!entity) return;

    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const name = String(req.body?.name || "").trim();
    const description = req.body?.description ? String(req.body.description).trim() : null;
    const status = req.body?.status === "inactive" ? "inactive" : "active";

    if (!name) {
      return res.status(400).json({ error: `${entity.label} name is required` });
    }

    const updated = await entity.model.update({
      where: { id },
      data: { name, description, status },
    });

    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/:entity/:id", async (req, res) => {
  try {
    const entity = resolveEntity(req, res);
    if (!entity) return;

    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    await entity.model.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
