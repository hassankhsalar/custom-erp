const express = require("express");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const router = express.Router();

const sum = (arr, key) => arr.reduce((s, r) => s + (parseFloat(r[key]) || 0), 0);

router.get("/trial-balance", async (req, res) => {
  try {
    const transactions = await prisma.transactions.findMany({
      select: { accountId: true, amount: true, added_to_account: true }
    });
    const accounts = await prisma.accounts.findMany({ select: { id: true, name: true, balance: true } });

    const totalsByAccount = {};
    transactions.forEach(t => {
      if (!totalsByAccount[t.accountId]) totalsByAccount[t.accountId] = { debit: 0, credit: 0 };
      const amt = parseFloat(t.amount) || 0;
      if (t.added_to_account === true) totalsByAccount[t.accountId].credit += amt;
      if (t.added_to_account === false) totalsByAccount[t.accountId].debit += amt;
    });

    const rows = accounts.map(a => ({
      accountId: a.id,
      name: a.name,
      debit: totalsByAccount[a.id]?.debit || 0,
      credit: totalsByAccount[a.id]?.credit || 0,
      balance: parseFloat(a.balance || 0)
    }));

    res.json({ rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/cash-bank", async (req, res) => {
  try {
    const accounts = await prisma.accounts.findMany({ select: { id: true, name: true, balance: true } });
    const banks = await prisma.bankAccount.findMany({ select: { id: true, name: true, current_balance: true } });
    res.json({ accounts, banks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/sales", async (req, res) => {
  try {
    const sales = await prisma.sale.findMany({ select: { grandTotal: true, createdAt: true } });
    res.json({ totalSales: sum(sales, "grandTotal"), count: sales.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/purchases", async (req, res) => {
  try {
    const purchases = await prisma.purchase.findMany({ select: { grandTotal: true, createdAt: true } });
    res.json({ totalPurchases: sum(purchases, "grandTotal"), count: purchases.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/production", async (req, res) => {
  try {
    const productions = await prisma.production.findMany({ select: { status: true } });
    const byStatus = productions.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {});
    res.json({ count: productions.length, byStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/wastage", async (req, res) => {
  try {
    const scrapProducts = await prisma.scrapProduct.findMany({ select: { quantity: true } }).catch(() => []);
    const scrapMaterials = await prisma.scrapMaterial.findMany({ select: { quantity: true } }).catch(() => []);
    res.json({
      productScrap: sum(scrapProducts, "quantity"),
      materialScrap: sum(scrapMaterials, "quantity")
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/stock", async (req, res) => {
  try {
    const products = await prisma.product.findMany({ select: { stock: true } });
    const materials = await prisma.material.findMany({ select: { current_stock: true } });
    res.json({
      productStock: sum(products, "stock"),
      materialStock: sum(materials, "current_stock")
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/transfer", async (req, res) => {
  try {
    const transfers = await prisma.transfer.findMany({ select: { status: true } });
    const byStatus = transfers.reduce((acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {});
    res.json({ count: transfers.length, byStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/profit-loss", async (req, res) => {
  try {
    const sales = await prisma.sale.findMany({ select: { grandTotal: true } });
    const purchases = await prisma.purchase.findMany({ select: { grandTotal: true } });
    const expenses = await prisma.expense.findMany({ select: { amount: true } }).catch(() => []);
    const totalSales = sum(sales, "grandTotal");
    const totalPurchases = sum(purchases, "grandTotal");
    const totalExpenses = sum(expenses, "amount");
    const profit = totalSales - totalPurchases - totalExpenses;
    res.json({ totalSales, totalPurchases, totalExpenses, profit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/purchase-sales", async (req, res) => {
  try {
    const sales = await prisma.sale.findMany({ select: { grandTotal: true } });
    const purchases = await prisma.purchase.findMany({ select: { grandTotal: true } });
    res.json({ totalSales: sum(sales, "grandTotal"), totalPurchases: sum(purchases, "grandTotal") });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/customer", async (req, res) => {
  try {
    const sales = await prisma.sale.findMany({ select: { customer: true, grandTotal: true } });
    const byCustomer = {};
    sales.forEach(s => {
      const key = s.customer || "Walk-in";
      byCustomer[key] = (byCustomer[key] || 0) + (parseFloat(s.grandTotal) || 0);
    });
    const rows = Object.entries(byCustomer).map(([customer, total]) => ({ customer, total }));
    res.json({ rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/supplier", async (req, res) => {
  try {
    const purchases = await prisma.purchase.findMany({
      select: { grandTotal: true, supplier: { select: { name: true } } }
    });
    const bySupplier = {};
    purchases.forEach(p => {
      const key = p.supplier?.name || "Unknown";
      bySupplier[key] = (bySupplier[key] || 0) + (parseFloat(p.grandTotal) || 0);
    });
    const rows = Object.entries(bySupplier).map(([supplier, total]) => ({ supplier, total }));
    res.json({ rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/best-selling", async (req, res) => {
  try {
    const sort = (req.query.sort || "best").toLowerCase();
    const items = await prisma.saleItem.findMany({
      include: { product: true, material: true }
    });
    const byItem = {};
    items.forEach(i => {
      const key = i.productId ? `p-${i.productId}` : `m-${i.materialId}`;
      const name = i.product?.name || i.material?.name || "Unknown";
      if (!byItem[key]) byItem[key] = { name, quantity: 0, total: 0 };
      byItem[key].quantity += parseFloat(i.quantity) || 0;
      byItem[key].total += parseFloat(i.totalPrice) || 0;
    });
    const rows = Object.values(byItem).sort((a, b) => sort === "worst" ? a.quantity - b.quantity : b.quantity - a.quantity);
    res.json({ rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/profit-calendar", async (req, res) => {
  try {
    const sales = await prisma.sale.findMany({ select: { grandTotal: true, createdAt: true } });
    const purchases = await prisma.purchase.findMany({ select: { grandTotal: true, createdAt: true } });
    const expenses = await prisma.expense.findMany({ select: { amount: true, date: true } }).catch(() => []);

    const byMonth = {};
    const addToMonth = (date, key, value) => {
      const d = new Date(date);
      const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!byMonth[m]) byMonth[m] = { sales: 0, purchases: 0, expenses: 0, profit: 0 };
      byMonth[m][key] += value;
    };

    sales.forEach(s => addToMonth(s.createdAt, "sales", parseFloat(s.grandTotal) || 0));
    purchases.forEach(p => addToMonth(p.createdAt, "purchases", parseFloat(p.grandTotal) || 0));
    expenses.forEach(e => addToMonth(e.date, "expenses", parseFloat(e.amount) || 0));

    const rows = Object.entries(byMonth).map(([month, vals]) => ({
      month,
      sales: vals.sales,
      purchases: vals.purchases,
      expenses: vals.expenses,
      profit: vals.sales - vals.purchases - vals.expenses
    }));

    res.json({ rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
