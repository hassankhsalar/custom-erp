const toNumber = (value) => {
  const num = parseFloat(value);
  return Number.isFinite(num) ? num : 0;
};

const parseDateOnly = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
};

const parseBatchDetails = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
};

const serializeBatchDetails = (details) => JSON.stringify(details || []);

const normalizeIncomingBatch = (batch) => {
  if (!batch) return null;
  const batchNumber = (batch.batchNumber || "").toString().trim();
  const quantity = toNumber(batch.quantity);
  if (!batchNumber || quantity <= 0) return null;

  return {
    batchNumber,
    expiryDate: parseDateOnly(batch.expiryDate),
    quantity,
    unitCost: toNumber(batch.unitCost),
    receivedAt: batch.receivedAt || new Date().toISOString(),
  };
};

const mergeIncomingBatch = (existingRaw, incomingBatch) => {
  const incoming = normalizeIncomingBatch(incomingBatch);
  if (!incoming) return existingRaw || null;

  const current = parseBatchDetails(existingRaw);
  const idx = current.findIndex(
    (entry) =>
      (entry.batchNumber || "").toString().trim() === incoming.batchNumber &&
      parseDateOnly(entry.expiryDate) === incoming.expiryDate
  );

  if (idx >= 0) {
    current[idx].quantity = toNumber(current[idx].quantity) + incoming.quantity;
    if (incoming.unitCost > 0) {
      current[idx].unitCost = incoming.unitCost;
    }
    current[idx].receivedAt = incoming.receivedAt;
  } else {
    current.push(incoming);
  }

  return serializeBatchDetails(current);
};

const decrementBatch = (existingRaw, selectedBatch, quantity) => {
  const batchNumber = (selectedBatch?.batchNumber || "").toString().trim();
  const expiryDate = parseDateOnly(selectedBatch?.expiryDate);
  const qty = toNumber(quantity);
  if (!batchNumber || qty <= 0) {
    throw new Error("Batch number and quantity are required");
  }

  const current = parseBatchDetails(existingRaw);
  const idx = current.findIndex(
    (entry) =>
      (entry.batchNumber || "").toString().trim() === batchNumber &&
      parseDateOnly(entry.expiryDate) === expiryDate
  );

  if (idx < 0) {
    throw new Error(`Batch ${batchNumber} not found`);
  }

  const available = toNumber(current[idx].quantity);
  if (available < qty) {
    throw new Error(
      `Insufficient batch stock for ${batchNumber}. Available: ${available}, Requested: ${qty}`
    );
  }

  current[idx].quantity = available - qty;
  const filtered = current.filter((entry) => toNumber(entry.quantity) > 0);
  return serializeBatchDetails(filtered);
};

const getAvailableBatches = (raw) =>
  parseBatchDetails(raw)
    .map((batch) => ({
      batchNumber: (batch.batchNumber || "").toString().trim(),
      expiryDate: parseDateOnly(batch.expiryDate),
      quantity: toNumber(batch.quantity),
      unitCost: toNumber(batch.unitCost),
    }))
    .filter((batch) => batch.batchNumber && batch.quantity > 0)
    .sort((a, b) => {
      if (!a.expiryDate && !b.expiryDate) return 0;
      if (!a.expiryDate) return 1;
      if (!b.expiryDate) return -1;
      return a.expiryDate.localeCompare(b.expiryDate);
    });

module.exports = {
  parseDateOnly,
  toNumber,
  parseBatchDetails,
  mergeIncomingBatch,
  decrementBatch,
  getAvailableBatches,
};

