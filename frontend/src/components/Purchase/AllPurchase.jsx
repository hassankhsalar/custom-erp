import { useEffect, useMemo, useRef, useState } from "react";
import { 
  ArrowUpDown, Package, Truck, Building2, Calendar, 
  Store, ShoppingBag, Factory, MoreVertical, 
  Eye, CreditCard, DollarSign, Trash2, CheckCircle, XCircle,
  AlertCircle, Loader2, TrendingDown, FileText, MapPin,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Filter, Settings, User, Clock, Shield, Edit,
  X
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { API_ROUTES } from "../../config";
import SearchableSelect from '../common/SearchableSelect';
import { usePermission } from "../../hooks/usePermission";

export default function AllPurchase() {
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [loadMode, setLoadMode] = useState("filter");
  const [overview, setOverview] = useState({ totalCount: 0, totalAmount: 0, totalPaid: 0, totalDue: 0, byShippingStatus: {} });
  const [suppliers, setSuppliers] = useState([]);
  const [locationOptions, setLocationOptions] = useState({ store: [], shop: [], factory: [] });
  const [filters, setFilters] = useState({
    search: "",
    supplierId: "",
    destinationType: "",
    destinationId: "",
    shippingStatus: "",
    dateFrom: "",
    dateTo: "",
  });
  const [appliedFilters, setAppliedFilters] = useState({
    search: "",
    supplierId: "",
    destinationType: "",
    destinationId: "",
    shippingStatus: "",
    dateFrom: "",
    dateTo: "",
  });
  const initializedRef = useRef(false);
  const skipNextPageFetchRef = useRef(false);

  // Permissions
  const { hasPermission } = usePermission();
  const canEditPurchase = hasPermission(['purchases_edit']);
  const canDeletePurchase = hasPermission(['purchases_delete']);
  const canAddPurchasePayment = hasPermission(['purchase_add_payment']);
  const canAddPurchaseShipment = hasPermission(['purchase_add_shipment']);
  
  // Modal states
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [addPaymentModalOpen, setAddPaymentModalOpen] = useState(false);
  const [viewPaymentModalOpen, setViewPaymentModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [addShipmentModalOpen, setAddShipmentModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnMode, setReturnMode] = useState("purchase_return");
  const [shipments, setShipments] = useState([]);
  const [shipmentItems, setShipmentItems] = useState([]);
  const [shipmentNote, setShipmentNote] = useState("");
  const [shipmentLoading, setShipmentLoading] = useState(false);
  const [activeViewTab, setActiveViewTab] = useState("items");
  
  // Form states
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentNote, setPaymentNote] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [editItems, setEditItems] = useState([]);
  const [editShippingCost, setEditShippingCost] = useState(0);
  const [editDiscount, setEditDiscount] = useState(0);
  const [editTax, setEditTax] = useState(0);
  const [editAdditionalPayment, setEditAdditionalPayment] = useState(0);
  const [editPaymentMethod, setEditPaymentMethod] = useState("cash");
  const [editSaving, setEditSaving] = useState(false);
  const [returnItems, setReturnItems] = useState([]);
  const [returnCompensationType, setReturnCompensationType] = useState("money");
  const [returnCompensationAmount, setReturnCompensationAmount] = useState("");
  const [returnCompDestType, setReturnCompDestType] = useState("store");
  const [returnCompDestId, setReturnCompDestId] = useState("");
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const token = localStorage.getItem('token');

  const activeDestinationOptions = useMemo(
    () => (filters.destinationType ? (locationOptions[filters.destinationType] || []) : []),
    [filters.destinationType, locationOptions]
  );

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const [supplierRes, storesRes, shopsRes, factoriesRes] = await Promise.all([
          fetch(API_ROUTES.SUPPLIERS, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(API_ROUTES.STORES, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(API_ROUTES.SHOPS, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(API_ROUTES.FACTORIES, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        const [supplierData, storesData, shopsData, factoriesData] = await Promise.all([
          supplierRes.json().catch(() => []),
          storesRes.json().catch(() => []),
          shopsRes.json().catch(() => []),
          factoriesRes.json().catch(() => []),
        ]);
        setSuppliers(Array.isArray(supplierData) ? supplierData : []);
        setLocationOptions({
          store: Array.isArray(storesData) ? storesData : [],
          shop: Array.isArray(shopsData) ? shopsData : [],
          factory: Array.isArray(factoriesData) ? factoriesData : [],
        });
      } catch {
        setSuppliers([]);
        setLocationOptions({ store: [], shop: [], factory: [] });
      }
    };
    fetchFilterOptions();
  }, [token]);

  const getSortQuery = () => {
    if (!sortConfig?.key) return { sortBy: "createdAt", sortDirection: "desc" };
    const map = {
      reference: "reference",
      "grand total": "grandTotal",
      date: "createdAt",
      "shipping status": "shippingStatus",
    };
    return {
      sortBy: map[sortConfig.key] || "createdAt",
      sortDirection: sortConfig.direction === "ascending" ? "asc" : "desc",
    };
  };

  const fetchPurchases = async (mode = "table", pageArg = currentPage, limitArg = itemsPerPage) => {
    setLoading(true);
    setLoadMode(mode);
    try {
      const sort = getSortQuery();
      const params = new URLSearchParams({
        page: String(pageArg),
        limit: String(limitArg),
        sortBy: sort.sortBy,
        sortDirection: sort.sortDirection,
      });
      if (appliedFilters.search.trim()) params.set("search", appliedFilters.search.trim());
      if (appliedFilters.supplierId) params.set("supplierId", appliedFilters.supplierId);
      if (appliedFilters.destinationType) params.set("destinationType", appliedFilters.destinationType);
      if (appliedFilters.destinationId) params.set("destinationId", appliedFilters.destinationId);
      if (appliedFilters.shippingStatus) params.set("shippingStatus", appliedFilters.shippingStatus);
      if (appliedFilters.dateFrom) params.set("dateFrom", appliedFilters.dateFrom);
      if (appliedFilters.dateTo) params.set("dateTo", appliedFilters.dateTo);

      const res = await fetch(`${API_ROUTES.PURCHASES}?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Failed to fetch purchases");
      const data = await res.json();
      
      // Handle paginated response
      if (data && data.data && data.pagination) {
        setPurchases(data.data);
        setTotalCount(data.pagination.totalCount);
        // Adjust current page if it exceeds total pages
        if (data.pagination.totalPages > 0 && currentPage > data.pagination.totalPages) {
          setCurrentPage(data.pagination.totalPages);
        }
      } else if (Array.isArray(data)) {
        // Fallback for non-paginated response
        setPurchases(data);
        setTotalCount(data.length);
      } else {
        setPurchases([]);
        setTotalCount(0);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchOverview = async () => {
    try {
      const params = new URLSearchParams();
      if (appliedFilters.search.trim()) params.set("search", appliedFilters.search.trim());
      if (appliedFilters.supplierId) params.set("supplierId", appliedFilters.supplierId);
      if (appliedFilters.destinationType) params.set("destinationType", appliedFilters.destinationType);
      if (appliedFilters.destinationId) params.set("destinationId", appliedFilters.destinationId);
      if (appliedFilters.shippingStatus) params.set("shippingStatus", appliedFilters.shippingStatus);
      if (appliedFilters.dateFrom) params.set("dateFrom", appliedFilters.dateFrom);
      if (appliedFilters.dateTo) params.set("dateTo", appliedFilters.dateTo);
      const res = await fetch(`${API_ROUTES.PURCHASES_OVERVIEW}${params.toString() ? `?${params.toString()}` : ""}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to fetch purchase overview");
      setOverview({
        totalCount: Number(data?.totalCount || 0),
        totalAmount: Number(data?.totalAmount || 0),
        totalPaid: Number(data?.totalPaid || 0),
        totalDue: Number(data?.totalDue || 0),
        byShippingStatus: data?.byShippingStatus || {},
      });
    } catch {
      setOverview({ totalCount: 0, totalAmount: 0, totalPaid: 0, totalDue: 0, byShippingStatus: {} });
    }
  };

  useEffect(() => {
    initializedRef.current = true;
    skipNextPageFetchRef.current = currentPage !== 1;
    setCurrentPage(1);
    fetchPurchases("filter", 1, itemsPerPage);
    fetchOverview();
  }, [appliedFilters, sortConfig]);

  useEffect(() => {
    if (!initializedRef.current) return;
    if (skipNextPageFetchRef.current) {
      skipNextPageFetchRef.current = false;
      return;
    }
    fetchPurchases("table", currentPage, itemsPerPage);
  }, [currentPage, itemsPerPage]);

  const fetchAccounts = async () => {
    try {
      const res = await fetch(`${API_ROUTES.ACCOUNTS}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Failed to fetch accounts");
      const data = await res.json();
      setAccounts(data);
    } catch (err) {
      console.error("Error fetching accounts:", err);
    }
  };

  const fetchPaymentHistory = async (purchaseId) => {
    try {
      const res = await fetch(`${API_ROUTES.PURCHASES}/${purchaseId}/payments`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Failed to fetch payment history");
      const data = await res.json();
      setPaymentHistory(data.payments || []);
    } catch (err) {
      console.error("Error fetching payment history:", err);
    }
  };

  const fetchShipments = async (purchaseId) => {
    try {
      const res = await fetch(`${API_ROUTES.PURCHASES}/${purchaseId}/shipments`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Failed to fetch shipments");
      const data = await res.json();
      const shipmentList = data.shipments || [];
      setShipments(shipmentList);
      return shipmentList;
    } catch (err) {
      console.error("Error fetching shipments:", err);
      setShipments([]);
      return [];
    }
  };

  const handleDropdownToggle = (purchaseId) => {
    setActiveDropdown(activeDropdown === purchaseId ? null : purchaseId);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.dropdown-container')) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Action handlers
  const handleView = (purchase) => {
    setSelectedPurchase(purchase);
    setActiveViewTab("items");
    setViewModalOpen(true);
    fetchPaymentHistory(purchase.id);
    fetchShipments(purchase.id);
    setActiveDropdown(null);
  };

  const handleAddPayment = (purchase) => {
    setSelectedPurchase(purchase);
    setPaymentAmount("");
    setPaymentMethod("cash");
    setPaymentNote("");
    setSelectedAccount(accounts[0]?.id || "");
    setAddPaymentModalOpen(true);
    setActiveDropdown(null);
  };

  const handleViewPayment = async (purchase) => {
    setSelectedPurchase(purchase);
    await fetchPaymentHistory(purchase.id);
    setViewPaymentModalOpen(true);
    setActiveDropdown(null);
  };

  const buildShipmentItems = (purchase, shipmentList) => {
    const receivedByItemId = {};
    shipmentList.forEach((shipment) => {
      shipment.items?.forEach((si) => {
        if (!si.purchaseItemId) return;
        receivedByItemId[si.purchaseItemId] = (receivedByItemId[si.purchaseItemId] || 0) + (parseFloat(si.received_quantity) || 0);
      });
    });

    return (purchase.purchaseItems || []).map((item) => {
      const receivedSoFar = receivedByItemId[item.id] || 0;
      const remaining = Math.max(0, (parseFloat(item.quantity) || 0) - receivedSoFar);
      const itemName = item.itemType === 'material' ? item.material?.name : item.product?.name;
      return {
        purchaseItemId: item.id,
        itemType: item.itemType,
        name: itemName || "-",
        orderedQuantity: parseFloat(item.quantity) || 0,
        receivedSoFar,
        remaining,
        receivedQuantity: remaining > 0 ? remaining : 0
      };
    });
  };

  const handleAddShipment = async (purchase) => {
    setSelectedPurchase(purchase);
    setShipmentNote("");
    const shipmentList = await fetchShipments(purchase.id);
    const itemsForShipment = buildShipmentItems(purchase, shipmentList).filter(i => i.remaining > 0);
    setShipmentItems(itemsForShipment);
    setAddShipmentModalOpen(true);
    setActiveDropdown(null);
  };

  const handleDelete = (purchase) => {
    setSelectedPurchase(purchase);
    setDeleteModalOpen(true);
    setActiveDropdown(null);
  };

  const handleEditPurchase = (purchase) => {
    navigate(`/purchase/edit/${purchase.id}`);
    setActiveDropdown(null);
  };

  const handleOpenReturn = (purchase, mode = "purchase_return") => {
    setSelectedPurchase(purchase);
    setReturnMode(mode);
    setReturnItems((purchase.purchaseItems || []).map((item) => ({
      purchaseItemId: item.id,
      itemType: item.itemType,
      productId: item.productId,
      materialId: item.materialId,
      name: item.itemType === "product" ? item.product?.name : item.material?.name,
      unitPrice: Number(item.unitPrice || 0),
      quantity: 0,
      isDamaged: mode === "damage_return",
    })));
    setReturnCompensationType("money");
    setReturnCompensationAmount("");
    setReturnCompDestType(purchase.destination?.type || "store");
    setReturnCompDestId(String(purchase.destination?.id || ""));
    setReturnModalOpen(true);
    setActiveDropdown(null);
  };

  // Calculate due amount
  const calculateDueAmount = (purchase) => {
    const grandTotal = parseFloat(purchase.grandTotal) || 0;
    const paidAmount = parseFloat(purchase.paidAmount) || 0;
    return Math.max(0, grandTotal - paidAmount);
  };

  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  // Sorting logic (applied to current page data only)
  const sortedPurchases = sortConfig.key ? [...purchases].sort((a, b) => {
    const direction = sortConfig.direction === 'ascending' ? 1 : -1;

    if (sortConfig.key === 'grand total') {
      return ((a.grandTotal || 0) - (b.grandTotal || 0)) * direction;
    }
    if (sortConfig.key === 'due amount') {
      return (calculateDueAmount(a) - calculateDueAmount(b)) * direction;
    }
    if (sortConfig.key === 'date') {
      return (new Date(a.createdAt) - new Date(b.createdAt)) * direction;
    }
    if (sortConfig.key === 'status') {
      const aStatus = calculateDueAmount(a) <= 0 ? 'paid' : 'pending';
      const bStatus = calculateDueAmount(b) <= 0 ? 'paid' : 'pending';
      return aStatus.localeCompare(bStatus) * direction;
    }
    if (sortConfig.key === 'supplier') {
      return (a.supplier?.name || '').localeCompare(b.supplier?.name || '') * direction;
    }
    if (sortConfig.key === 'reference') {
      return (a.reference || '').localeCompare(b.reference || '') * direction;
    }
    if (sortConfig.key === 'destination') {
      const aDest = a.destination ? `${a.destination.type}: ${a.destination.name}` : '';
      const bDest = b.destination ? `${b.destination.type}: ${b.destination.name}` : '';
      return aDest.localeCompare(bDest) * direction;
    }
    return 0;
  }) : purchases;

  // Pagination calculations
  const currentItems = sortedPurchases;
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const indexOfFirstItem = totalCount === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const indexOfLastItem = Math.min(currentPage * itemsPerPage, totalCount);

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Handle payment submission
  const handlePaymentSubmit = async () => {
    if (!selectedPurchase || !paymentAmount || !selectedAccount) {
      alert("Please fill in all required fields");
      return;
    }

    const amount = parseFloat(paymentAmount);
    const dueAmount = calculateDueAmount(selectedPurchase);

    if (amount <= 0) {
      alert("Payment amount must be greater than 0");
      return;
    }

    if ( (amount.toFixed(2) - dueAmount.toFixed(2)) > 0.001) {
      alert(`Payment amount ($${amount.toFixed(2)}) exceeds due amount ($${dueAmount.toFixed(2)})`);
      return;
    }

    setPaymentLoading(true);

    try {
      const response = await fetch(`${API_ROUTES.PURCHASES}/${selectedPurchase.id}/payments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount,
          payment_method: paymentMethod,
          accountId: selectedAccount,
          note: paymentNote,
          purpose: 'Purchase Payment'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to record payment');
      }

      const result = await response.json();
      
      await fetchPurchases();
      
      setAddPaymentModalOpen(false);
      setPaymentAmount("");
      setPaymentNote("");
      setSelectedAccount("");
      
      alert(result.message || "Payment recorded successfully!");
      
    } catch (error) {
      console.error('Error recording payment:', error);
      alert(error.message || 'Failed to record payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleShipmentSubmit = async () => {
    if (!selectedPurchase) return;
    const itemsToSend = shipmentItems
      .filter(i => parseFloat(i.receivedQuantity) > 0)
      .map(i => ({
        purchaseItemId: i.purchaseItemId,
        receivedQuantity: parseFloat(i.receivedQuantity)
      }));

    if (itemsToSend.length === 0) {
      alert("Please enter received quantities for shipment.");
      return;
    }

    setShipmentLoading(true);
    try {
      const response = await fetch(`${API_ROUTES.PURCHASES}/${selectedPurchase.id}/shipments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: itemsToSend,
          note: shipmentNote
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add shipment');
      }

      await fetchPurchases();
      await fetchShipments(selectedPurchase.id);
      setAddShipmentModalOpen(false);
      setShipmentItems([]);
      setShipmentNote("");
    } catch (error) {
      console.error('Error adding shipment:', error);
      alert(error.message || 'Failed to add shipment');
    } finally {
      setShipmentLoading(false);
    }
  };

  const handleEditSubmit = async () => {
    if (!selectedPurchase) return;
    const payloadItems = editItems
      .filter((i) => Number(i.quantity) > 0)
      .map((i) => ({
        itemType: i.itemType,
        productId: i.itemType === "product" ? i.productId : null,
        materialId: i.itemType === "material" ? i.materialId : null,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        receivedQuantity: Number(i.receivedQuantity ?? i.quantity),
        batchNumber: i.batchNumber || null,
        expiryDate: i.expiryDate || null,
      }));

    if (!payloadItems.length) {
      alert("At least one item is required");
      return;
    }

    setEditSaving(true);
    try {
      const res = await fetch(API_ROUTES.PURCHASE_BY_ID(selectedPurchase.id), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shippingCost: Number(editShippingCost || 0),
          discount: Number(editDiscount || 0),
          tax: Number(editTax || 0),
          additionalPayment: Number(editAdditionalPayment || 0),
          paymentMethod: editPaymentMethod,
          items: payloadItems,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to edit purchase");
      await fetchPurchases();
      setEditModalOpen(false);
      alert(data.message || "Purchase updated successfully");
    } catch (err) {
      alert(err.message || "Failed to edit purchase");
    } finally {
      setEditSaving(false);
    }
  };

  const handleReturnSubmit = async () => {
    if (!selectedPurchase) return;
    const items = returnItems
      .filter((i) => Number(i.quantity) > 0)
      .map((i) => ({
        purchaseItemId: i.purchaseItemId,
        itemType: i.itemType,
        productId: i.productId || null,
        materialId: i.materialId || null,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        isDamaged: returnMode === "damage_return" ? true : !!i.isDamaged,
      }));
    if (!items.length) {
      alert("Select at least one return item quantity");
      return;
    }

    setReturnSubmitting(true);
    try {
      const isDamage = returnMode === "damage_return";
      const url = isDamage
        ? API_ROUTES.PURCHASE_DAMAGE_RETURNS(selectedPurchase.id)
        : API_ROUTES.PURCHASE_RETURNS(selectedPurchase.id);
      const payload = {
        items,
        compensationType: returnCompensationType,
      };
      if (returnCompensationType === "money") {
        payload.compensationAmount = Number(returnCompensationAmount || 0);
        payload.payment_method = "cash";
      } else {
        payload.compensationShipments = [
          {
            destinationType: returnCompDestType,
            destinationId: Number(returnCompDestId),
            items: items.map((i) => ({
              itemType: i.itemType,
              productId: i.productId || null,
              materialId: i.materialId || null,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
            })),
          },
        ];
      }
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create return");
      await fetchPurchases();
      setReturnModalOpen(false);
      alert(data.message || "Return created successfully");
    } catch (err) {
      alert(err.message || "Failed to create return");
    } finally {
      setReturnSubmitting(false);
    }
  };

  // Handle purchase deletion
  const handleDeleteSubmit = async () => {
    if (!selectedPurchase) return;

    setDeleteLoading(true);

    try {
      const response = await fetch(`${API_ROUTES.PURCHASES}/${selectedPurchase.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete purchase');
      }

      const result = await response.json();
      
      await fetchPurchases();
      
      setDeleteModalOpen(false);
      
      alert(result.message || "Purchase deleted successfully!");
      
    } catch (error) {
      console.error('Error deleting purchase:', error);
      alert(error.message || 'Failed to delete purchase');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleApplyFilters = () => {
    setAppliedFilters({ ...filters });
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    const empty = {
      search: "",
      supplierId: "",
      destinationType: "",
      destinationId: "",
      shippingStatus: "",
      dateFrom: "",
      dateTo: "",
    };
    setFilters(empty);
    setAppliedFilters(empty);
    setCurrentPage(1);
  };

  // Calculate statistics
  const totalDueAmount = overview.totalDue;
  const totalPaidAmount = overview.totalPaid;
  const totalGrandTotal = overview.totalAmount;
  const pendingShipments = Number(overview.byShippingStatus?.pending || 0) + Number(overview.byShippingStatus?.partial || 0);

  if (loading && loadMode === "filter") {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-gray-600">Loading purchases...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-8 text-center max-w-md">
          <div className="p-4 bg-red-100 rounded-full inline-block mb-4">
            <AlertCircle size={48} className="text-red-500" />
          </div>
          <p className="text-red-500 text-lg font-medium mb-4">Error: {error}</p>
          <button
            onClick={() => fetchPurchases("table", currentPage, itemsPerPage)}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:shadow-lg transition-all duration-300"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen rounded-t-2xl w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-300/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-300/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full mx-auto">
        {/* Header Card */}
        <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl shadow-blue-100/50 mb-6 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
                <Package className="text-white" size={36} />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Purchase Orders
                </h1>
                <p className="text-gray-600 mt-2">Manage all purchase orders, payments, and shipments</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 px-4 py-2 bg-white/50 backdrop-blur-sm rounded-xl border border-white/60">
              <Filter size={18} className="text-purple-600" />
              <span className="text-sm font-medium text-gray-700">
                {overview.totalCount} {overview.totalCount === 1 ? 'Purchase' : 'Purchases'}
              </span>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="backdrop-blur-lg bg-gradient-to-br from-blue-50/60 to-cyan-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold text-blue-600">${totalGrandTotal.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <DollarSign size={24} className="text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="backdrop-blur-lg bg-gradient-to-br from-emerald-50/60 to-green-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Paid</p>
                <p className="text-2xl font-bold text-emerald-600">${totalPaidAmount.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-xl">
                <CheckCircle size={24} className="text-emerald-600" />
              </div>
            </div>
          </div>
          
          <div className="backdrop-blur-lg bg-gradient-to-br from-amber-50/60 to-orange-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Due</p>
                <p className="text-2xl font-bold text-amber-600">${totalDueAmount.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-xl">
                <TrendingDown size={24} className="text-amber-600" />
              </div>
            </div>
          </div>

          <div className="backdrop-blur-lg bg-gradient-to-br from-purple-50/60 to-pink-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Shipments</p>
                <p className="text-2xl font-bold text-purple-600">{pendingShipments}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                <Truck size={24} className="text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6 mb-6">
          <div className="mb-6 grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="w-full md:col-span-2"> 
              <label htmlFor="search" className="text-sm text-gray-600">Search</label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                placeholder="Search by ref or supplier..."
                className="w-full px-3 py-3 bg-white/80 backdrop-blur-sm border border-white/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
            <div>
              <label htmlFor="supplier" className="text-sm text-gray-600">Supplier</label>
              <SearchableSelect
                name="supplier"
                value={filters.supplierId}
                onChange={(e) => setFilters((prev) => ({ ...prev, supplierId: e.target.value }))}
                options={suppliers.map((s) => ({
                  value: s.id,
                  label: `${s.name} (${s.mobile || 'N/A'})`
                }))}
                placeholder="Search supplier..."
                className=""
              />
            </div>
            <div>
              <label htmlFor="destinationType" className="text-sm text-gray-600">Destination Type</label>
              <select
                value={filters.destinationType}
                onChange={(e) => setFilters((prev) => ({ ...prev, destinationType: e.target.value, destinationId: "" }))}
                className="w-full px-3 py-3 bg-white/80 backdrop-blur-sm border border-white/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <option value="">All Destination Types</option>
                <option value="store">Store</option>
                <option value="shop">Shop</option>
                <option value="factory">Factory</option>
              </select>
            </div>
            <div>
              <label htmlFor="destination" className="text-sm text-gray-600">Destination</label>
              <select
                value={filters.destinationId}
                onChange={(e) => setFilters((prev) => ({ ...prev, destinationId: e.target.value }))}
                disabled={!filters.destinationType}
                className="w-full px-3 py-3 bg-white/80 backdrop-blur-sm border border-white/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-60"
              >
                <option value="">{filters.destinationType ? "All Destinations" : "Select destination type first"}</option>
                {activeDestinationOptions.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="shippingStatus" className="text-sm text-gray-600">Shipping Status</label>
              <select
                value={filters.shippingStatus}
                onChange={(e) => setFilters((prev) => ({ ...prev, shippingStatus: e.target.value }))}
                className="w-full px-3 py-3 bg-white/80 backdrop-blur-sm border border-white/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <option value="">All Shipping Status</option>
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
                <option value="received">Received</option>
              </select>
            </div>
            <div>
              <label htmlFor="dateFrom" className="text-sm text-gray-600">Date From</label>
              <input
                type="datetime-local"
                value={filters.dateFrom}
                onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
                className="w-full px-3 py-3 bg-white/80 backdrop-blur-sm border border-white/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
            <div>
              <label htmlFor="dateTo" className="text-sm text-gray-600">Date To</label>
              <input
                type="datetime-local"
                value={filters.dateTo}
                onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
                className="w-full px-3 py-3 bg-white/80 backdrop-blur-sm border border-white/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
            <div className="md:col-span-5 flex justify-end gap-2">
              <button
                onClick={handleApplyFilters}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 transition-all duration-300"
              >
                Apply
              </button>
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 col-span-5 flex justify-end rounded-xl bg-white/80 border border-white/60 text-gray-700 hover:bg-white transition-all duration-300"
              >
                Clear
              </button>
            </div>
          </div>

          {loading && loadMode === "table" && (
            <div className="mb-4 flex items-center justify-center py-4">
              <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
          )}

          {purchases.length === 0 ? (
            <div className="text-center py-12">
              <div className="p-4 bg-white/50 rounded-xl inline-block mb-4">
                <Package size={48} className="text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Purchases Found</h3>
              <p className="text-gray-600 mb-6">There are no purchase orders in the system yet.</p>
              <button className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300">
                <Settings size={20} />
                Create First Purchase
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border border-white/60">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100/80">
                    <tr>
                      {[
                        { key: 'reference', label: 'Reference', icon: <FileText size={14} /> },
                        { key: 'supplier', label: 'Supplier', icon: <Building2 size={14} /> },
                        { key: 'grand total', label: 'Total', icon: <DollarSign size={14} /> },
                        { key: 'due amount', label: 'Due', icon: <AlertCircle size={14} /> },
                        { key: 'date', label: 'Date', icon: <Calendar size={14} /> },
                        { key: 'destination', label: 'Destination', icon: <MapPin size={14} /> },
                        { key: 'shipping status', label: 'Status', icon: <Truck size={14} /> },
                        { key: 'actions', label: 'Actions', icon: null }
                      ].map(({ key, label, icon }) => (
                        <th
                          key={key}
                          className="p-4 text-left font-medium text-gray-700"
                        >
                          <div className="flex items-center gap-2">
                            {icon && <span className="text-gray-500">{icon}</span>}
                            <span>{label}</span>
                            {key !== 'actions' && (
                              <ArrowUpDown
                                onClick={() => handleSort(key)}
                                className="ml-1 p-1 hover:bg-gray-200 rounded-md cursor-pointer text-gray-500 hover:text-gray-700 transition-colors"
                                size={18}
                              />
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {currentItems.map((purchase, index) => {
                      const dueAmount = calculateDueAmount(purchase);
                      const isPaid = dueAmount.toFixed(2) <= 0.00;
                      
                      return (
                        <tr
                          key={purchase.id}
                          className={`border-t border-white/50 hover:bg-white/30 transition-colors duration-200 ${
                            index % 2 === 0 ? 'bg-white/10' : ''
                          }`}
                        >
                          <td className="p-4">
                            <div>
                              <span className="font-medium text-blue-600">{purchase.reference}</span>
                              <div className="text-xs text-gray-500 mt-1">ID: #{purchase.id}</div>
                            </div>
                          </td>
                          
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div>
                                <span className="font-medium text-gray-800">{purchase.supplier?.name || '-'}</span>
                              </div>
                            </div>
                          </td>
                          
                          <td className="p-4">
                            <span className="font-bold text-green-600">${purchase.grandTotal?.toFixed(2) || "0.00"}</span>
                          </td>
                          
                          <td className="p-4">
                            {isPaid ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                <CheckCircle size={12} />
                                Paid
                              </span>
                            ) : (
                              <span className="font-bold text-amber-600">${dueAmount.toFixed(2)}</span>
                            )}
                          </td>
                          
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Calendar size={14} className="text-gray-400" />
                              <span className="text-gray-700">{new Date(purchase.createdAt).toLocaleDateString()}</span>
                            </div>
                          </td>
                          
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              {purchase.destination?.type === 'store' ? (
                                <Store size={14} className="text-blue-500" />
                              ) : purchase.destination?.type === 'shop' ? (
                                <ShoppingBag size={14} className="text-purple-500" />
                              ) : purchase.destination?.type === 'factory' ? (
                                <Factory size={14} className="text-amber-500" />
                              ) : null}
                              <span className="text-gray-700 capitalize">
                                {purchase.destination ? 
                                  `${purchase.destination.type}: ${purchase.destination.name}` : 
                                  "-"
                                }
                              </span>
                            </div>
                          </td>
                          
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium capitalize ${
                              purchase.shippingStatus === 'received'
                                ? 'bg-green-100 text-green-700'
                                : purchase.shippingStatus === 'pending'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-purple-100 text-purple-700'
                            }`}>
                              {purchase.shippingStatus === 'received' ? (
                                <CheckCircle size={12} />
                              ) : purchase.shippingStatus === 'pending' ? (
                                <Clock size={12} />
                              ) : (
                                <Truck size={12} />
                              )}
                              {purchase.shippingStatus || 'pending'}
                            </span>
                          </td>
                          
                          <td className="p-4">
                            <div className="relative dropdown-container">
                              <button
                                onClick={() => handleDropdownToggle(purchase.id)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                              >
                                <MoreVertical size={18} className="text-gray-600" />
                              </button>
                              
                              {activeDropdown === purchase.id && (
                                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 z-10 overflow-hidden">
                                  <div className="py-1">
                                    <button
                                      onClick={() => handleView(purchase)}
                                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition"
                                    >
                                      <Eye size={16} />
                                      View Details
                                    </button>

                                    { canEditPurchase && (
                                      <button
                                        onClick={() => handleEditPurchase(purchase)}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition"
                                      >
                                        <Edit size={16} />
                                        Edit Purchase
                                      </button>
                                    )}
                                    
                                    {!isPaid && canAddPurchasePayment && (
                                      <button
                                        onClick={() => handleAddPayment(purchase)}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600 transition"
                                      >
                                        <CreditCard size={16} />
                                        Add Payment
                                      </button>
                                    )}

                                    {purchase.shippingStatus !== 'received' && canAddPurchaseShipment && (
                                      <button
                                        onClick={() => handleAddShipment(purchase)}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition"
                                      >
                                        <Truck size={16} />
                                        Add Shipment
                                      </button>
                                    )}

                                    <div className="border-t my-1"></div>
                                    
                                    { canDeletePurchase && (
                                      <button
                                        onClick={() => handleDelete(purchase)}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
                                      >
                                        <Trash2 size={16} />
                                        Delete Purchase
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalCount > 0 && (
                <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl p-4 mt-4">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {/* Items per page selector */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Show:</span>
                        <select
                          value={itemsPerPage}
                          onChange={(e) => {
                            setItemsPerPage(Number(e.target.value));
                            setCurrentPage(1);
                          }}
                          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        >
                          <option value="5">5</option>
                          <option value="10">10</option>
                          <option value="20">20</option>
                          <option value="50">50</option>
                          <option value="100">100</option>
                        </select>
                        <span className="text-sm text-gray-600">per page</span>
                      </div>

                      {/* Page info */}
                      <div className="text-sm text-gray-700">
                        Showing <span className="font-semibold">{indexOfFirstItem}</span> to{" "}
                        <span className="font-semibold">{indexOfLastItem}</span>{" "}
                        of <span className="font-semibold">{totalCount}</span> purchases
                      </div>
                    </div>

                    {/* Pagination buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => goToPage(1)}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                        title="First page"
                      >
                        <ChevronsLeft size={16} className="text-gray-600" />
                      </button>

                      <button
                        onClick={prevPage}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                        title="Previous page"
                      >
                        <ChevronLeft size={16} className="text-gray-600" />
                      </button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }

                          return (
                            <button
                              key={pageNum}
                              onClick={() => goToPage(pageNum)}
                              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                                currentPage === pageNum
                                  ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                                  : "hover:bg-white/50 text-gray-700"
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}

                        {totalPages > 5 && currentPage < totalPages - 2 && (
                          <>
                            <span className="mx-1 text-gray-400">...</span>
                            <button
                              onClick={() => goToPage(totalPages)}
                              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                                currentPage === totalPages
                                  ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                                  : "hover:bg-white/50 text-gray-700"
                              }`}
                            >
                              {totalPages}
                            </button>
                          </>
                        )}
                      </div>

                      <button
                        onClick={nextPage}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                        title="Next page"
                      >
                        <ChevronRight size={16} className="text-gray-600" />
                      </button>

                      <button
                        onClick={() => goToPage(totalPages)}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                        title="Last page"
                      >
                        <ChevronsRight size={16} className="text-gray-600" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modals - View details */}
      {viewModalOpen && selectedPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setViewModalOpen(false)}></div>
          <div className="relative backdrop-blur-xl bg-white/95 border border-white/60 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="sticky top-0 z-10 p-6 border-b border-white/50 bg-gradient-to-r from-blue-500/10 to-purple-600/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                    <Package className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">Purchase Details</h2>
                    <p className="text-gray-600">{selectedPurchase.reference}</p>
                  </div>
                </div>
                <button
                  onClick={() => setViewModalOpen(false)}
                  className="p-2 bg-white/60 rounded-lg hover:bg-white/80 transition-colors duration-300"
                >
                  <X size={20} className="text-gray-600" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-5">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Supplier</h4>
                  <p className="text-lg font-semibold flex items-center gap-2">
                    <Building2 size={18} className="text-blue-500" />
                    {selectedPurchase.supplier?.name}
                  </p>
                </div>
                <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-5">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Destination</h4>
                  <p className="text-lg font-semibold flex items-center gap-2">
                    {selectedPurchase.destination?.type === 'store' ? (
                      <Store size={18} className="text-blue-500" />
                    ) : selectedPurchase.destination?.type === 'shop' ? (
                      <ShoppingBag size={18} className="text-purple-500" />
                    ) : (
                      <Factory size={18} className="text-amber-500" />
                    )}
                    {selectedPurchase.destination ? 
                      `${selectedPurchase.destination.type}: ${selectedPurchase.destination.name}` : 
                      "-"
                    }
                  </p>
                </div>
                <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-5">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Total Amount</h4>
                  <p className="text-2xl font-bold text-green-600">
                    ${selectedPurchase.grandTotal?.toFixed(2)}
                  </p>
                </div>
                <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-5">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Due Amount</h4>
                  <p className={`text-2xl font-bold ${calculateDueAmount(selectedPurchase) > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                    ${calculateDueAmount(selectedPurchase).toFixed(2)}
                  </p>
                </div>
                <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-5">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Date</h4>
                  <p className="text-lg flex items-center gap-2">
                    <Calendar size={18} className="text-gray-400" />
                    {new Date(selectedPurchase.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-5">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Status</h4>
                  <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
                    calculateDueAmount(selectedPurchase) <= 0 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {calculateDueAmount(selectedPurchase) <= 0 ? (
                      <CheckCircle size={16} />
                    ) : (
                      <AlertCircle size={16} />
                    )}
                    {calculateDueAmount(selectedPurchase) <= 0 ? 'Paid' : 'Pending'}
                  </span>
                </div>
              </div>

              <div className="border-t pt-6">
                <div className="flex items-center gap-2 mb-4">
                  {["items", "payments", "shipments"].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveViewTab(tab)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                        activeViewTab === tab
                          ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>

                {activeViewTab === "items" && (
                  <div className="overflow-x-auto rounded-xl border border-white/60">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100/80">
                        <tr>
                          <th className="p-3 text-left">Type</th>
                          <th className="p-3 text-left">Item</th>
                          <th className="p-3 text-left">Quantity</th>
                          <th className="p-3 text-left">Unit Price</th>
                          <th className="p-3 text-left">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedPurchase.purchaseItems?.map((item, index) => (
                          <tr key={index} className="border-t border-white/50 hover:bg-white/30">
                            <td className="p-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                item.itemType === 'material' 
                                  ? 'bg-blue-100 text-blue-700' 
                                  : 'bg-green-100 text-green-700'
                              }`}>
                                {item.itemType}
                              </span>
                            </td>
                            <td className="p-3 font-medium">
                              {item.itemType === 'material' ? item.material?.name : item.product?.name}
                              {item.selectedName && item.selectedName !== (item.itemType === 'material' ? item.material?.name : item.product?.name) && (
                                <div className="text-xs text-gray-500 mt-1">{item.selectedName}</div>
                              )}
                            </td>
                            <td className="p-3">
                              {item.quantity} {item.itemType === 'material' ? item.material?.unit : item.product?.unit}
                              {item.selectedQuantity && item.selectedUnit && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {item.selectedQuantity} {item.selectedUnit}
                                </div>
                              )}
                            </td>
                            <td className="p-3">${item.unitPrice?.toFixed(2)}</td>
                            <td className="p-3 font-semibold">${item.totalPrice?.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeViewTab === "payments" && (
                  <div className="space-y-3">
                    {paymentHistory.length > 0 ? (
                      paymentHistory.map((txn, index) => (
                        <div key={index} className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-green-100 rounded-lg">
                                <DollarSign size={18} className="text-green-600" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-800">Payment #{index + 1}</div>
                                <div className="text-sm text-gray-600">{new Date(txn.createdAt).toLocaleString()}</div>
                                <div className="text-sm text-gray-600 mt-1">Method: {txn.payment_method}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-green-600 text-lg">
                                ${txn.amount?.toFixed(2)}
                              </div>
                              {txn.note && (
                                <div className="text-xs text-gray-500 mt-1">{txn.note}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <div className="p-4 bg-white/50 rounded-full inline-block mb-4">
                          <DollarSign size={48} className="text-gray-300" />
                        </div>
                        <p className="text-gray-500">No payments recorded yet</p>
                      </div>
                    )}
                  </div>
                )}

                {activeViewTab === "shipments" && (
                  <div className="space-y-4">
                    {shipments.length > 0 ? (
                      shipments.map((shipment) => (
                        <div key={shipment.id} className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-purple-100 rounded-lg">
                                <Truck size={18} className="text-purple-600" />
                              </div>
                              <div>
                                <div className="font-semibold text-gray-800">{shipment.reference || `Shipment #${shipment.id}`}</div>
                                <div className="text-sm text-gray-600">{new Date(shipment.createdAt).toLocaleString()}</div>
                              </div>
                            </div>
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                              {shipment.status || "pending"}
                            </span>
                          </div>
                          <div className="overflow-x-auto mt-3">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-100/50">
                                <tr>
                                  <th className="p-2 text-left">Item</th>
                                  <th className="p-2 text-left">Received Qty</th>
                                </tr>
                              </thead>
                              <tbody>
                                {shipment.items?.map((si) => (
                                  <tr key={si.id} className="border-t border-white/30">
                                    <td className="p-2">
                                      {si.itemType === 'material' ? si.material?.name : si.product?.name}
                                    </td>
                                    <td className="p-2 font-medium">{si.received_quantity}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <div className="p-4 bg-white/50 rounded-full inline-block mb-4">
                          <Truck size={48} className="text-gray-300" />
                        </div>
                        <p className="text-gray-500">No shipments recorded yet</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
          </div>
        </div>
      )}

      

      {/* Add Payment Modal */}
      {addPaymentModalOpen && selectedPurchase && canAddPurchasePayment && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <CreditCard size={24} />
                  Add Payment
                </h3>
                <button
                  onClick={() => setAddPaymentModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                  disabled={paymentLoading}
                >
                  <XCircle size={24} className="text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="mb-6 bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-700">Purchase Reference:</span>
                  <span className="font-bold text-blue-600">{selectedPurchase.reference}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-700">Purchase Total:</span>
                  <span className="font-bold text-green-600">
                    ${selectedPurchase.grandTotal?.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Due Amount:</span>
                  <span className="font-bold text-amber-600">
                    ${calculateDueAmount(selectedPurchase).toFixed(2)}
                  </span>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Amount *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="w-full pl-10 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Enter payment amount"
                      max={calculateDueAmount(selectedPurchase)}
                      min="0.01"
                      step="0.01"
                      disabled={paymentLoading}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account *
                  </label>
                  <select 
                    value={selectedAccount}
                    onChange={(e) => setSelectedAccount(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    disabled={paymentLoading}
                  >
                    <option value="">Select Account</option>
                    {accounts.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({account.account_number}) - ${account.balance.toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method *
                  </label>
                  <select 
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    disabled={paymentLoading}
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="bank">Bank Transfer</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    rows="3"
                    placeholder="Add payment notes..."
                    disabled={paymentLoading}
                  ></textarea>
                </div>
              </div>
              
              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => setAddPaymentModalOpen(false)}
                  className="flex-1 bg-gray-200 text-gray-800 font-medium py-3 rounded-lg hover:bg-gray-300 transition disabled:opacity-50"
                  disabled={paymentLoading}
                >
                  Cancel
                </button>
                <button 
                  onClick={handlePaymentSubmit}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium py-3 rounded-lg hover:from-green-600 hover:to-emerald-700 transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                  disabled={paymentLoading || !paymentAmount || !selectedAccount}
                >
                  {paymentLoading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Record Payment'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Shipment Modal */}
      {addShipmentModalOpen && selectedPurchase && canAddPurchaseShipment && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Truck size={24} />
                  Add Shipment
                </h3>
                <button
                  onClick={() => setAddShipmentModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                  disabled={shipmentLoading}
                >
                  <XCircle size={24} className="text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-6">
              {shipmentItems.length === 0 ? (
                <div className="text-center text-gray-600">
                  No remaining quantities to receive.
                </div>
              ) : (
                <div className="space-y-4">
                  {shipmentItems.map((item) => (
                    <div key={item.purchaseItemId} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between items-center mb-2">
                        <div className="font-medium text-gray-800">{item.name}</div>
                        <span className="text-xs text-gray-600">{item.itemType}</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <div className="text-gray-500">Ordered</div>
                          <div className="font-semibold">{item.orderedQuantity}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Received</div>
                          <div className="font-semibold">{item.receivedSoFar}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Remaining</div>
                          <div className="font-semibold">{item.remaining}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Receive Now</div>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            max={item.remaining}
                            value={item.receivedQuantity}
                            onChange={(e) => {
                              const val = e.target.value;
                              setShipmentItems(prev => prev.map(si => (
                                si.purchaseItemId === item.purchaseItemId
                                  ? { ...si, receivedQuantity: val }
                                  : si
                              )));
                            }}
                            className="w-full p-2 border rounded-lg bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Note</label>
                    <textarea
                      value={shipmentNote}
                      onChange={(e) => setShipmentNote(e.target.value)}
                      className="w-full p-2 border rounded-lg"
                      rows="3"
                      placeholder="Optional note..."
                    ></textarea>
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setAddShipmentModalOpen(false)}
                  className="flex-1 bg-gray-200 text-gray-800 font-medium py-3 rounded-lg hover:bg-gray-300 transition disabled:opacity-50"
                  disabled={shipmentLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleShipmentSubmit}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium py-3 rounded-lg hover:from-blue-600 hover:to-purple-700 transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                  disabled={shipmentLoading || shipmentItems.length === 0}
                >
                  {shipmentLoading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Shipment'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editModalOpen && selectedPurchase && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-800">Edit Purchase - {selectedPurchase.reference}</h3>
              <button onClick={() => setEditModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <XCircle size={22} className="text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input type="number" className="border rounded p-2" placeholder="Shipping cost" value={editShippingCost} onChange={(e) => setEditShippingCost(e.target.value)} />
                <input type="number" className="border rounded p-2" placeholder="Discount %" value={editDiscount} onChange={(e) => setEditDiscount(e.target.value)} />
                <input type="number" className="border rounded p-2" placeholder="Tax %" value={editTax} onChange={(e) => setEditTax(e.target.value)} />
                <input type="number" className="border rounded p-2" placeholder="Additional payment" value={editAdditionalPayment} onChange={(e) => setEditAdditionalPayment(e.target.value)} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <select className="border rounded p-2" value={editPaymentMethod} onChange={(e) => setEditPaymentMethod(e.target.value)}>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="bank">Bank</option>
                </select>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2 text-left">Item</th>
                      <th className="p-2 text-left">Qty</th>
                      <th className="p-2 text-left">Received</th>
                      <th className="p-2 text-left">Unit Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editItems.map((item) => (
                      <tr key={item.purchaseItemId} className="border-b">
                        <td className="p-2">{item.name} <span className="text-xs text-gray-500">({item.itemType})</span></td>
                        <td className="p-2">
                          <input type="number" min="0.01" step="0.01" className="border rounded p-1 w-28" value={item.quantity}
                            onChange={(e) => setEditItems((prev) => prev.map((x) => x.purchaseItemId === item.purchaseItemId ? { ...x, quantity: e.target.value } : x))} />
                        </td>
                        <td className="p-2">
                          <input type="number" min="0" step="0.01" className="border rounded p-1 w-28" value={item.receivedQuantity}
                            onChange={(e) => setEditItems((prev) => prev.map((x) => x.purchaseItemId === item.purchaseItemId ? { ...x, receivedQuantity: e.target.value } : x))} />
                        </td>
                        <td className="p-2">
                          <input type="number" min="0.01" step="0.01" className="border rounded p-1 w-28" value={item.unitPrice}
                            onChange={(e) => setEditItems((prev) => prev.map((x) => x.purchaseItemId === item.purchaseItemId ? { ...x, unitPrice: e.target.value } : x))} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setEditModalOpen(false)} className="flex-1 bg-gray-200 py-3 rounded-lg">Cancel</button>
                <button onClick={handleEditSubmit} disabled={editSaving} className="flex-1 bg-indigo-600 text-white py-3 rounded-lg disabled:opacity-50">
                  {editSaving ? "Saving..." : "Save Edit"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {returnModalOpen && selectedPurchase && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-800">{returnMode === "damage_return" ? "Damage Return" : "Purchase Return"} - {selectedPurchase.reference}</h3>
              <button onClick={() => setReturnModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <XCircle size={22} className="text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2 text-left">Item</th>
                      <th className="p-2 text-left">Return Qty</th>
                      <th className="p-2 text-left">Unit Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {returnItems.map((item) => (
                      <tr key={item.purchaseItemId} className="border-b">
                        <td className="p-2">{item.name} <span className="text-xs text-gray-500">({item.itemType})</span></td>
                        <td className="p-2">
                          <input type="number" min="0" step="0.01" className="border rounded p-1 w-28" value={item.quantity}
                            onChange={(e) => setReturnItems((prev) => prev.map((x) => x.purchaseItemId === item.purchaseItemId ? { ...x, quantity: e.target.value } : x))} />
                        </td>
                        <td className="p-2">
                          <input type="number" min="0.01" step="0.01" className="border rounded p-1 w-28" value={item.unitPrice}
                            onChange={(e) => setReturnItems((prev) => prev.map((x) => x.purchaseItemId === item.purchaseItemId ? { ...x, unitPrice: e.target.value } : x))} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <select className="border rounded p-2" value={returnCompensationType} onChange={(e) => setReturnCompensationType(e.target.value)}>
                  <option value="money">Money Compensation</option>
                  <option value="items">Items Compensation</option>
                </select>
                {returnCompensationType === "money" ? (
                  <input type="number" className="border rounded p-2" value={returnCompensationAmount} onChange={(e) => setReturnCompensationAmount(e.target.value)} placeholder="Compensation amount" />
                ) : (
                  <>
                    <select className="border rounded p-2" value={returnCompDestType} onChange={(e) => setReturnCompDestType(e.target.value)}>
                      <option value="store">Store</option>
                      <option value="shop">Shop</option>
                      <option value="factory">Factory</option>
                    </select>
                    <input type="number" className="border rounded p-2" value={returnCompDestId} onChange={(e) => setReturnCompDestId(e.target.value)} placeholder="Destination ID" />
                  </>
                )}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setReturnModalOpen(false)} className="flex-1 bg-gray-200 py-3 rounded-lg">Cancel</button>
                <button onClick={handleReturnSubmit} disabled={returnSubmitting} className="flex-1 bg-amber-600 text-white py-3 rounded-lg disabled:opacity-50">
                  {returnSubmitting ? "Submitting..." : "Submit Return"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Payment Modal */}
      {viewPaymentModalOpen && selectedPurchase && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <DollarSign size={24} />
                  Payment History - {selectedPurchase.reference}
                </h3>
                <button
                  onClick={() => setViewPaymentModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <XCircle size={24} className="text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="mb-6 bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-700">Purchase Reference:</span>
                  <span className="font-bold text-blue-600">{selectedPurchase.reference}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-700">Total Amount:</span>
                  <span className="font-bold text-green-600">
                    ${selectedPurchase.grandTotal?.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Remaining Due:</span>
                  <span className={`font-bold ${calculateDueAmount(selectedPurchase) > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                    ${calculateDueAmount(selectedPurchase).toFixed(2)}
                  </span>
                </div>
              </div>
              
              {/* Payment History List */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-800 mb-4">Payment History</h4>
                
                {paymentHistory.length > 0 ? (
                  paymentHistory.map((txn, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div>
                        <div className="font-medium text-gray-800">
                          Payment #{index + 1}
                        </div>
                        <div className="text-sm text-gray-600">
                          {new Date(txn.createdAt).toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-600">
                          Method: {txn.payment_method}
                        </div>
                        {txn.account && (
                          <div className="text-sm text-gray-600">
                            Account: {txn.account.name}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">
                          ${txn.amount?.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {txn.note || 'No notes'}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <DollarSign size={48} className="mx-auto mb-4 text-gray-300" />
                    <p>No payments recorded yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModalOpen && selectedPurchase && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Trash2 size={24} className="text-red-600" />
                  Delete Purchase
                </h3>
                <button
                  onClick={() => setDeleteModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                  disabled={deleteLoading}
                >
                  <XCircle size={24} className="text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} className="text-red-600" />
              </div>
              
              <div className="text-center mb-6">
                <h4 className="text-lg font-bold text-gray-800 mb-2">
                  Are you sure?
                </h4>
                <p className="text-gray-600">
                  You are about to delete purchase <span className="font-bold">{selectedPurchase.reference}</span>. 
                  This action cannot be undone.
                </p>
                
                <div className="mt-4 p-4 bg-red-50 rounded-lg">
                  <p className="text-red-700 text-sm">
                    ⚠️ This will delete all purchase items and payment records associated with this purchase.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteModalOpen(false)}
                  className="flex-1 bg-gray-200 text-gray-800 font-medium py-3 rounded-lg hover:bg-gray-300 transition disabled:opacity-50"
                  disabled={deleteLoading}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteSubmit}
                  className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white font-medium py-3 rounded-lg hover:from-red-600 hover:to-red-700 transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                  disabled={deleteLoading}
                >
                  {deleteLoading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete Purchase'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
