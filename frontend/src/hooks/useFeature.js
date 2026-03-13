import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_ROUTES } from '../config';

const ACTIVE_FEATURES_CACHE_KEY = 'active_features_cache_v1';

const DEFAULT_FEATURES = {
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

const normalizeFeatures = (incoming) => {
  const source = incoming && typeof incoming === 'object' ? incoming : {};
  const out = {};
  Object.entries(DEFAULT_FEATURES).forEach(([groupKey, groupDefaults]) => {
    const sourceGroup = source[groupKey] && typeof source[groupKey] === 'object' ? source[groupKey] : {};
    out[groupKey] = {};
    Object.entries(groupDefaults).forEach(([featureKey, defaultValue]) => {
      out[groupKey][featureKey] = typeof sourceGroup[featureKey] === 'boolean'
        ? sourceGroup[featureKey]
        : Boolean(defaultValue);
    });
  });
  return out;
};

const readCachedFeatures = () => {
  try {
    const raw = localStorage.getItem(ACTIVE_FEATURES_CACHE_KEY);
    if (!raw) return normalizeFeatures(undefined);
    return normalizeFeatures(JSON.parse(raw));
  } catch (_) {
    return normalizeFeatures(undefined);
  }
};

const writeCachedFeatures = (value) => {
  try {
    localStorage.setItem(ACTIVE_FEATURES_CACHE_KEY, JSON.stringify(value));
  } catch (_) {
    // ignore storage errors
  }
};

const toPathValue = (obj, path) => {
  if (!obj || typeof obj !== 'object') return false;
  const segments = String(path || '').split('.').filter(Boolean);
  let cursor = obj;
  for (const segment of segments) {
    if (!cursor || typeof cursor !== 'object' || !(segment in cursor)) return false;
    cursor = cursor[segment];
  }
  return Boolean(cursor);
};

export const useFeature = () => {
  const auth = useAuth();
  const loading = auth?.loading ?? true;
  const token = auth?.token || localStorage.getItem('token');
  const [features, setFeatures] = useState(() => readCachedFeatures());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (hydrated) return;
    const fromUser = auth?.currentUser?.activeFeatures;
    if (!fromUser || typeof fromUser !== 'object') return;
    const normalized = normalizeFeatures(fromUser);
    setFeatures(normalized);
    writeCachedFeatures(normalized);
    setHydrated(true);
  }, [auth?.currentUser?.activeFeatures, hydrated]);

  useEffect(() => {
    if (!token) return;
    let isMounted = true;

    const fetchFeatures = async () => {
      try {
        const res = await fetch(API_ROUTES.BUSINESS_SETTINGS_BY_KEY('active_features'), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const row = await res.json();
        const normalized = normalizeFeatures(row?.value);
        if (!isMounted) return;
        setFeatures(normalized);
        writeCachedFeatures(normalized);
        setHydrated(true);
      } catch (_) {
        // keep fallback values
      }
    };

    fetchFeatures();
    return () => {
      isMounted = false;
    };
  }, [token]);

  useEffect(() => {
    const onUpdated = (event) => {
      const normalized = normalizeFeatures(event?.detail);
      setFeatures(normalized);
      writeCachedFeatures(normalized);
      setHydrated(true);
    };
    window.addEventListener('active-features-updated', onUpdated);
    return () => window.removeEventListener('active-features-updated', onUpdated);
  }, []);

  const isFeatureActive = useCallback((featurePath) => {
    if (loading && !features) return false;
    if (typeof featurePath === 'string') {
      return toPathValue(features, featurePath);
    }
    if (Array.isArray(featurePath)) {
      return featurePath.some((path) => toPathValue(features, path));
    }
    return false;
  }, [features, loading]);

  return useMemo(() => ({
    activeFeatures: features,
    isFeatureActive,
    loading,
  }), [features, isFeatureActive, loading]);
};
