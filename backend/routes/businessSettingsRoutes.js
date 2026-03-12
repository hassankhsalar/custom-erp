const express = require("express");
const { PrismaClient } = require("@prisma/client");
const cache = require("../cachingService");
const {
  ACTIVE_FEATURES_KEY,
  normalizeActiveFeatures,
  saveActiveFeatures,
} = require("../utils/activeFeatures");

const prisma = new PrismaClient();
const router = express.Router();

const ALL_SETTINGS_CACHE_KEY = "business_settings_all";
const settingCacheKey = (key) => `business_settings_${key}`;

router.get("/", async (req, res) => {
  try {
    const cached = cache.get(ALL_SETTINGS_CACHE_KEY);
    if (cached !== undefined) {
      return res.json(cached);
    }

    const rows = await prisma.businessSettings.findMany({
      orderBy: { key: "asc" },
    });

    cache.set(ALL_SETTINGS_CACHE_KEY, rows, 0);
    rows.forEach((row) => {
      cache.set(settingCacheKey(row.key), row, 0);
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

    const cacheKey = settingCacheKey(key);
    const cached = cache.get(cacheKey);
    if (cached !== undefined) {
      return res.json(cached);
    }

    let row = await prisma.businessSettings.findUnique({ where: { key } });

    if (!row && key === ACTIVE_FEATURES_KEY) {
      row = await saveActiveFeatures(prisma, normalizeActiveFeatures(undefined));
    }

    cache.set(cacheKey, row || null, 0);
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

    const saved = key === ACTIVE_FEATURES_KEY
      ? await saveActiveFeatures(prisma, req.body.value)
      : await prisma.businessSettings.upsert({
          where: { key },
          update: { value: req.body.value },
          create: { key, value: req.body.value },
        });

    cache.set(settingCacheKey(key), saved, 0);
    cache.del(ALL_SETTINGS_CACHE_KEY);

    res.json(saved);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
