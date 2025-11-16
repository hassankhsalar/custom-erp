export const API_BASE_URL = 'http://localhost:3001/api';

export const API_ROUTES = {
  LOGIN: `${API_BASE_URL}/login`,
  REGISTER: `${API_BASE_URL}/register`,
  PROFILE: `${API_BASE_URL}/profile`,
  ADMIN: `${API_BASE_URL}/admin`,
  DASHBOARD: `${API_BASE_URL}/dashboard`,
  MATERIALS: `${API_BASE_URL}/materials`,
  PRODUCTS: `${API_BASE_URL}/products`,
  FACTORIES: `${API_BASE_URL}/factories`,
  PRODUCTIONS: `${API_BASE_URL}/productions`,
  STORES: `${API_BASE_URL}/stores`,
  SALES: `${API_BASE_URL}/sales`,
  PURCHASES: `${API_BASE_URL}/purchases`,

  SHOPS: `${API_BASE_URL}/shops`,
  SHOPS_ALL: `${API_BASE_URL}/shops`,
  SHOP_BY_ID: (id) => `${API_BASE_URL}/shops/${id}`,
  SHOP_STOCK: (id) => `${API_BASE_URL}/shops/${id}/stock`,

  // Shop POS routes
  SHOP_SALES: `${API_BASE_URL}/shop-sales`,
  SHOP_SALES_SHOPS: `${API_BASE_URL}/shop-sales/shops`,
  SHOP_SALES_PRODUCTS: (shopId) => `${API_BASE_URL}/shop-sales/products/shop/${shopId}`,
  SHOP_SALES_BY_ID: (id) => `${API_BASE_URL}/shop-sales/${id}`,

//transfer routes
STORE_TO_SHOP_TRANSFERS: `${API_BASE_URL}/store-to-shop-transfers`,
  STORE_TO_SHOP_TRANSFERS_SHOPS: `${API_BASE_URL}/store-to-shop-transfers/shops`,
  STORE_TO_SHOP_TRANSFER_STATUS: (id) => `${API_BASE_URL}/store-to-shop-transfers/${id}/status`,

  
  DASHBOARD2: 'http://localhost:3001/api/dash-board',
};