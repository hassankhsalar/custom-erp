const express = require("express");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const router = express.Router();

// Expense categories
router.get("/categories", async (req, res) => {
  try {
    const categories = await prisma.expenseCategory.findMany({ orderBy: { name: "asc" } });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/categories", async (req, res) => {
  try {
    const { name } = req.body;
    const category = await prisma.expenseCategory.create({ data: { name } });
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/categories/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name } = req.body;
    const category = await prisma.expenseCategory.update({ where: { id }, data: { name } });
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/categories/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.expenseCategory.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Expenses
router.get("/", async (req, res) => {
  try {
    const expenses = await prisma.expense.findMany({
      include: { category: true, createdBy: true, salary: true },
      orderBy: { date: "desc" }
    });
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { categoryId, amount, date, description } = req.body;
    const expense = await prisma.expense.create({
      data: {
        categoryId: parseInt(categoryId),
        amount: parseFloat(amount),
        date: date ? new Date(date) : new Date(),
        description: description || null,
        createdById: req.user?.userId || null
      }
    });
    res.json(expense);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { categoryId, amount, date, description } = req.body;
    const expense = await prisma.expense.update({
      where: { id },
      data: {
        categoryId: parseInt(categoryId),
        amount: parseFloat(amount),
        date: date ? new Date(date) : undefined,
        description: description || null
      }
    });
    res.json(expense);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.expense.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Salaries list for Expense > Salaries
router.get("/salaries/list", async (req, res) => {
  try {
    const salaries = await prisma.salary.findMany({
      include: { user: true },
      orderBy: [{ year: "desc" }, { month: "desc" }]
    });
    res.json(salaries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
