import React, { useState, useEffect, useRef, useCallback } from "react";
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
import EditSale from "./components/Sale/EditSale";
import SaleEditRequests from "./components/Sale/SaleEditRequests";
import SaleReturn from "./components/Sale/SaleReturn";
import WarrantyList from "./components/Sale/WarrantyList";
import AllMaterials from "./components/Materials/AllMaterials";
import AddMaterial from "./components/Materials/AddMaterial";
import ScrapeMaterials from "./components/Materials/ScrapeMaterials";
import RecoverMaterials from "./components/Materials/RecoverMaterials";
import EditMaterial from "./components/Materials/EditMaterial";
import AllProductions from "./components/Productions/AllProductions";
import NewProduction from "./components/Productions/NewProduction";
import EditProduction from "./components/Productions/EditProduction";
import AllPurchase from "./components/Purchase/AllPurchase";
import AllPurchaseReturns from "./components/Purchase/AllPurchaseReturns";
import NewPurchase from "./components/Purchase/NewPurchase";
import EditPurchase from "./components/Purchase/EditPurchase";
import AllSupplier from "./components/Purchase/AllSupplier";
import AddSupplier from "./components/Purchase/AddSupplier";
import PurchaseReturnPage from "./components/Purchase/PurchaseReturnPage";
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
import StockReport from "./components/Report/StockReport";
import GenericReport from "./components/Report/GenericReport";
import BestSellingReport from "./components/Report/BestSellingReport";
import CashBankReport from "./components/Report/CashBankReport";
import PurchaseSalesReport from "./components/Report/PurchaseSalesReport";
import CustomerReport from "./components/Report/CustomerReport";
import SupplierReport from "./components/Report/SupplierReport";
import TransferReport from "./components/Report/TransferReport";
import DailyStockReport from "./components/Report/DailyStockReport";
import AllUser from "./components/Users/AllUser";
import CreateUser from "./components/Users/CreateUser";
import Settings from "./components/Settings/Settings";
import ActivityLog from "./components/Settings/ActivityLog";
import Units from "./components/Settings/Units";
import Brands from "./components/Settings/Brands";
import Categories from "./components/Settings/Categories";
import PrinterSettings from "./components/Settings/PrinterSettings";
import PrintLabel from "./components/Settings/PrintLabel";
import AddShop from "./components/Shop/AddShop";
import AllShop from "./components/Shop/AllShop";
import AllReturns from "./components/Sale/AllReturns";
import AllCustomers from "./components/Customer/AllCustomers";
import AddCustomer from "./components/Customer/AddCustomer";
import StoreDetails from "./components/Stores/StoreDetails";
import StoreToShopTransfer from "./components/Stores/StoreToShopTransfer";
import TransferList from "./components/Transfer/TransferList";
import AddTransfer from "./components/Transfer/AddTransfer";
import TransferReceive from "./components/Transfer/TransferReceive";
import TransferReceiveHistory from "./components/Transfer/TransferReceiveHistory";
import Navbar from "./components/Navbar";
import Notifications from "./components/Notifications";
import UserProfile from "./components/UserProfile";
import ProductRepair from "./components/ProductRepair/ProductRepair";
import AddRepairProduct from "./components/ProductRepair/AddRepairProduct";
import AddRepairMaterial from "./components/MaterialRepair/AddRepairMaterial";
import MaterialRepair from "./components/MaterialRepair/MaterialRepair";
import DamageRecord from "./components/ScrapRecord/DamageRecord";
import RepairCreate from "./components/Repair/RepairCreate";
import RepairedItems from "./components/Repair/RepairedItems";
import AddAccount from "./components/Accounts/AddAccount";
import AllAccounts from "./components/Accounts/AllAccounts";
import AssignAccount from "./components/Accounts/AssignAccount";
import CashRegisterAssign from "./components/Accounts/CashRegisterAssign";
import AddCashRegister from "./components/Accounts/AddCashRegister";
import CashRegisterList from "./components/Accounts/CashRegisterList";
import CashRegisterRecords from "./components/Accounts/CashRegisterRecords";
import BankAccounts from "./components/Accounts/BankAccounts";
import GeneralLedger from "./components/Accounts/GeneralLedger";
import BalanceSheet from "./components/Accounts/BalanceSheet";
import Employees from "./components/HRM/Employees";
import Attendance from "./components/HRM/Attendance";
import Holidays from "./components/HRM/Holidays";
import LeaveCategories from "./components/HRM/LeaveCategories";
import LeaveRequests from "./components/HRM/LeaveRequests";
import Payroll from "./components/HRM/Payroll";
import ExpenseCategories from "./components/Expense/ExpenseCategories";
import Expenses from "./components/Expense/Expenses";
import Salaries from "./components/Expense/Salaries";
import AssignUser from "./components/Users/AssignUser";
import AllAssignedUsers from "./components/Users/AllAssignedUsers";
import PermissionsManagement from "./components/Permissions/PermissionsManagement";
import NewRequisition from "./components/Requisition/NewRequisition";
import RequisitionList from "./components/Requisition/RequisitionList";
import RequisitionView from "./components/Requisition/RequisitionView";
import Unauthorized from "./components/Unauthorized";
import { API_ROUTES } from "./config";
import { SOCKET_BASE_URL } from "./config";
import { io } from "socket.io-client";

import { useCurrentUser } from "./hooks/useCurrentUser";
import { usePermission } from "./hooks/usePermission";
import FactoryInventory from "./components/Factory/FactoryInventory";
import StoreInventory from "./components/Stores/StoreInventory";
import ShopInventory from "./components/Shop/ShopInventory";
import EditShop from "./components/Shop/EditShop";
import { AuthContext, useAuth } from "./context/AuthContext";


export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [socketInstance, setSocketInstance] = useState(null);
  const { currentUser, loading, error, refetch } = useCurrentUser();
  const socketRef = useRef(null);

  const login = useCallback((newToken) => {
    setToken(newToken);
    localStorage.setItem("token", newToken);
    refetch(); // Refetch user data after login
  }, [refetch]);

  const logout = useCallback(async ({ skipActivityLog = false } = {}) => {
    const existingToken = localStorage.getItem("token");
    if (existingToken && !skipActivityLog) {
      try {
        await fetch(API_ROUTES.ACTIVITY_LOGS_LOGOUT, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${existingToken}`,
          },
        });
      } catch (_) {
        // Keep logout flow non-blocking
      }
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocketInstance(null);
    }
    setToken(null);
    localStorage.removeItem("token");
    localStorage.removeItem("userEmail"); // Clear user email on logout
    localStorage.removeItem("username");
    localStorage.removeItem("name");
    localStorage.removeItem("email");
    // Optionally, clear currentUser state here if needed
  }, []);

  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocketInstance(null);
      }
      return;
    }

    const socket = io(SOCKET_BASE_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;
    setSocketInstance(socket);

    const forceLogoutHandler = () => {
      logout({ skipActivityLog: true });
      window.location.href = "/login";
    };

    socket.on("session:force-logout", forceLogoutHandler);
    socket.on("connect_error", (socketError) => {
      if (socketError?.message === "Session expired") {
        forceLogoutHandler();
      }
    });

    return () => {
      socket.off("session:force-logout", forceLogoutHandler);
      socket.disconnect();
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
      setSocketInstance((prev) => (prev === socket ? null : prev));
    };
  }, [token, logout]);

  return (
    <AuthContext.Provider value={{ token, login, logout, currentUser, loading, error, refetch, socket: socketInstance }}>
      {children}
    </AuthContext.Provider>
  );
};

const PrivateRoute = () => {
  // This component will now render an Outlet
  const { token } = useAuth();
  return token ? <Outlet /> : <Navigate to="/login" />;
};

const PermissionRoute = ({ requiredPermission }) => {
  const { hasPermission, loading } = usePermission();
  const { loading: authLoading } = useAuth();

  if (loading || authLoading) {
    return <div className="w-full h-full flex items-center justify-center">Loading permissions...</div>;
  }

  const requiredPermissionsArray = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];

  if (hasPermission(requiredPermissionsArray)) {
    return <Outlet />;
  } else {
    return <Unauthorized />;
  }
};

// Layout component for authenticated users
const AuthenticatedLayout = () => {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar  */}
      <div className="h-screen overflow-y-auto hidden sm:hidden md:block">
        <Sidebar />
      </div>
      
      {/* Main Content*/}
      <div className="flex flex-col flex-1 h-screen overflow-hidden">
        <div className="h-25 w-full mx-auto px-2">
          <Navbar />
        </div>
        <div 
          className="rounded-t-2xl mx-2 flex-1 overflow-y-auto" 
          style={{ padding: "0px" }}
        >
          <Outlet />
        </div>
      </div>
    </div>
  );
};

function App() {
  useEffect(() => {
    const replaceDollarIcons = (root) => {
      if (!root || !root.querySelectorAll) return;
      root.querySelectorAll("svg.lucide-dollar-sign").forEach((svg) => {
        if (svg.dataset?.takaReplaced === "1") return;
        const span = document.createElement("span");
        span.textContent = "৳";
        span.className = `${svg.className?.baseVal || svg.getAttribute("class") || ""} currency-taka-icon`;
        const iconSize = Number(svg.getAttribute("width") || svg.getAttribute("height") || 16);
        span.style.display = "inline-flex";
        span.style.alignItems = "center";
        span.style.justifyContent = "center";
        span.style.width = `${iconSize}px`;
        span.style.height = `${iconSize}px`;
        span.style.fontSize = `${Math.max(12, iconSize - 1)}px`;
        span.style.fontWeight = "700";
        span.style.lineHeight = "1";
        svg.dataset.takaReplaced = "1";
        svg.replaceWith(span);
      });
    };

    const replaceDollarWithTaka = (root) => {
      if (!root) return;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const textNodes = [];
      while (walker.nextNode()) textNodes.push(walker.currentNode);
      textNodes.forEach((node) => {
        if (node.nodeValue && node.nodeValue.includes("$")) {
          node.nodeValue = node.nodeValue.replace(/\$/g, "৳");
        }
      });

      if (root.querySelectorAll) {
        root.querySelectorAll("[placeholder],[title],[aria-label]").forEach((el) => {
          ["placeholder", "title", "aria-label"].forEach((attr) => {
            const value = el.getAttribute(attr);
            if (value && value.includes("$")) {
              el.setAttribute(attr, value.replace(/\$/g, "৳"));
            }
          });
        });
      }

      replaceDollarIcons(root);
    };

    replaceDollarWithTaka(document.body);

    let rafId = null;
    const observer = new MutationObserver((mutations) => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        mutations.forEach((mutation) => {
          if (mutation.type === "childList") {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === 3 && node.nodeValue?.includes("$")) {
                node.nodeValue = node.nodeValue.replace(/\$/g, "৳");
              } else if (node.nodeType === 1) {
                replaceDollarWithTaka(node);
              }
            });
          } else if (mutation.type === "characterData" && mutation.target?.nodeValue?.includes("$")) {
            mutation.target.nodeValue = mutation.target.nodeValue.replace(/\$/g, "৳");
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, []);

  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Protected routes with layout */}
        <Route element={<PrivateRoute />}>
          <Route element={<AuthenticatedLayout />}>
            <Route element={<PermissionRoute requiredPermission="dashboard_read" />}>
              <Route path="/dashboard" element={<Dashboard />} />
            </Route>

            <Route element={<PermissionRoute requiredPermission="sales_create" />}>
              <Route path="/sale/pos" element={<POS />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission={['sales_create', 'sales_edit', 'sales_delete', 'sales_read', 'sales_change_status', 'sales_edit_today', 'sales_open_close', 'sales_add_payment' ]} />}>
              <Route path="/sale/all" element={<AllSales />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission={['sales_create', 'sales_edit', 'sales_delete', 'sales_read', 'sales_change_status', 'sales_edit_today', 'sales_open_close', 'sales_add_payment' ]} />}>
              <Route path="/sale/edit/:id" element={<EditSale />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="sales_open_close" />}>
              <Route path="/sale/edit-requests" element={<SaleEditRequests />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="sales_create" />}>
              <Route path="/sale/create" element={<CreateSale />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="sales_return_create" />}>
              <Route path="/sale/return" element={<SaleReturn />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission={[ 'sales_return_create', 'sales_return_edit', 'sales_return_delete', 'sales_return_read']} />}>
              <Route path="/sale/allreturns" element={<AllReturns />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission={['sales_warranty' ]} />}>
              <Route path="/sale/warranty" element={<WarrantyList />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission={['customer_read', 'customer_create', 'customer_edit', 'customer_delete']} />}>
              <Route path="/customers/all" element={<AllCustomers />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="customer_create" />}>
              <Route path="/customers/add" element={<AddCustomer />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission={["customer_edit"]} />}>
              <Route path="/customers/edit/:id" element={<AddCustomer />} />
            </Route>

            <Route element={<PermissionRoute requiredPermission="product_read" />}>
              <Route path="/products/all" element={<AllProducts />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="product_create" />}>
              <Route path="/products/create" element={<CreateProduct />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="product_update" />}>
              <Route path="/products/edit/:id" element={<EditProduct />} />
            </Route>

            <Route element={<PermissionRoute requiredPermission="material_read" />}>
              <Route path="/materials/all" element={<AllMaterials />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="material_create" />}>
              <Route path="/materials/add" element={<AddMaterial />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="material_edit" />}>
              <Route path="/materials/edit/:id" element={<EditMaterial />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="damage_read" />}>
              <Route path="/materials/scrape" element={<ScrapeMaterials />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="repairs_create" />}>
              <Route path="/materials/recover" element={<RecoverMaterials />} />
            </Route>


            <Route element={<PermissionRoute requiredPermission="production_read" />}>
              <Route path="/productions/all" element={<AllProductions />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="production_create" />}>
              <Route path="/productions/new" element={<NewProduction />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="production_edit" />}>
              <Route path="/productions/edit/:id" element={<EditProduction />} />
            </Route>

            <Route element={<PermissionRoute requiredPermission="purchases_read" />}>
              <Route path="/purchase/all" element={<AllPurchase />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="purchases_read" />}>
              <Route path="/purchase/returns" element={<AllPurchaseReturns />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="purchases_create" />}>
              <Route path="/purchase/new" element={<NewPurchase />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="purchases_edit" />}>
              <Route path="/purchase/edit/:id" element={<EditPurchase />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="purchases_create" />}>
              <Route path="/purchase/return" element={<PurchaseReturnPage mode="purchase_return" />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="damage_create" />}>
              <Route path="/purchase/damage-return" element={<PurchaseReturnPage mode="damage_return" />} />
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
            
            <Route element={<PermissionRoute requiredPermission="factory_read" />}>
              <Route path="/factoryinventory" element={<FactoryInventory />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="factory_edit" />}>
              <Route path="/factories/edit/:id" element={<EditFactory />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="store_read" />}>
              <Route path="/stores/all" element={<AllStore />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="store_read" />}>
              <Route path="/storeinventory" element={<StoreInventory />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="store_create" />}>
              <Route path="/stores/add" element={<AddStore />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="store_edit" />}>
              <Route path="/stores/edit/:id" element={<EditStore />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="store_read" />}>
              <Route path="/stores/details/:id" element={<StoreDetails />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="transfers_read" />}>
              <Route path="/stores/transfer/:id" element={<StoreToShopTransfer />}/>
            </Route>
            <Route element={<PermissionRoute requiredPermission="shop_create" />}>
              <Route path="/shop/add" element={<AddShop />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="shop_create" />}>
              <Route path="/shop/edit/:id" element={<EditShop />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="shop_read" />}>
              <Route path="/shop/all" element={<AllShop />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="shop_read" />}>
              <Route path="/shopinventory" element={<ShopInventory />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="sales_report" />}>
              <Route path="/report/sale" element={<SaleReport />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="purchases_report" />}>
              <Route path="/report/purchase" element={<PurchaseReport />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="production_report" />}>
              <Route path="/report/production" element={<ProductionReport />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="wastage_report" />}>
              <Route path="/report/wastage" element={<WastageReport />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="trial_balance_report" />}>
              <Route path="/report/trial-balance" element={<GenericReport title="Trial Balance" endpoint={API_ROUTES.REPORT_TRIAL_BALANCE} />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="cash_and_bank_report" />}>
              <Route path="/report/cash-bank" element={<CashBankReport />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="stock_report" />}>
              <Route path="/report/stock" element={<StockReport />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="stock_report" />}>
              <Route path="/report/daily-stock" element={<DailyStockReport />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="transfer_report" />}>
              <Route path="/report/transfer" element={<TransferReport />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="profit_loss_report" />}>
              <Route path="/report/profit-loss" element={<GenericReport title="Profit & Loss" endpoint={API_ROUTES.REPORT_PROFIT_LOSS} />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="purchase_sales_report" />}>
              <Route path="/report/purchase-sales" element={<PurchaseSalesReport />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="customer_report" />}>
              <Route path="/report/customer" element={<CustomerReport />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="supplier_report" />}>
              <Route path="/report/supplier" element={<SupplierReport />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="best_selling_product_report" />}>
              <Route path="/report/best-selling" element={<BestSellingReport />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="user_read" />}>
              <Route path="/users/all" element={<AllUser />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="user_create" />}>
              <Route path="/users/create" element={<CreateUser />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="general_settings_edit" />}>
              <Route path="/settings" element={<Settings />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="general_settings_edit" />}>
              <Route path="/settings/activity-log" element={<ActivityLog />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="unit_read" />}>
              <Route path="/settings/units" element={<Units />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="product_category_read" />}>
              <Route path="/settings/categories" element={<Categories />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="brand_read" />}>
              <Route path="/settings/brands" element={<Brands />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="general_settings_edit" />}>
              <Route path="/settings/printer" element={<PrinterSettings />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="general_settings_edit" />}>
              <Route path="/settings/print-label" element={<PrintLabel />} />
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
            <Route element={<PermissionRoute requiredPermission="cash_register_create" />}>
              <Route path="/cashregisterassign" element={<CashRegisterAssign />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="cash_register_read" />}>
              <Route path="/cashregister-list" element={<CashRegisterList />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="cash_register_read" />}>
              <Route path="/cash-register-records" element={<CashRegisterRecords />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="cash_register_create" />}>
              <Route path="/addcashregister" element={<AddCashRegister />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="bank_account_read" />}>
              <Route path="/bank-accounts" element={<BankAccounts />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="general_ledger_report" />}>
              <Route path="/accounts/general-ledger" element={<GeneralLedger />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="balance_sheet_report" />}>
              <Route path="/accounts/balance-sheet" element={<BalanceSheet />} />
            </Route>

            <Route element={<PermissionRoute requiredPermission="hrm_employee_manage" />}>
              <Route path="/hrm/employees" element={<Employees />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="clock_in_out_manage" />}>
              <Route path="/hrm/attendance" element={<Attendance />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="holiday_manage" />}>
              <Route path="/hrm/holidays" element={<Holidays />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="leave_category_manage" />}>
              <Route path="/hrm/leave-categories" element={<LeaveCategories />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="leave_read" />}>
              <Route path="/hrm/leave-requests" element={<LeaveRequests />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="payroll_manage" />}>
              <Route path="/hrm/payroll" element={<Payroll />} />
            </Route>

            <Route element={<PermissionRoute requiredPermission="expenses_read" />}>
              <Route path="/expense/categories" element={<ExpenseCategories />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="expenses_read" />}>
              <Route path="/expense/list" element={<Expenses />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="salary_read" />}>
              <Route path="/expense/salaries" element={<Salaries />} />
            </Route>

            <Route element={<PermissionRoute requiredPermission="user_associate_create" />}>
              <Route path="/assignuser" element={<AssignUser />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="user_associate_create" />}>
              <Route path="/assignedusers" element={<AllAssignedUsers />} />
            </Route>
            
            <Route element={<PermissionRoute requiredPermission="role_create" />}>
              <Route path="/managepermissions" element={<PermissionsManagement />} />
            </Route>

            
            <Route element={<PermissionRoute requiredPermission="damage_read" />}>
              <Route path="/damage-record" element={<DamageRecord />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="damage_create" />}>
              <Route path="/damage-record/new" element={<DamageRecord />} />
            </Route>
            <Route path="/scraprecord" element={<Navigate to="/damage-record" replace />} />
            <Route path="/addscraprecord" element={<Navigate to="/damage-record" replace />} />
            <Route path="/materialscraprecord" element={<Navigate to="/damage-record" replace />} />
            <Route path="/addmaterialscraprecord" element={<Navigate to="/damage-record" replace />} />

            <Route element={<PermissionRoute requiredPermission="repairs_read" />}>
              <Route path="/repair/items" element={<RepairedItems />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="repairs_create" />}>
              <Route path="/repair/new" element={<RepairCreate />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="repairs_read" />}>
              <Route path="/productrepair" element={<ProductRepair />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="repairs_create" />}>
              <Route path="/addrepairproduct" element={<AddRepairProduct />} />
            </Route>

            <Route element={<PermissionRoute requiredPermission="repairs_read" />}>
              <Route path="/materialrepair" element={<MaterialRepair />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="repairs_create" />}>
              <Route path="/addrepairmaterial" element={<AddRepairMaterial />} />
            </Route>

            <Route element={<PermissionRoute requiredPermission="transfers_read" />}>
              <Route path="/transfers" element={<TransferList title="All Transfers" />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="transfers_create" />}>
              <Route path="/transfer/add" element={<AddTransfer />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="transfers_edit" />}>
              <Route path="/transfer/edit/:id" element={<AddTransfer />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="transfers_receive" />}>
              <Route path="/transfers/:id/receive" element={<TransferReceive />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="transfers_read" />}>
              <Route path="/transfers/:id/receipts" element={<TransferReceiveHistory />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="requisition_create" />}>
              <Route path="/requisition/create" element={<NewRequisition />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="requisition_update" />}>
              <Route path="/requisition/edit/:id" element={<NewRequisition />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="requisition_read" />}>
              <Route path="/requisition/list" element={<RequisitionList />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="requisition_read" />}>
              <Route path="/requisition/view/:id" element={<RequisitionView />} />
            </Route>
            <Route element={<PermissionRoute requiredPermission="notification_read" />}>
              <Route path="/notifications" element={<Notifications />} />
            </Route>
            <Route path="/profile" element={<UserProfile />} />
            <Route path="/userprofile" element={<Navigate to="/profile" replace />} />
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
