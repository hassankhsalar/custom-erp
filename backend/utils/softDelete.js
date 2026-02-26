const ACTIVE_WHERE = { deleted_at: false };

const withActiveWhere = (where = {}) => ({
  ...where,
  deleted_at: false,
});

const itemModelByType = {
  product: "product",
  material: "material",
};

const placeModelByType = {
  store: "store",
  shop: "shop",
  factory: "factory",
};

const assertActivePlace = async (tx, placeType, placeId) => {
  const modelName = placeModelByType[String(placeType || "").toLowerCase()];
  if (!modelName) {
    const error = new Error("Invalid place type");
    error.status = 400;
    throw error;
  }
  const row = await tx[modelName].findFirst({
    where: { id: parseInt(placeId, 10), deleted_at: false },
    select: { id: true },
  });
  if (!row) {
    const error = new Error(`${placeType} not found or deleted`);
    error.status = 404;
    throw error;
  }
};

const assertActiveItem = async (tx, itemType, itemId) => {
  const modelName = itemModelByType[String(itemType || "").toLowerCase()];
  if (!modelName) {
    const error = new Error("Invalid item type");
    error.status = 400;
    throw error;
  }
  const row = await tx[modelName].findFirst({
    where: { id: parseInt(itemId, 10), deleted_at: false },
    select: { id: true },
  });
  if (!row) {
    const error = new Error(`${itemType} not found or deleted`);
    error.status = 404;
    throw error;
  }
};

module.exports = {
  ACTIVE_WHERE,
  withActiveWhere,
  assertActivePlace,
  assertActiveItem,
};
