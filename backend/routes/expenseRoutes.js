const express = require("express");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const router = express.Router();
const { createTransaction } = require("../utils/transactionHelper");

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
      include: { category: true, createdBy: true, salary: true, account: true },
      orderBy: { date: "desc" }
    });
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { categoryId, amount, date, description, accountId, salaryId } = req.body;
    if (!accountId) {
      return res.status(400).json({ error: "accountId is required" });
    }

    const expenseAmount = parseFloat(amount);
    if (!expenseAmount || expenseAmount <= 0) {
      return res.status(400).json({ error: "Amount must be greater than 0" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const account = await tx.accounts.findUnique({ where: { id: parseInt(accountId) } });
      if (!account) throw new Error("Account not found");

      const updatedAccount = await tx.accounts.update({
        where: { id: parseInt(accountId) },
        data: { balance: { decrement: expenseAmount } }
      });

      const expense = await tx.expense.create({
        data: {
          categoryId: parseInt(categoryId),
          accountId: parseInt(accountId),
          amount: expenseAmount,
          date: date ? new Date(date) : new Date(),
          description: description || null,
          createdById: req.user?.userId || null,
          salaryId: salaryId ? parseInt(salaryId) : null
        }
      });

      await createTransaction(tx, {
        reference: `EXP-${Date.now()}`,
        createdById: req.user?.userId || 1,
        accountId: parseInt(accountId),
        purpose: "Expense",
        added_to_account: false,
        amount: expenseAmount,
        payment_method: "expense",
        current_account_balance: updatedAccount.balance,
        note: expense.description || "Expense"
      });

      return expense;
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { categoryId, amount, date, description, accountId } = req.body;

    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Expense not found" });

    const newAmount = amount !== undefined ? parseFloat(amount) : existing.amount;
    if (newAmount <= 0) return res.status(400).json({ error: "Amount must be greater than 0" });
    const newAccountId = accountId ? parseInt(accountId) : existing.accountId;

    const result = await prisma.$transaction(async (tx) => {
      if (newAccountId !== existing.accountId) {
        await tx.accounts.update({
          where: { id: existing.accountId },
          data: { balance: { increment: existing.amount } }
        });
        await tx.accounts.update({
          where: { id: newAccountId },
          data: { balance: { decrement: newAmount } }
        });
      } else if (newAmount !== existing.amount) {
        const diff = newAmount - existing.amount;
        if (diff > 0) {
          await tx.accounts.update({
            where: { id: existing.accountId },
            data: { balance: { decrement: diff } }
          });
        } else if (diff < 0) {
          await tx.accounts.update({
            where: { id: existing.accountId },
            data: { balance: { increment: Math.abs(diff) } }
          });
        }
      }

      const expense = await tx.expense.update({
        where: { id },
        data: {
          categoryId: categoryId ? parseInt(categoryId) : existing.categoryId,
          accountId: newAccountId,
          amount: newAmount,
          date: date ? new Date(date) : undefined,
          description: description || null
        }
      });

      return expense;
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Expense not found" });
    await prisma.$transaction(async (tx) => {
      await tx.accounts.update({
        where: { id: existing.accountId },
        data: { balance: { increment: existing.amount } }
      });
      await tx.expense.delete({ where: { id } });
    });
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
