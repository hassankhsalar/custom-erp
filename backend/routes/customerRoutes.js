const express = require("express");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const router = express.Router();

// Get all customers
router.get("/", async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause for search
    const where = search
      ? {
          OR: [
            { name: { contains: search } },
            { mobile: { contains: search } },
            { email: { contains: search } },
          ],
        }
      : {};

    // Get total count for pagination
    const totalCount = await prisma.customer.count({ where });

    // Get paginated customers
    const customers = await prisma.customer.findMany({
      where,
      orderBy: { name: "asc" },
      skip,
      take,
    });

    res.json({
      customers,
      totalCount,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalCount / take),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new customer
router.post("/", async (req, res) => {
  try {
    const { name, mobile, email, address } = req.body;

    if (!name || !mobile) {
      return res.status(400).json({ error: "Name and mobile are required" });
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        mobile,
        email: email || null,
        address: address || null,
      },
    });
    res.status(201).json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a single customer by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await prisma.customer.findUnique({
      where: { id: parseInt(id) },
    });
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a customer
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, mobile, email, address } = req.body;

    const customer = await prisma.customer.update({
      where: { id: parseInt(id) },
      data: {
        name: name || undefined,
        mobile: mobile || undefined,
        email: email || null,
        address: address || null,
      },
    });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a customer
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.customer.delete({
      where: { id: parseInt(id) },
    });
    res.status(204).send(); // No content
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
