const express = require("express");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const router = express.Router();
const { createTransaction } = require("../utils/transactionHelper");
const { createNotification } = require("../utils/notificationHelper");
const makeExpenseReference = (expenseId) => `EXP-${expenseId}-${Date.now()}`;

const parsePositiveInt = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const buildExpenseWhere = (query) => {
  const where = {};
  const search = String(query.search || "").trim();
  const categoryId = query.categoryId ? parseInt(query.categoryId, 10) : null;
  const accountId = query.accountId ? parseInt(query.accountId, 10) : null;
  const salaryId = query.salaryId ? parseInt(query.salaryId, 10) : null;
  const dateFrom = query.dateFrom ? new Date(query.dateFrom) : null;
  const dateTo = query.dateTo ? new Date(query.dateTo) : null;

  if (search) {
    where.OR = [
      { description: { contains: search } },
      { category: { name: { contains: search } } },
      { account: { account_name: { contains: search } } },
      { salary: { user: { name: { contains: search } } } },
      { salary: { user: { username: { contains: search } } } },
    ];
  }
  if (Number.isFinite(categoryId)) where.categoryId = categoryId;
  if (Number.isFinite(accountId)) where.accountId = accountId;
  if (Number.isFinite(salaryId)) where.salaryId = salaryId;
  if (dateFrom || dateTo) {
    where.date = {};
    if (dateFrom && !Number.isNaN(dateFrom.getTime())) where.date.gte = dateFrom;
    if (dateTo && !Number.isNaN(dateTo.getTime())) where.date.lte = dateTo;
  }
  return where;
};

const getExpenseOrderBy = (sortBy, sortDir) => {
  const direction = String(sortDir || "desc").toLowerCase() === "asc" ? "asc" : "desc";
  switch (String(sortBy || "date")) {
    case "amount":
      return { amount: direction };
    case "createdAt":
      return { createdAt: direction };
    case "category":
      return { category: { name: direction } };
    case "date":
    default:
      return { date: direction };
  }
};

// Expense categories
router.get("/categories", async (req, res) => {
  try {
    const categories = await prisma.expenseCategory.findMany({ where: { deleted_at: false }, orderBy: { name: "asc" } });
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
    await prisma.expenseCategory.update({ where: { id }, data: { deleted_at: true } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Expenses
router.get("/", async (req, res) => {
  try {
    const page = parsePositiveInt(req.query.page, 1);
    const limit = Math.min(parsePositiveInt(req.query.limit, 20), 100);
    const skip = (page - 1) * limit;
    const where = buildExpenseWhere(req.query);
    const orderBy = getExpenseOrderBy(req.query.sortBy, req.query.sortDir);

    const [items, totalCount] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: { category: true, createdBy: true, salary: { include: { user: true } }, account: true },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.expense.count({ where }),
    ]);

    res.json({
      items,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / limit)),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/overview", async (req, res) => {
  try {
    const where = buildExpenseWhere(req.query);
    const [aggregate, totalCount, byCategoryRaw] = await Promise.all([
      prisma.expense.aggregate({
        where,
        _sum: { amount: true },
        _avg: { amount: true },
      }),
      prisma.expense.count({ where }),
      prisma.expense.groupBy({
        by: ["categoryId"],
        where,
        _count: { _all: true },
      }),
    ]);

    const categoryIds = byCategoryRaw.map((x) => x.categoryId).filter((id) => Number.isFinite(id));
    const categories = categoryIds.length
      ? await prisma.expenseCategory.findMany({
          where: { id: { in: categoryIds } },
          select: { id: true, name: true },
        })
      : [];
    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
    const byCategory = byCategoryRaw.map((row) => ({
      categoryId: row.categoryId,
      categoryName: categoryMap.get(row.categoryId) || "Unknown",
      count: Number(row._count?._all || 0),
    }));

    res.json({
      totalCount,
      totalAmount: Number(aggregate._sum?.amount || 0),
      averageAmount: Number(aggregate._avg?.amount || 0),
      byCategory,
    });
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

      const trx = await createTransaction(tx, {
        reference: makeExpenseReference(expense.id),
        createdById: req.user?.userId || 1,
        accountId: parseInt(accountId),
        purpose: "Expense",
        added_to_account: false,
        amount: expenseAmount,
        payment_method: "expense",
        current_account_balance: updatedAccount.balance,
        note: expense.description ? `Expense #${expense.id} - ${expense.description}` : `Expense #${expense.id}`
      });

      return tx.expense.update({
        where: { id: expense.id },
        data: { transactionId: trx.id }
      });
    });

    await createNotification(prisma, {
      title: `Expense created (#${result.id})`,
      description: `A new expense of ${result.amount} was created${result.salaryId ? " for salary disbursement" : ""}.`,
      forRole: "admin",
      link: "/expense/list"
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { categoryId, amount, date, description, accountId, salaryId } = req.body;

    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Expense not found" });

    const newAmount = amount !== undefined ? parseFloat(amount) : existing.amount;
    if (newAmount <= 0) return res.status(400).json({ error: "Amount must be greater than 0" });
    const newAccountId = accountId ? parseInt(accountId) : existing.accountId;
    const nextCategoryId = categoryId ? parseInt(categoryId) : existing.categoryId;
    const nextSalaryId = salaryId === "" ? null : (salaryId ? parseInt(salaryId) : existing.salaryId);

    const result = await prisma.$transaction(async (tx) => {
      const targetAccount = await tx.accounts.findUnique({ where: { id: newAccountId } });
      if (!targetAccount) throw new Error("Target account not found");

      await tx.accounts.update({
        where: { id: existing.accountId },
        data: { balance: { increment: existing.amount } }
      });
      const updatedTargetAccount = await tx.accounts.update({
        where: { id: newAccountId },
        data: { balance: { decrement: newAmount } }
      });

      const expense = await tx.expense.update({
        where: { id },
        data: {
          categoryId: nextCategoryId,
          accountId: newAccountId,
          amount: newAmount,
          date: date ? new Date(date) : undefined,
          description: description || null,
          salaryId: nextSalaryId
        }
      });

      const noteText = description ? `Expense #${id} - ${description}` : `Expense #${id}`;
      if (existing.transactionId) {
        await tx.transactions.update({
          where: { id: existing.transactionId },
          data: {
            accountId: newAccountId,
            amount: newAmount,
            added_to_account: false,
            payment_method: "expense",
            purpose: "Expense",
            current_account_balance: updatedTargetAccount.balance,
            note: noteText,
          }
        });
        return expense;
      }

      const trx = await createTransaction(tx, {
        reference: makeExpenseReference(id),
        createdById: req.user?.userId || existing.createdById || 1,
        accountId: newAccountId,
        purpose: "Expense",
        added_to_account: false,
        amount: newAmount,
        payment_method: "expense",
        current_account_balance: updatedTargetAccount.balance,
        note: noteText,
      });

      return tx.expense.update({
        where: { id },
        data: { transactionId: trx.id }
      });
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
      if (existing.transactionId) {
        await tx.transactions.deleteMany({ where: { id: existing.transactionId } });
      }
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






