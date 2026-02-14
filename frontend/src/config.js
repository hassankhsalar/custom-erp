export const API_BASE_URL = 'http://localhost:3001/api';
export const MEDIA_BASE_URL = 'http://localhost:3001';

export const API_ROUTES = {
  LOGIN: `${API_BASE_URL}/login`,
  REGISTER: `${API_BASE_URL}/register`,
  PROFILE: `${API_BASE_URL}/profile`,
  ADMIN: `${API_BASE_URL}/admin`,
  DASHBOARD: `${API_BASE_URL}/dashboard`,

  MATERIALS: `${API_BASE_URL}/materials`,

  // Product routes
  PRODUCTS: `${API_BASE_URL}/products`,
  PRODUCTS_ALL: `${API_BASE_URL}/products/all-products`,

  FACTORIES: `${API_BASE_URL}/factories`,
  PRODUCTIONS: `${API_BASE_URL}/productions`,
  STORES: `${API_BASE_URL}/stores`,
  SALES: `${API_BASE_URL}/sales`,
  PURCHASES: `${API_BASE_URL}/purchases`,
  SUPPLIERS: `${API_BASE_URL}/suppliers`,
  ACCOUNTS: `${API_BASE_URL}/accounts`,
  ASSIGNACCOUNT: `${API_BASE_URL}/assign-account`,

  SHOPS: `${API_BASE_URL}/shops`,
  SHOPS_ALL: `${API_BASE_URL}/shops`,
  SHOP_BY_ID: (id) => `${API_BASE_URL}/shops/${id}`,
  SHOP_STOCK: (id) => `${API_BASE_URL}/shops/${id}/stock`,

  // Shop POS routes
  SHOP_SALES: `${API_BASE_URL}/shop-sales`,
  SHOP_WARRANTIES: `${API_BASE_URL}/shop-sales/warranties`,
  SHOP_WARRANTY_BY_ID: (id) => `${API_BASE_URL}/shop-sales/warranties/${id}`,
  SHOP_WARRANTY_CLAIMS: (id) => `${API_BASE_URL}/shop-sales/warranties/${id}/claims`,
  SHOP_SALES_SHOPS: `${API_BASE_URL}/shop-sales/shops`,
  SHOP_SALES_ITEMS: (shopId) => `${API_BASE_URL}/shop-sales/items/shop/${shopId}`,
  SHOP_SALES_BY_ID: (id) => `${API_BASE_URL}/shop-sales/${id}`,
  
  CUSTOMERS: `${API_BASE_URL}/customers`,
  CASHREGISTER: `${API_BASE_URL}/cash-registers`,
  BANK_ACCOUNTS: `${API_BASE_URL}/bank-accounts`,
  GENERAL_LEDGER: `${API_BASE_URL}/general-ledger`,
  BALANCE_SHEET: `${API_BASE_URL}/balance-sheet`,
  CASHREGISTERASSIGN: `${API_BASE_URL}/cash-register-assign`,
  HRM: `${API_BASE_URL}/hrm`,
  EXPENSES: `${API_BASE_URL}/expenses`,
  REPORTS: `${API_BASE_URL}/reports`,
  REPORT_TRIAL_BALANCE: `${API_BASE_URL}/reports/trial-balance`,
  REPORT_CASH_BANK: `${API_BASE_URL}/reports/cash-bank`,
  REPORT_SALES: `${API_BASE_URL}/reports/sales`,
  REPORT_PURCHASES: `${API_BASE_URL}/reports/purchases`,
  REPORT_PRODUCTION: `${API_BASE_URL}/reports/production`,
  REPORT_WASTAGE: `${API_BASE_URL}/reports/wastage`,
  REPORT_STOCK: `${API_BASE_URL}/reports/stock`,
  REPORT_TRANSFER: `${API_BASE_URL}/reports/transfer`,
  REPORT_PROFIT_LOSS: `${API_BASE_URL}/reports/profit-loss`,
  REPORT_PURCHASE_SALES: `${API_BASE_URL}/reports/purchase-sales`,
  REPORT_CUSTOMER: `${API_BASE_URL}/reports/customer`,
  REPORT_SUPPLIER: `${API_BASE_URL}/reports/supplier`,
  REPORT_BEST_SELLING: `${API_BASE_URL}/reports/best-selling`,
  REPORT_PROFIT_CALENDAR: `${API_BASE_URL}/reports/profit-calendar`,
  REPORT_PRODUCTION_SUMMARY: `${API_BASE_URL}/reports/production/summary`,
  REPORT_PRODUCTION_PRODUCTS: `${API_BASE_URL}/reports/production/products`,
  REPORT_WASTAGE_MATERIALS: `${API_BASE_URL}/reports/wastage/materials`,
  REPORT_WASTAGE_PRODUCTS: `${API_BASE_URL}/reports/wastage/products`,
  REPORT_STOCK_PRODUCTS: `${API_BASE_URL}/reports/stock/products`,
  REPORT_STOCK_MATERIALS: `${API_BASE_URL}/reports/stock/materials`,
  REPORT_SALES_PER_DATE: `${API_BASE_URL}/reports/sales/per-date`,
  REPORT_SALES_PER_MONTH: `${API_BASE_URL}/reports/sales/per-month`,
  REPORT_SALES_ALL: `${API_BASE_URL}/reports/sales/all`,
  REPORT_PURCHASES_PER_DATE: `${API_BASE_URL}/reports/purchases/per-date`,
  REPORT_PURCHASES_PER_MONTH: `${API_BASE_URL}/reports/purchases/per-month`,
  REPORT_PURCHASES_ALL: `${API_BASE_URL}/reports/purchases/all`,
  REPORT_CASH_BANK_DETAILS: `${API_BASE_URL}/reports/cash-bank/details`,
  REPORT_PURCHASE_SALES_DETAILS: `${API_BASE_URL}/reports/purchase-sales/details`,
  REPORT_CUSTOMER_DETAILS: `${API_BASE_URL}/reports/customer/details`,
  REPORT_SUPPLIER_DETAILS: `${API_BASE_URL}/reports/supplier/details`,
  REPORT_BEST_SELLING_DETAILS: `${API_BASE_URL}/reports/best-selling/details`,
  REPORT_TRANSFER_OVERVIEW: `${API_BASE_URL}/reports/transfer/overview`,
  REPORT_TRANSFER_TOP_SENDER: `${API_BASE_URL}/reports/transfer/top-sender`,
  REPORT_TRANSFER_TOP_RECEIVER: `${API_BASE_URL}/reports/transfer/top-receiver`,
  REPORT_TRANSFER_TOP_ITEMS: `${API_BASE_URL}/reports/transfer/top-items`,
  NOTIFICATIONS: `${API_BASE_URL}/notifications`,
  NOTIFICATIONS_LATEST: `${API_BASE_URL}/notifications/latest`,
  NOTIFICATIONS_UNREAD_COUNT: `${API_BASE_URL}/notifications/unread-count`,
  NOTIFICATIONS_MARK_ALL_READ: `${API_BASE_URL}/notifications/mark-all-read`,
  
  //SHOP_SALES_RETURNS: `${API_BASE_URL}/shop-sales/returns/all`,
  SHOP_SALES_RETURNS_BACKUP: `${API_BASE_URL}/shop-sales/returns-list`,
  //transfer routes
  TRANSFERS: `${API_BASE_URL}/transfers`,
  
  STORE_TO_SHOP_TRANSFERS: `${API_BASE_URL}/store-to-shop-transfers`,
  STORE_TO_SHOP_TRANSFERS_SHOPS: `${API_BASE_URL}/store-to-shop-transfers/shops`,
  STORE_TO_SHOP_TRANSFER_STATUS: (id) => `${API_BASE_URL}/store-to-shop-transfers/${id}/status`,

  //scrap
  SCRAP_RECORDS: `${API_BASE_URL}/scrap-records`,
  MATERIAL_SCRAP_RECORDS: `${API_BASE_URL}/materials-scrap-records`,
  BRANCH_MATERIALS: `${API_BASE_URL}/api/branch-materials`,
  
  // Add this new route for fetching scrap products by location
  SCRAP_PRODUCTS: `${API_BASE_URL}/scrap-products`,
  
  // Add product repair routes
  PRODUCT_REPAIRS: `${API_BASE_URL}/product-repairs`,
  
  DASHBOARD2: `${API_BASE_URL}/dash-board`,

   // Material repair routes
  MATERIAL_REPAIRS: `${API_BASE_URL}/material-repairs`,
  
  // Scrap materials route
  SCRAP_MATERIALS: `${API_BASE_URL}/scrap-materials`,

  //Image file uploads
  UPLOADS: `${API_BASE_URL}/uploads`,


  //user routes
  USERS: `${API_BASE_URL}/users`,
  ASSIGNUSER: `${API_BASE_URL}/assign-user`,
  PERMISSIONS: `${API_BASE_URL}/permissions`,
  USERMANAGEMENT: `${API_BASE_URL}/user-management`,
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
