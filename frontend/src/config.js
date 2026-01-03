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
  SUPPLIERS: `${API_BASE_URL}/suppliers`,

  SHOPS: `${API_BASE_URL}/shops`,
  SHOPS_ALL: `${API_BASE_URL}/shops`,
  SHOP_BY_ID: (id) => `${API_BASE_URL}/shops/${id}`,
  SHOP_STOCK: (id) => `${API_BASE_URL}/shops/${id}/stock`,

  // Shop POS routes
  SHOP_SALES: `${API_BASE_URL}/shop-sales`,
  SHOP_SALES_SHOPS: `${API_BASE_URL}/shop-sales/shops`,
  SHOP_SALES_ITEMS: (shopId) => `${API_BASE_URL}/shop-sales/items/shop/${shopId}`,
  SHOP_SALES_BY_ID: (id) => `${API_BASE_URL}/shop-sales/${id}`,

  //transfer routes
  TRANSFERS: `${API_BASE_URL}/transfers`,
  
  STORE_TO_SHOP_TRANSFERS: `${API_BASE_URL}/store-to-shop-transfers`,
  STORE_TO_SHOP_TRANSFERS_SHOPS: `${API_BASE_URL}/store-to-shop-transfers/shops`,
  STORE_TO_SHOP_TRANSFER_STATUS: (id) => `${API_BASE_URL}/store-to-shop-transfers/${id}/status`,

  
  DASHBOARD2: 'http://localhost:3001/api/dash-board',


  //user routes
  USERS: 'http://localhost:3001/api/users',
};

// &&&&&  indexJs route list for reference &&&&&&&&&&&&&&&&&&&&&&&&&&&

// const materialRoutes = require('./routes/materialRoutes');
// const productRoutes = require('./routes/productRoutes');
// const factoryRoutes = require('./routes/factoryRoutes');
// const productionRoutes = require('./routes/productionRoutes');
// const storeRoutes = require('./routes/storeRoutes');
// const supplierRoutes = require('./routes/supplierRoutes');
// const purchaseRoutes = require('./routes/purchaseRoutes');
// const salesRoutes = require('./routes/salesRoutes');
// const shopRoutes = require('./routes/shopRoutes');
// const shopSalesRoutes = require('./routes/shop-sales');
// const storeToShopTransfersRoutes = require('./routes/store-to-shop-transfers');
// const dashboardRoutes = require('./routes/dashboard');
// const userRoutes = require('./routes/users');
// const transferRoutes = require('./routes/transferRoutes');

// app.use('/api/materials', materialRoutes);
// app.use('/api/products', productRoutes);
// app.use('/api/factories', factoryRoutes);
// app.use('/api/productions', productionRoutes);
// app.use('/api/stores', storeRoutes);
// app.use('/api/suppliers', supplierRoutes);
// app.use('/api/purchases', purchaseRoutes);
// app.use('/api/sales', salesRoutes);
// app.use('/api/shops', shopRoutes);
// app.use('/api/shop-sales', shopSalesRoutes);
// app.use('/api/store-to-shop-transfers', storeToShopTransfersRoutes);
// app.use('/api/dash-board', dashboardRoutes);
// app.use('/api/users', userRoutes);
// app.use('/api/transfers', transferRoutes);