const express = require("express");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const rows = await prisma.businessSettings.findMany({
      orderBy: { key: "asc" },
    });
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:key", async (req, res) => {
  try {
    const key = String(req.params.key || "").trim();
    if (!key) return res.status(400).json({ error: "key is required" });

    const row = await prisma.businessSettings.findUnique({ where: { key } });
    res.json(row || null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/:key", async (req, res) => {
  try {
    const key = String(req.params.key || "").trim();
    if (!key) return res.status(400).json({ error: "key is required" });
    if (req.body?.value === undefined) {
      return res.status(400).json({ error: "value is required" });
    }

    const saved = await prisma.businessSettings.upsert({
      where: { key },
      update: { value: req.body.value },
      create: { key, value: req.body.value },
    });

    res.json(saved);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
