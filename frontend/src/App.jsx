import React, { useState, createContext, useContext, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom'; // Import Outlet
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Sidebar from './components/Sidebar';

// Import all new page components
import AllProducts from './components/Products/AllProducts';
import CreateProduct from './components/Products/CreateProduct';
import EditProduct from './components/Products/EditProduct';
import POS from './components/Sale/POS';
import AllSales from './components/Sale/AllSales';
import CreateSale from './components/Sale/CreateSale';
import SaleReturn from './components/Sale/SaleReturn';
import AllMaterials from './components/Materials/AllMaterials';
import AddMaterial from './components/Materials/AddMaterial';
import ScrapeMaterials from './components/Materials/ScrapeMaterials';
import RecoverMaterials from './components/Materials/RecoverMaterials';
import EditMaterial from './components/Materials/EditMaterial';
import AllProductions from './components/Productions/AllProductions';
import NewProduction from './components/Productions/NewProduction';
import EditProduction from './components/Productions/EditProduction';
import AllPurchase from './components/Purchase/AllPurchase';
import NewPurchase from './components/Purchase/NewPurchase';
import AllSupplier from './components/Purchase/AllSupplier';
import AddSupplier from './components/Purchase/AddSupplier';
import AllFactory from './components/Factory/AllFactory';
import AddFactory from './components/Factory/AddFactory';
import EditFactory from './components/Factory/EditFactory';
import AllStore from './components/Stores/AllStore';
import AddStore from './components/Stores/AddStore';
import EditStore from './components/Stores/EditStore'; 
import SaleReport from './components/Report/SaleReport';
import PurchaseReport from './components/Report/PurchaseReport';
import ProductionReport from './components/Report/ProductionReport';
import WastageReport from './components/Report/WastageReport';
import ScrapeReport from './components/Report/ScrapeReport';
import AllUser from './components/Users/AllUser';
import CreateUser from './components/Users/CreateUser';
import Settings from './components/Settings/Settings';
import AddShop from './components/Shop/AddShop';
import AllShop from './components/Shop/AllShop';
import AllReturns from './components/Sale/AllReturns';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token'));

  const login = (newToken) => {
    setToken(newToken);
    localStorage.setItem('token', newToken);
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

const PrivateRoute = () => { // This component will now render an Outlet
  const { token } = useAuth();
  return token ? <Outlet /> : <Navigate to="/login" />;
};

// Layout component for authenticated users
const AuthenticatedLayout = () => {
  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <div style={{ flexGrow: 1, padding: '20px' }}>
        <Outlet /> {/* This is where nested routes will render */}
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
            <Route path="/products/all" element={<AllProducts />} />
            <Route path="/products/create" element={<CreateProduct />} />
            <Route path="/products/edit/:id" element={<EditProduct />} />
            <Route path="/sale/pos" element={<POS />} />
            <Route path="/sale/all" element={<AllSales />} />
            <Route path="/sale/create" element={<CreateSale />} />
            <Route path="/sale/return" element={<SaleReturn />} />
            <Route path="/sale/allreturns" element={<AllReturns />} />
            <Route path="/materials/all" element={<AllMaterials />} />
            <Route path="/materials/add" element={<AddMaterial />} />
            <Route path="/materials/edit/:id" element={<EditMaterial />} />
            <Route path="/materials/scrape" element={<ScrapeMaterials />} />
            <Route path="/materials/recover" element={<RecoverMaterials />} />
            <Route path="/productions/all" element={<AllProductions />} />
            <Route path="/productions/new" element={<NewProduction />} />
            <Route path="/productions/edit/:id" element={<EditProduction />} />
            <Route path="/purchase/all" element={<AllPurchase />} />
            <Route path="/purchase/new" element={<NewPurchase />} />
            <Route path="/purchase/all-supplier" element={<AllSupplier />} />
            <Route path="/purchase/add-supplier" element={<AddSupplier />} />
            <Route path="/factories/all" element={<AllFactory />} />
            <Route path="/factories/add" element={<AddFactory />} />
            <Route path="/factories/edit/:id" element={<EditFactory />} />
            <Route path="/stores/all" element={<AllStore />} />
            <Route path="/stores/add" element={<AddStore />} />
            <Route path="/stores/edit/:id" element={<EditStore />} />
            
            <Route path="/shop/add" element={<AddShop />} />
            <Route path="/shop/all" element={<AllShop />} />
            <Route path="/report/sale" element={<SaleReport />} />
            <Route path="/report/purchase" element={<PurchaseReport />} />
            <Route path="/report/production" element={<ProductionReport />} />
            <Route path="/report/wastage" element={<WastageReport />} />
            <Route path="/report/scrape" element={<ScrapeReport />} />
            <Route path="/users/all" element={<AllUser />} />
            <Route path="/users/create" element={<CreateUser />} />
            <Route path="/settings" element={<Settings />} />
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