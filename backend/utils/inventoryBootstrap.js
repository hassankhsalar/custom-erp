const toFloat = (value, fallback = 0) => {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
};

const toInt = (value, fallback = 0) => {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
};

const buildStockMap = (rows, idKey, stockKey = "stock") => {
  const map = new Map();
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const id = toInt(row?.[idKey], NaN);
    if (!Number.isFinite(id)) return;
    map.set(id, Math.max(0, toFloat(row?.[stockKey], 0)));
  });
  return map;
};

const seedProductIntoAllPlaces = async (tx, product) => {
  const [stores, shops, factories] = await Promise.all([
    tx.store.findMany({ where: { deleted_at: false }, select: { id: true } }),
    tx.shop.findMany({ where: { deleted_at: false }, select: { id: true } }),
    tx.factory.findMany({ where: { deleted_at: false }, select: { id: true } }),
  ]);

  const avgCost = toFloat(product?.cost, 0);
  const salePrice = toFloat(product?.sale_price, 0);
  const alertQty = toInt(product?.alert_quantity, 0);

  if (stores.length) {
    await tx.storeProduct.createMany({
      data: stores.map((s) => ({
        store_id: s.id,
        product_id: product.id,
        stock: 0,
        avg_cost: avgCost,
        sale_price: salePrice,
        alert_quantity: alertQty,
        scrap: 0,
        deleted_at: false,
      })),
      skipDuplicates: true,
    });
  }

  if (shops.length) {
    await tx.shopProduct.createMany({
      data: shops.map((s) => ({
        shop_id: s.id,
        product_id: product.id,
        stock: 0,
        avg_cost: avgCost,
        sale_price: salePrice,
        alert_quantity: alertQty,
        scrap: 0,
        deleted_at: false,
      })),
      skipDuplicates: true,
    });
  }

  if (factories.length) {
    await tx.factoryProduct.createMany({
      data: factories.map((f) => ({
        factoryId: f.id,
        productId: product.id,
        stock: 0,
        avg_cost: avgCost,
        sale_price: salePrice,
        alert_quantity: alertQty,
        scrap: 0,
        deleted_at: false,
      })),
      skipDuplicates: true,
    });
  }
};

const seedMaterialIntoAllPlaces = async (tx, material) => {
  const [stores, shops, factories] = await Promise.all([
    tx.store.findMany({ where: { deleted_at: false }, select: { id: true } }),
    tx.shop.findMany({ where: { deleted_at: false }, select: { id: true } }),
    tx.factory.findMany({ where: { deleted_at: false }, select: { id: true } }),
  ]);

  const avgCost = toFloat(material?.unit_cost, 0);
  const salePrice = toFloat(material?.sale_price, 0);
  const alertQty = toFloat(material?.alert_quantity, 0);

  if (stores.length) {
    await tx.storeMaterial.createMany({
      data: stores.map((s) => ({
        store_id: s.id,
        material_id: material.id,
        stock: 0,
        avg_cost: avgCost,
        sale_price: salePrice,
        alert_quantity: alertQty,
        scrap: 0,
        deleted_at: false,
      })),
      skipDuplicates: true,
    });
  }

  if (shops.length) {
    await tx.shopMaterial.createMany({
      data: shops.map((s) => ({
        shop_id: s.id,
        material_id: material.id,
        stock: 0,
        avg_cost: avgCost,
        sale_price: salePrice,
        alert_quantity: alertQty,
        scrap: 0,
        deleted_at: false,
      })),
      skipDuplicates: true,
    });
  }

  if (factories.length) {
    await tx.factoryMaterial.createMany({
      data: factories.map((f) => ({
        factoryId: f.id,
        materialId: material.id,
        stock: 0,
        avg_cost: avgCost,
        sale_price: salePrice,
        alert_quantity: alertQty,
        scrap: 0,
        deleted_at: false,
      })),
      skipDuplicates: true,
    });
  }
};

const seedStoreInventoryForAllItems = async (tx, storeId, storeProducts = [], storeMaterials = []) => {
  const [products, materials] = await Promise.all([
    tx.product.findMany({
      where: { deleted_at: false },
      select: { id: true, cost: true, sale_price: true, alert_quantity: true },
    }),
    tx.material.findMany({
      where: { deleted_at: false },
      select: { id: true, unit_cost: true, sale_price: true, alert_quantity: true },
    }),
  ]);

  const productStockMap = buildStockMap(storeProducts, "product_id");
  const materialStockMap = buildStockMap(storeMaterials, "material_id");

  if (products.length) {
    await tx.storeProduct.createMany({
      data: products.map((p) => ({
        store_id: storeId,
        product_id: p.id,
        stock: productStockMap.get(p.id) ?? 0,
        avg_cost: toFloat(p.cost, 0),
        sale_price: toFloat(p.sale_price, 0),
        alert_quantity: toInt(p.alert_quantity, 0),
        scrap: 0,
        deleted_at: false,
      })),
      skipDuplicates: true,
    });
  }

  if (materials.length) {
    await tx.storeMaterial.createMany({
      data: materials.map((m) => ({
        store_id: storeId,
        material_id: m.id,
        stock: materialStockMap.get(m.id) ?? 0,
        avg_cost: toFloat(m.unit_cost, 0),
        sale_price: toFloat(m.sale_price, 0),
        alert_quantity: toFloat(m.alert_quantity, 0),
        scrap: 0,
        deleted_at: false,
      })),
      skipDuplicates: true,
    });
  }
};

const seedShopInventoryForAllItems = async (tx, shopId, shopProducts = [], shopMaterials = []) => {
  const [products, materials] = await Promise.all([
    tx.product.findMany({
      where: { deleted_at: false },
      select: { id: true, cost: true, sale_price: true, alert_quantity: true },
    }),
    tx.material.findMany({
      where: { deleted_at: false },
      select: { id: true, unit_cost: true, sale_price: true, alert_quantity: true },
    }),
  ]);

  const productStockMap = buildStockMap(shopProducts, "product_id");
  const materialStockMap = buildStockMap(shopMaterials, "material_id");

  if (products.length) {
    await tx.shopProduct.createMany({
      data: products.map((p) => ({
        shop_id: shopId,
        product_id: p.id,
        stock: productStockMap.get(p.id) ?? 0,
        avg_cost: toFloat(p.cost, 0),
        sale_price: toFloat(p.sale_price, 0),
        alert_quantity: toInt(p.alert_quantity, 0),
        scrap: 0,
        deleted_at: false,
      })),
      skipDuplicates: true,
    });
  }

  if (materials.length) {
    await tx.shopMaterial.createMany({
      data: materials.map((m) => ({
        shop_id: shopId,
        material_id: m.id,
        stock: materialStockMap.get(m.id) ?? 0,
        avg_cost: toFloat(m.unit_cost, 0),
        sale_price: toFloat(m.sale_price, 0),
        alert_quantity: toFloat(m.alert_quantity, 0),
        scrap: 0,
        deleted_at: false,
      })),
      skipDuplicates: true,
    });
  }
};

const seedFactoryInventoryForAllItems = async (tx, factoryId, factoryProducts = [], factoryMaterials = []) => {
  const [products, materials] = await Promise.all([
    tx.product.findMany({
      where: { deleted_at: false },
      select: { id: true, cost: true, sale_price: true, alert_quantity: true },
    }),
    tx.material.findMany({
      where: { deleted_at: false },
      select: { id: true, unit_cost: true, sale_price: true, alert_quantity: true },
    }),
  ]);

  const productStockMap = buildStockMap(factoryProducts, "productId");
  const materialStockMap = buildStockMap(factoryMaterials, "materialId");

  if (products.length) {
    await tx.factoryProduct.createMany({
      data: products.map((p) => ({
        factoryId,
        productId: p.id,
        stock: productStockMap.get(p.id) ?? 0,
        avg_cost: toFloat(p.cost, 0),
        sale_price: toFloat(p.sale_price, 0),
        alert_quantity: toInt(p.alert_quantity, 0),
        scrap: 0,
        deleted_at: false,
      })),
      skipDuplicates: true,
    });
  }

  if (materials.length) {
    await tx.factoryMaterial.createMany({
      data: materials.map((m) => ({
        factoryId,
        materialId: m.id,
        stock: materialStockMap.get(m.id) ?? 0,
        avg_cost: toFloat(m.unit_cost, 0),
        sale_price: toFloat(m.sale_price, 0),
        alert_quantity: toFloat(m.alert_quantity, 0),
        scrap: 0,
        deleted_at: false,
      })),
      skipDuplicates: true,
    });
  }
};

module.exports = {
  seedProductIntoAllPlaces,
  seedMaterialIntoAllPlaces,
  seedStoreInventoryForAllItems,
  seedShopInventoryForAllItems,
  seedFactoryInventoryForAllItems,
};
