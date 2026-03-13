const cache = require('../cachingService');

const ACTIVE_FEATURES_KEY = 'active_features';
const ACTIVE_FEATURES_CACHE_KEY = 'business_settings_active_features';

const DEFAULT_ACTIVE_FEATURES = {
  sale: {
    negative_stock_sale: false,
    shared_sale: false,
    enable_warranty: false,
  },
  purchase: {
    enable_multi_shipping: false,
  },
  production: {
    enable_production: false,
  },
  requisition: {
    enable_requisition: false,
  },
  stock_management: {
    enable_batch_tracking: false,
  },
  product_item: {
    enable_multi_naming: false,
    enable_multi_unit: false,
  },
  ecommerce: {
    enable_ecommerce: false,
  },
};

const normalizeGroup = (incoming, defaults) => {
  const source = incoming && typeof incoming === 'object' ? incoming : {};
  const output = {};
  for (const [featureKey, defaultValue] of Object.entries(defaults)) {
    output[featureKey] = typeof source[featureKey] === 'boolean' ? source[featureKey] : Boolean(defaultValue);
  }
  return output;
};

const normalizeActiveFeatures = (incoming) => {
  const source = incoming && typeof incoming === 'object' ? incoming : {};
  return {
    sale: normalizeGroup(source.sale, DEFAULT_ACTIVE_FEATURES.sale),
    purchase: normalizeGroup(source.purchase, DEFAULT_ACTIVE_FEATURES.purchase),
    production: normalizeGroup(source.production, DEFAULT_ACTIVE_FEATURES.production),
    requisition: normalizeGroup(source.requisition, DEFAULT_ACTIVE_FEATURES.requisition),
    stock_management: normalizeGroup(source.stock_management, DEFAULT_ACTIVE_FEATURES.stock_management),
    product_item: normalizeGroup(source.product_item, DEFAULT_ACTIVE_FEATURES.product_item),
    ecommerce: normalizeGroup(source.ecommerce, DEFAULT_ACTIVE_FEATURES.ecommerce),
  };
};

const getActiveFeatures = async (prisma) => {
  const cached = cache.get(ACTIVE_FEATURES_CACHE_KEY);
  if (cached !== undefined) return normalizeActiveFeatures(cached);

  const row = await prisma.businessSettings.findUnique({ where: { key: ACTIVE_FEATURES_KEY } });
  const normalized = normalizeActiveFeatures(row?.value);

  if (!row) {
    await prisma.businessSettings.create({
      data: {
        key: ACTIVE_FEATURES_KEY,
        value: normalized,
      },
    });
  }

  cache.set(ACTIVE_FEATURES_CACHE_KEY, normalized, 0);
  return normalized;
};

const saveActiveFeatures = async (prisma, value) => {
  const normalized = normalizeActiveFeatures(value);
  const saved = await prisma.businessSettings.upsert({
    where: { key: ACTIVE_FEATURES_KEY },
    update: { value: normalized },
    create: { key: ACTIVE_FEATURES_KEY, value: normalized },
  });
  cache.set(ACTIVE_FEATURES_CACHE_KEY, normalized, 0);
  return saved;
};

const clearActiveFeaturesCache = () => {
  cache.del(ACTIVE_FEATURES_CACHE_KEY);
};

module.exports = {
  ACTIVE_FEATURES_KEY,
  ACTIVE_FEATURES_CACHE_KEY,
  DEFAULT_ACTIVE_FEATURES,
  normalizeActiveFeatures,
  getActiveFeatures,
  saveActiveFeatures,
  clearActiveFeaturesCache,
};