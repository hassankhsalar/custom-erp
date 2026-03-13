import { useEffect, useMemo, useState } from 'react';
import { API_ROUTES } from '../../config';
import { useAuth } from '../../context/AuthContext';
import { CheckCircle, Save, Settings2 } from 'lucide-react';

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

const FEATURE_GROUPS = [
  {
    key: 'sale',
    label: 'Sale',
    options: [
      { key: 'negative_stock_sale', label: 'Negative Stock Sale' },
      { key: 'shared_sale', label: 'Shared Sale' },
      { key: 'enable_warranty', label: 'Enable Warranty' },
    ],
  },
  {
    key: 'purchase',
    label: 'Purchase',
    options: [{ key: 'enable_multi_shipping', label: 'Enable Multi Shipping' }],
  },
  {
    key: 'production',
    label: 'Production',
    options: [{ key: 'enable_production', label: 'Enable Production' }],
  },
  {
    key: 'requisition',
    label: 'Requisition',
    options: [{ key: 'enable_requisition', label: 'Enable Requisition' }],
  },
  {
    key: 'stock_management',
    label: 'Stock Management',
    options: [{ key: 'enable_batch_tracking', label: 'Enable Batch Tracking' }],
  },
  {
    key: 'product_item',
    label: 'Product/Item',
    options: [
      { key: 'enable_multi_naming', label: 'Enable Multi Naming' },
      { key: 'enable_multi_unit', label: 'Enable Multi Unit' },
    ],
  },
  {
    key: 'ecommerce',
    label: 'Ecommerce Management',
    options: [
      { key: 'enable_ecommerce', label: 'Enable Ecommerce' },
    ],
  },
];

const normalizeFeatures = (incoming) => {
  const source = incoming && typeof incoming === 'object' ? incoming : {};
  const output = {};
  Object.entries(DEFAULT_FEATURES).forEach(([groupKey, defaults]) => {
    output[groupKey] = {};
    const sourceGroup = source[groupKey] && typeof source[groupKey] === 'object' ? source[groupKey] : {};
    Object.entries(defaults).forEach(([featureKey, defaultValue]) => {
      output[groupKey][featureKey] = typeof sourceGroup[featureKey] === 'boolean'
        ? sourceGroup[featureKey]
        : Boolean(defaultValue);
    });
  });
  return output;
};

export default function FeatureActivation() {
  const [features, setFeatures] = useState(DEFAULT_FEATURES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const totalEnabled = useMemo(() => {
    return Object.values(features).reduce((sum, group) => {
      return sum + Object.values(group).filter(Boolean).length;
    }, 0);
  }, [features]);

  useEffect(() => {
    const fetchFeatures = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(API_ROUTES.BUSINESS_SETTINGS_BY_KEY('active_features'), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          setFeatures(DEFAULT_FEATURES);
          return;
        }
        const row = await res.json();
        setFeatures(normalizeFeatures(row?.value));
      } catch (_) {
        setFeatures(DEFAULT_FEATURES);
      } finally {
        setLoading(false);
      }
    };

    fetchFeatures();
  }, []);

  const toggleFeature = (groupKey, featureKey) => {
    setFeatures((prev) => ({
      ...prev,
      [groupKey]: {
        ...prev[groupKey],
        [featureKey]: !prev[groupKey][featureKey],
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(API_ROUTES.BUSINESS_SETTINGS_BY_KEY('active_features'), {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value: features }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save feature activation');
      }
      setMessage('Saved successfully');
      window.dispatchEvent(new CustomEvent('active-features-updated', { detail: features }));
    } catch (error) {
      setMessage(error.message || 'Failed to save feature activation');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading feature activation...</div>;
  }

  return (
    <div className="min-h-screen rounded-t-2xl bg-gradient-to-br from-slate-50 via-white to-cyan-50 p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-cyan-100 p-3 text-cyan-700">
                <Settings2 size={22} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Feature Activation</h1>
                <p className="text-sm text-slate-600">Enable or disable functional modules from a single configuration object.</p>
              </div>
            </div>
            <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">
              {totalEnabled} features enabled
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {FEATURE_GROUPS.map((group) => (
            <div key={group.key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-lg font-semibold text-slate-800">{group.label}</h2>
              <div className="space-y-3">
                {group.options.map((option) => (
                  <label key={option.key} className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50">
                    <span className="text-sm text-slate-700">{option.label}</span>
                    <input
                      type="checkbox"
                      checked={Boolean(features[group.key]?.[option.key])}
                      onChange={() => toggleFeature(group.key, option.key)}
                      className="h-4 w-4"
                    />
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-70"
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Feature Activation'}
          </button>
          {message ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-3 py-1 text-sm text-slate-700">
              <CheckCircle size={14} />
              {message}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}


