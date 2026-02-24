export const API_BASE_URL = 'http://localhost:3001/api';
export const MEDIA_BASE_URL = 'http://localhost:3001';
export const SOCKET_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '');

export const API_ROUTES = {
  LOGIN: `${API_BASE_URL}/login`,
  REGISTER: `${API_BASE_URL}/register`,
  PROFILE: `${API_BASE_URL}/profile`,
  ADMIN: `${API_BASE_URL}/admin`,
  DASHBOARD: `${API_BASE_URL}/dashboard`,

  MATERIALS: `${API_BASE_URL}/materials`,
  MATERIALS_ALL: `${API_BASE_URL}/materials/all-materials`,

  // Product routes
  PRODUCTS: `${API_BASE_URL}/products`,
  PRODUCTS_ALL: `${API_BASE_URL}/products/all-products`,

  FACTORIES: `${API_BASE_URL}/factories`,
  FACTORY_INVENTORY_FACTORIES: `${API_BASE_URL}/factories/allfactories`,
  FACTORY_INVENTORY: (factoryId) => `${API_BASE_URL}/factories/inventory/${factoryId}`,
  FACTORY_INVENTORY_SUMMARY: (factoryId) => `${API_BASE_URL}/factories/inventory/${factoryId}/summary`,
  FACTORY_INVENTORY_ITEM_UPDATE: (factoryId) => `${API_BASE_URL}/factories/inventory/${factoryId}/item`,




  PRODUCTIONS: `${API_BASE_URL}/productions`,
  STORES: `${API_BASE_URL}/stores`,
  STORE_INVENTORY_ITEM_UPDATE: (storeId) => `${API_BASE_URL}/stores/inventory/${storeId}/item`,
  SALES: `${API_BASE_URL}/sales`,
  PURCHASES: `${API_BASE_URL}/purchases`,
  PURCHASE_BY_ID: (id) => `${API_BASE_URL}/purchases/${id}`,
  PURCHASE_DESTINATIONS: (type) => `${API_BASE_URL}/purchases/destinations/${type}`,
  PURCHASE_RETURNS_ALL: `${API_BASE_URL}/purchases/returns`,
  PURCHASE_DAMAGE_RETURNS_ALL: `${API_BASE_URL}/purchases/damage-returns`,
  PURCHASE_RETURN_BY_ID: (id) => `${API_BASE_URL}/purchases/returns/${id}`,
  PURCHASE_RETURN_PAYMENTS: (id) => `${API_BASE_URL}/purchases/returns/${id}/payments`,
  PURCHASE_RETURN_DAMAGE_ITEMS: (sourceType, sourceId) => `${API_BASE_URL}/purchases/returns/damage-items?sourceType=${encodeURIComponent(sourceType)}&sourceId=${encodeURIComponent(sourceId)}`,
  PURCHASE_RETURNS: (id) => `${API_BASE_URL}/purchases/${id}/returns`,
  PURCHASE_DAMAGE_RETURNS: (id) => `${API_BASE_URL}/purchases/${id}/damage-returns`,
  PURCHASE_RETURN_COMP_SHIPMENTS: (returnId) => `${API_BASE_URL}/purchases/returns/${returnId}/compensation-shipments`,
  SUPPLIERS: `${API_BASE_URL}/suppliers`,
  ACCOUNTS: `${API_BASE_URL}/accounts`,
  ASSIGNACCOUNT: `${API_BASE_URL}/assign-account`,

  SHOPS: `${API_BASE_URL}/shops`,
  SHOPS_ALL: `${API_BASE_URL}/shops`,
  SHOP_BY_ID: (id) => `${API_BASE_URL}/shops/${id}`,
  SHOP_STOCK: (id) => `${API_BASE_URL}/shops/${id}/stock`,
  SHOP_INVENTORY_ITEM_UPDATE: (shopId) => `${API_BASE_URL}/shops/inventory/${shopId}/item`,

  // Shop POS routes
  SHOP_SALES: `${API_BASE_URL}/shop-sales`,
  SHOP_WARRANTIES: `${API_BASE_URL}/shop-sales/warranties`,
  SHOP_WARRANTY_BY_ID: (id) => `${API_BASE_URL}/shop-sales/warranties/${id}`,
  SHOP_WARRANTY_CLAIMS: (id) => `${API_BASE_URL}/shop-sales/warranties/${id}/claims`,
  SHOP_WARRANTY_CLAIM_BY_ID: (warrantyId, claimId) => `${API_BASE_URL}/shop-sales/warranties/${warrantyId}/claims/${claimId}`,
  SHOP_SALES_SHOPS: `${API_BASE_URL}/shop-sales/shops`,
  SHOP_SALES_CASH_REGISTERS: (shopId) => `${API_BASE_URL}/shop-sales/cash-registers/shop/${shopId}`,
  SHOP_SALES_ITEMS: (shopId) => `${API_BASE_URL}/shop-sales/items/shop/${shopId}`,
  SHOP_SALES_BY_ID: (id) => `${API_BASE_URL}/shop-sales/${id}`,
  SHOP_SALES_DETAILS_BY_ID: (id) => `${API_BASE_URL}/shop-sales/details/${id}`,
  SHOP_SALES_EDIT_ACCESS_OPEN: (id) => `${API_BASE_URL}/shop-sales/${id}/edit-access/open`,
  SHOP_SALES_EDIT_ACCESS_REQUEST: (id) => `${API_BASE_URL}/shop-sales/${id}/edit-access/request`,
  SHOP_SALES_EDIT_ACCESS_CLOSE: (id) => `${API_BASE_URL}/shop-sales/${id}/edit-access/close`,
  SHOP_SALES_TRANSACTION_STATUS: (id) => `${API_BASE_URL}/shop-sales/${id}/transaction-status`,
  SHOP_SALES_EDIT_REQUESTS: `${API_BASE_URL}/shop-sales/edit-access/requests`,
  SHOP_SALES_EDIT_REQUEST_APPROVE: (requestId) => `${API_BASE_URL}/shop-sales/edit-access/requests/${requestId}/approve`,
  SHOP_SALES_EDIT_REQUEST_REJECT: (requestId) => `${API_BASE_URL}/shop-sales/edit-access/requests/${requestId}/reject`,
  
  CUSTOMERS: `${API_BASE_URL}/customers`,
  CUSTOMERS_ALL: `${API_BASE_URL}/customers/all-customers`,
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
  REPORT_DAILY_STOCK: `${API_BASE_URL}/reports/daily-stock`,
  REPORT_DAILY_STOCK_BY_ID: (snapshotId) => `${API_BASE_URL}/reports/daily-stock/${snapshotId}`,
  REPORT_DAILY_STOCK_RUN_NOW: `${API_BASE_URL}/reports/daily-stock/run-now`,
  NOTIFICATIONS: `${API_BASE_URL}/notifications`,
  NOTIFICATIONS_LATEST: `${API_BASE_URL}/notifications/latest`,
  NOTIFICATIONS_UNREAD_COUNT: `${API_BASE_URL}/notifications/unread-count`,
  NOTIFICATIONS_MARK_ALL_READ: `${API_BASE_URL}/notifications/mark-all-read`,
  ACTIVITY_LOGS: `${API_BASE_URL}/activity-logs`,
  ACTIVITY_LOGS_LOGOUT: `${API_BASE_URL}/activity-logs/logout`,
  MASTER_DATA: `${API_BASE_URL}/master-data`,
  MASTER_DATA_UNITS: `${API_BASE_URL}/master-data/units`,
  MASTER_DATA_BRANDS: `${API_BASE_URL}/master-data/brands`,
  MASTER_DATA_PRODUCT_CATEGORIES: `${API_BASE_URL}/master-data/product-categories`,
  MASTER_DATA_UNIT_RELATIONS: `${API_BASE_URL}/master-data/unit-relations`,
  MASTER_DATA_UNIT_RELATION_SUGGESTIONS: (primaryUnit) => `${API_BASE_URL}/master-data/unit-relations/suggestions/${encodeURIComponent(primaryUnit)}`,
  BUSINESS_SETTINGS: `${API_BASE_URL}/business-settings`,
  BUSINESS_SETTINGS_BY_KEY: (key) => `${API_BASE_URL}/business-settings/${encodeURIComponent(key)}`,
  
  //SHOP_SALES_RETURNS: `${API_BASE_URL}/shop-sales/returns/all`,
  SHOP_SALES_RETURNS_BACKUP: `${API_BASE_URL}/shop-sales/returns-list`,
  //transfer routes
  TRANSFERS: `${API_BASE_URL}/transfers`,
  TRANSFER_BY_ID: (id) => `${API_BASE_URL}/transfers/${id}`,
  TRANSFER_STATUS: (id) => `${API_BASE_URL}/transfers/${id}/status`,
  TRANSFER_RECEIVE: (id) => `${API_BASE_URL}/transfers/${id}/receive`,
  TRANSFER_CANCEL: (id) => `${API_BASE_URL}/transfers/${id}/cancel`,
  TRANSFER_RECEIPTS: (id) => `${API_BASE_URL}/transfers/${id}/receipts`,
  TRANSFER_RETURN_UNRECEIVED: (id) => `${API_BASE_URL}/transfers/${id}/return-unreceived`,
  REQUISITIONS: `${API_BASE_URL}/requisitions`,
  REQUISITION_PLACES: `${API_BASE_URL}/requisitions/places`,
  REQUISITION_ITEM_LOOKUP: `${API_BASE_URL}/requisitions/lookup/items`,
  REQUISITION_TRANSFER_ORDERS: `${API_BASE_URL}/requisitions/orders/transfer`,
  REQUISITION_PRODUCTION_ORDERS: `${API_BASE_URL}/requisitions/orders/production`,
  REQUISITION_PURCHASE_ORDERS: `${API_BASE_URL}/requisitions/orders/purchase`,
  REQUISITION_BY_ID: (id) => `${API_BASE_URL}/requisitions/${id}`,
  REQUISITION_SECTIONS: (id) => `${API_BASE_URL}/requisitions/${id}/sections`,
  REQUISITION_APPROVE: (id) => `${API_BASE_URL}/requisitions/${id}/approve`,
  REQUISITION_REJECT: (id) => `${API_BASE_URL}/requisitions/${id}/reject`,
  REQUISITION_SECTION_ACTION: (sectionId) => `${API_BASE_URL}/requisitions/sections/${sectionId}/action`,
  REQUISITION_SECTION_COMPLETE: (sectionId) => `${API_BASE_URL}/requisitions/sections/${sectionId}/complete`,
  REQUISITION_CHILD: (id) => `${API_BASE_URL}/requisitions/${id}/child`,
  
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
  USER_ACTIVE_SESSIONS: `${API_BASE_URL}/users/active-sessions`,
  USER_FORCE_LOGOUT: (id) => `${API_BASE_URL}/users/${id}/force-logout`,
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
