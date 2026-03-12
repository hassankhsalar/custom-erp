const STOCK_EPSILON = 1e-9;

const toBoolean = (value) => {
  if (value === true || value === false) return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off", ""].includes(normalized)) return false;
  }
  if (typeof value === "number") return value !== 0;
  return false;
};

const resolveDate = (value) => {
  if (!value) return new Date();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const safeNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const makeAdjustmentReference = (prefix = "INV-ADJ") => {
  const now = Date.now();
  const rand = Math.floor(Math.random() * 1e6).toString().padStart(6, "0");
  return `${prefix}-${now}-${rand}`;
};

const createInventoryAdjustmentAndMaybeAccount = async ({
  tx,
  placeType,
  placeId,
  itemType,
  productId = null,
  materialId = null,
  previousStock,
  nextStock,
  unitPrice,
  reason = null,
  date = null,
  isAccountAdjusted = false,
  createdById = null,
}) => {
  const prev = safeNumber(previousStock, 0);
  const next = safeNumber(nextStock, 0);
  const delta = next - prev;
  if (Math.abs(delta) <= STOCK_EPSILON) return null;

  const normalizedPlace = String(placeType || "").toLowerCase();
  const normalizedItem = String(itemType || "").toLowerCase();
  const normalizedUnitPrice = Math.max(0, safeNumber(unitPrice, 0));

  const adjustment = await tx.inventoryAdjustment.create({
    data: {
      itemType: normalizedItem,
      productId: normalizedItem === "product" ? productId : null,
      materialId: normalizedItem === "material" ? materialId : null,
      quantity: delta,
      unitPrice: normalizedUnitPrice,
      placeType: normalizedPlace,
      storeId: normalizedPlace === "store" ? placeId : null,
      shopId: normalizedPlace === "shop" ? placeId : null,
      factoryId: normalizedPlace === "factory" ? placeId : null,
      reason: reason ? String(reason).trim() : null,
      date: resolveDate(date),
      isAccountAdjusted: toBoolean(isAccountAdjusted),
    },
  });

  if (!toBoolean(isAccountAdjusted)) return adjustment;

  const entityAccount = await tx.entityAccount.findFirst({
    where: { entityType: normalizedPlace, entityId: placeId },
    orderBy: [{ isPrimary: "desc" }, { assignedAt: "asc" }],
  });
  if (!entityAccount?.accountId) {
    throw new Error(`No account assigned to this ${normalizedPlace}`);
  }
  if (!createdById) {
    throw new Error("Authenticated user is required for account adjustment");
  }

  const amount = Math.abs(delta) * normalizedUnitPrice;
  if (amount > 0) {
    const updatedAccount = await tx.accounts.update({
      where: { id: entityAccount.accountId },
      data: delta > 0 ? { balance: { increment: amount } } : { balance: { decrement: amount } },
    });

    const transaction = await tx.transactions.create({
      data: {
        reference: makeAdjustmentReference(),
        createdById,
        accountId: entityAccount.accountId,
        purpose: `Inventory Adjustment (${delta > 0 ? "Increase" : "Decrease"})`,
        added_to_account: delta > 0,
        amount,
        payment_method: "inventory_adjustment",
        current_account_balance: updatedAccount.balance,
        note: reason ? String(reason).trim() : null,
      },
    });

    return tx.inventoryAdjustment.update({
      where: { id: adjustment.id },
      data: { transactionId: transaction.id, isAccountAdjusted: true },
    });
  }

  return adjustment;
};

module.exports = {
  createInventoryAdjustmentAndMaybeAccount,
  toBoolean,
  resolveDate,
  STOCK_EPSILON,
};
