import React, { useState, createContext, useContext, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom"; // Import Outlet
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import Sidebar from "./components/Sidebar";

// Import all new page components
import AllProducts from "./components/Products/AllProducts";
import CreateProduct from "./components/Products/CreateProduct";
import EditProduct from "./components/Products/EditProduct";
import POS from "./components/Sale/POS";
import AllSales from "./components/Sale/AllSales";
import CreateSale from "./components/Sale/CreateSale";
import SaleReturn from "./components/Sale/SaleReturn";
import AllMaterials from "./components/Materials/AllMaterials";
import AddMaterial from "./components/Materials/AddMaterial";
import ScrapeMaterials from "./components/Materials/ScrapeMaterials";
import RecoverMaterials from "./components/Materials/RecoverMaterials";
import EditMaterial from "./components/Materials/EditMaterial";
import AllProductions from "./components/Productions/AllProductions";
import NewProduction from "./components/Productions/NewProduction";
import EditProduction from "./components/Productions/EditProduction";
import AllPurchase from "./components/Purchase/AllPurchase";
import NewPurchase from "./components/Purchase/NewPurchase";
import AllSupplier from "./components/Purchase/AllSupplier";
import AddSupplier from "./components/Purchase/AddSupplier";
import AllFactory from "./components/Factory/AllFactory";
import AddFactory from "./components/Factory/AddFactory";
import EditFactory from "./components/Factory/EditFactory";
import AllStore from "./components/Stores/AllStore";
import AddStore from "./components/Stores/AddStore";
import EditStore from "./components/Stores/EditStore";
import SaleReport from "./components/Report/SaleReport";
import PurchaseReport from "./components/Report/PurchaseReport";
import ProductionReport from "./components/Report/ProductionReport";
import WastageReport from "./components/Report/WastageReport";
import ScrapeReport from "./components/Report/ScrapeReport";
import AllUser from "./components/Users/AllUser";
import CreateUser from "./components/Users/CreateUser";
import Settings from "./components/Settings/Settings";
import AddShop from "./components/Shop/AddShop";
import AllShop from "./components/Shop/AllShop";
import AllReturns from "./components/Sale/AllReturns";
import StoreDetails from "./components/Stores/StoreDetails";
import StoreToShopTransfer from "./components/Stores/StoreToShopTransfer";
import TransferManagement from "./components/Stores/TransferManagement";
import AddTransfer from "./components/Transfer/AddTransfer";
import StoreToStore from "./components/Transfer/StoreToStore";
import StoreToFactory from "./components/Transfer/StoreToFactory";
import StoreToShop from "./components/Transfer/StoreToShop";
import FactoryToFactory from "./components/Transfer/FactoryToFactory";
import FactoryToStore from "./components/Transfer/FactoryToStore";
import FactoryToShop from "./components/Transfer/FactoryToShop";
import ShopToShop from "./components/Transfer/ShopToShop";
import ShopToStore from "./components/Transfer/ShopToStore";
import ShopToFactory from "./components/Transfer/ShopToFactory";
import Navbar from "./components/Navbar";
import Notifications from "./components/Notifications";
import UserProfile from "./components/UserProfile";
import ScrapRecord from "./components/ScrapRecord/ScrapRecord";
import ProductRepair from "./components/ProductRepair/ProductRepair";
import AddScrapRecord from "./components/ScrapRecord/AddScrapRecord";
import AddRepairProduct from "./components/ProductRepair/AddRepairProduct";
import AddRepairMaterial from "./components/MaterialRepair/AddRepairMaterial";
import MaterialRepair from "./components/MaterialRepair/MaterialRepair";
import AddMaterialScrapRecord from "./components/ScrapRecord/AddMaterialScrapRecord";
import MaterialScrapRecord from "./components/ScrapRecord/MaterialScrapRecord";
import AddAccount from "./components/Accounts/AddAccount";
import AllAccounts from "./components/Accounts/AllAccounts";
import AssignAccount from "./components/Accounts/AssignAccount";
import CashRegisterAssign from "./components/Accounts/CashRegisterAssign";
import AddCashRegister from "./components/Accounts/AddCashRegister";
import AssignUser from "./components/Users/AssignUser";
import AllAssignedUsers from "./components/Users/AllAssignedUsers";
import PermissionsManagement from "./components/Permissions/PermissionsManagement";

import { useCurrentUser } from "./hooks/useCurrentUser";
import { usePermission } from "./hooks/usePermission";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const { currentUser, loading, error, refetch } = useCurrentUser();

  const login = (newToken) => {
    setToken(newToken);
    localStorage.setItem("token", newToken);
    refetch(); // Refetch user data after login
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem("token");
    localStorage.removeItem("userEmail"); // Clear user email on logout
    // Optionally, clear currentUser state here if needed
  };

  return (
    <AuthContext.Provider value={{ token, login, logout, currentUser, loading, error, refetch }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

const PrivateRoute = () => {
  // This component will now render an Outlet
  const { token } = useAuth();
  return token ? <Outlet /> : <Navigate to="/login" />;
};

const PermissionRoute = ({ requiredPermission }) => {
  const { hasPermission, loading } = usePermission();
  const { loading: authLoading } = useAuth();

  if (loading || authLoading) {
    return <div>Loading permissions...</div>; // Or a spinner component
  }

  if (hasPermission(requiredPermission)) {
    return <Outlet />;
  } else {
    return <Navigate to="/dashboard" replace />; // Redirect to dashboard if unauthorized
  }
};

// Layout component for authenticated users
const AuthenticatedLayout = () => {
  return (
    <div className="flex">
      
      <div>
          <Sidebar />
        </div>
      <div className="">
        <div className="h-25 w-full mx-auto">
        <Navbar />
      </div>
        <div style={{ flexGrow: 1, padding: "0px" }}>
          <Outlet /> {/* This is where nested routes will render */}
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Protected routes with layout */}
        <Route element={<PrivateRoute />}>
          <Route element={<AuthenticatedLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            {/* New Routes */}
            <Route element={<PermissionRoute requiredPermission="product_read" />}>
              <Route path="/products/all" element={<AllProducts />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="product_create" />}>
              <Route path="/products/create" element={<CreateProduct />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="product_update" />}>
              <Route path="/products/edit/:id" element={<EditProduct />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="sales_create" />}>
              <Route path="/sale/pos" element={<POS />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="sales_read" />}>
              <Route path="/sale/all" element={<AllSales />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="sales_create" />}>
              <Route path="/sale/create" element={<CreateSale />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="sales_return_create" />}>
              <Route path="/sale/return" element={<SaleReturn />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="sales_return_read" />}>
              <Route path="/sale/allreturns" element={<AllReturns />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="material_read" />}>
              <Route path="/materials/all" element={<AllMaterials />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="material_create" />}>
              <Route path="/materials/add" element={<AddMaterial />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="material_update" />}>
              <Route path="/materials/edit/:id" element={<EditMaterial />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="material_scrape" />}>
              <Route path="/materials/scrape" element={<ScrapeMaterials />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="material_recover" />}>
              <Route path="/materials/recover" element={<RecoverMaterials />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="production_read" />}>
              <Route path="/productions/all" element={<AllProductions />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="production_create" />}>
              <Route path="/productions/new" element={<NewProduction />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="production_update" />}>
              <Route path="/productions/edit/:id" element={<EditProduction />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="purchase_read" />}>
              <Route path="/purchase/all" element={<AllPurchase />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="purchase_create" />}>
              <Route path="/purchase/new" element={<NewPurchase />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="supplier_read" />}>
              <Route path="/purchase/all-supplier" element={<AllSupplier />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="supplier_create" />}>
              <Route path="/purchase/add-supplier" element={<AddSupplier />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="factory_read" />}>
              <Route path="/factories/all" element={<AllFactory />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="factory_create" />}>
              <Route path="/factories/add" element={<AddFactory />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="factory_update" />}>
              <Route path="/factories/edit/:id" element={<EditFactory />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="store_read" />}>
              <Route path="/stores/all" element={<AllStore />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="store_create" />}>
              <Route path="/stores/add" element={<AddStore />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="store_update" />}>
              <Route path="/stores/edit/:id" element={<EditStore />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="store_read" />}>
              <Route path="/stores/details/:id" element={<StoreDetails />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="transfer_store_to_shop" />}>
              <Route
                path="/stores/transfer/:id"
                element={<StoreToShopTransfer />}
              />
            </Route>
            <Route element={<PermissionRoute requiredPermission="shop_create" />}>
              <Route path="/shop/add" element={<AddShop />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="shop_read" />}>
              <Route path="/shop/all" element={<AllShop />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="report_sale_read" />}>
              <Route path="/report/sale" element={<SaleReport />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="report_purchase_read" />}>
              <Route path="/report/purchase" element={<PurchaseReport />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="report_production_read" />}>
              <Route path="/report/production" element={<ProductionReport />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="report_wastage_read" />}>
              <Route path="/report/wastage" element={<WastageReport />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="report_scrape_read" />}>
              <Route path="/report/scrape" element={<ScrapeReport />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="user_read" />}>
              <Route path="/users/all" element={<AllUser />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="user_create" />}>
              <Route path="/users/create" element={<CreateUser />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="settings_read" />}>
              <Route path="/settings" element={<Settings />} />
            </Route>

            <Route element={<PermissionRoute requiredPermission="account_create" />}>
              <Route path="/addaccount" element={<AddAccount />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="account_read" />}>
              <Route path="/allaccounts" element={<AllAccounts />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="account_create" />}>
              <Route path="/assignaccount" element={<AssignAccount />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="cash_register_assign" />}>
              <Route path="/cashregisterassign" element={<CashRegisterAssign />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="cash_register_create" />}>
              <Route path="/addcashregister" element={<AddCashRegister />} />
            </Route>

            
            <Route element={<PermissionRoute requiredPermission="user_assign" />}>
              <Route path="/assignuser" element={<AssignUser />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="user_assigned_list" />}>
              <Route path="/assignedusers" element={<AllAssignedUsers />} />
            </Route>
            
            <Route element={<PermissionRoute requiredPermission="permission_manage" />}>
              <Route path="/managepermissions" element={<PermissionsManagement />} />
            </Route>

            
            <Route element={<PermissionRoute requiredPermission="product_scrap_read" />}>
              <Route path="/scraprecord" element={<ScrapRecord />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="product_scrap_create" />}>
              <Route path="/addscraprecord" element={<AddScrapRecord />} />
            </Route>

            <Route element={<PermissionRoute requiredPermission="material_scrap_read" />}>
              <Route path="/materialscraprecord" element={<MaterialScrapRecord />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="material_scrap_create" />}>
              <Route path="/addmaterialscraprecord" element={<AddMaterialScrapRecord />} />
            </Route>

            <Route element={<PermissionRoute requiredPermission="product_repair_read" />}>
              <Route path="/productrepair" element={<ProductRepair />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="product_repair_create" />}>
              <Route path="/addrepairproduct" element={<AddRepairProduct />} />
            </Route>

            <Route element={<PermissionRoute requiredPermission="material_repair_read" />}>
              <Route path="/materialrepair" element={<MaterialRepair />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="material_repair_create" />}>
              <Route path="/addrepairmaterial" element={<AddRepairMaterial />} />
            </Route>

            <Route element={<PermissionRoute requiredPermission="transfer_read" />}>
              <Route path="/transfers" element={<TransferManagement />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="transfer_create" />}>
              <Route path="/transfer/add" element={<AddTransfer />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="transfer_store_to_store" />}>
              <Route path="/transfer/store-to-store" element={<StoreToStore />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="transfer_store_to_factory" />}>
              <Route
                path="/transfer/store-to-factory"
                element={<StoreToFactory />}
              />
            </Route>
            <Route element={<PermissionRoute requiredPermission="transfer_store_to_shop" />}>
              <Route path="/transfer/store-to-shop" element={<StoreToShop />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="transfer_factory_to_factory" />}>
              <Route
                path="/transfer/factory-to-factory"
                element={<FactoryToFactory />}
              />
            </Route>
            <Route element={<PermissionRoute requiredPermission="transfer_factory_to_store" />}>
              <Route
                path="/transfer/factory-to-store"
                element={<FactoryToStore />}
              />
            </Route>
            <Route element={<PermissionRoute requiredPermission="transfer_factory_to_shop" />}>
              <Route
                path="/transfer/factory-to-shop"
                element={<FactoryToShop />}
              />
            </Route>
            <Route element={<PermissionRoute requiredPermission="transfer_shop_to_shop" />}>
              <Route path="/transfer/shop-to-shop" element={<ShopToShop />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="transfer_shop_to_store" />}>
              <Route path="/transfer/shop-to-store" element={<ShopToStore />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="transfer_shop_to_factory" />}>
              <Route
                path="/transfer/shop-to-factory"
                element={<ShopToFactory />}
              />
            </Route>
            <Route element={<PermissionRoute requiredPermission="notification_read" />}>
              <Route path="/notifications" element={<Notifications />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="user_profile_read" />}>
              <Route path="/userprofile" element={<UserProfile />} />
            </Route>
            {/* Default route for authenticated users */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Route>

        {/* Fallback for any unmatched routes, redirects to login if not authenticated */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
