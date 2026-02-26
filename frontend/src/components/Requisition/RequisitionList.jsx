import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_ROUTES } from "../../config";
import { 
  ClipboardList, 
  Eye, 
  Edit, 
  Check, 
  X, 
  Truck, 
  Factory, 
  Plus, 
  GitBranchPlus,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ShoppingBag,
  Store,
  Building2,
  Package,
  DollarSign,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Layers,
  ArrowUpDown,
  Trash2
} from "lucide-react";
import { useAuth } from "../../App";

const RequisitionList = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const { currentUser } = useAuth();
  const isAdmin = ["admin", "superadmin"].includes(currentUser?.permission?.name || "");

  const [tab, setTab] = useState("requisitions");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [requesterType, setRequesterType] = useState("");
  const [requesterId, setRequesterId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [appliedFilters, setAppliedFilters] = useState({
    search: "",
    status: "",
    requesterType: "",
    requesterId: "",
    dateFrom: "",
    dateTo: "",
  });
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState("desc");
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [loadMode, setLoadMode] = useState("filter");
  const [overview, setOverview] = useState({ totalCount: 0, byStatus: {} });
  const [meta, setMeta] = useState({ totalPages: 1, total: 0 });
  const [places, setPlaces] = useState({ shops: [], stores: [], factories: [] });
  const [segmentModal, setSegmentModal] = useState({ open: false, requisition: null });
  const [sections, setSections] = useState([]);
  const [requisitionModal, setRequisitionModal] = useState({ open: false, loading: false, data: null, error: "" });
  const initializedRef = useRef(false);
  const skipNextPageFetchRef = useRef(false);

  useEffect(() => {
    const fetchPlaces = async () => {
      try {
        const res = await axios.get(API_ROUTES.REQUISITION_PLACES, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPlaces(res.data || { shops: [], stores: [], factories: [] });
      } catch (error) {
        console.error(error);
      }
    };
    fetchPlaces();
  }, [token]);

  const placeOptions = useMemo(() => ({
    shop: places.shops || [],
    store: places.stores || [],
    factory: places.factories || [],
  }), [places]);
  const requesterPlaceOptions = useMemo(
    () => (requesterType ? (placeOptions[requesterType] || []) : []),
    [placeOptions, requesterType]
  );

  const fetchOverview = useCallback(async () => {
    if (tab !== "requisitions") return;
    try {
      const res = await axios.get(API_ROUTES.REQUISITIONS_OVERVIEW, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          search: appliedFilters.search,
          status: appliedFilters.status,
          requesterType: appliedFilters.requesterType,
          requesterId: appliedFilters.requesterId,
          dateFrom: appliedFilters.dateFrom,
          dateTo: appliedFilters.dateTo
        },
      });
      setOverview({
        totalCount: Number(res.data?.totalCount || 0),
        byStatus: res.data?.byStatus || {},
      });
    } catch (error) {
      console.error(error);
      setOverview({ totalCount: 0, byStatus: {} });
    }
  }, [appliedFilters, tab, token]);

  const fetchData = useCallback(async (mode = "table", pageArg = page, limitArg = itemsPerPage) => {
    setLoading(true);
    setLoadMode(mode);
    try {
      if (tab === "requisitions") {
        const res = await axios.get(API_ROUTES.REQUISITIONS, {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            page: pageArg,
            limit: limitArg,
            search: appliedFilters.search,
            status: appliedFilters.status,
            requesterType: appliedFilters.requesterType,
            requesterId: appliedFilters.requesterId,
            dateFrom: appliedFilters.dateFrom,
            dateTo: appliedFilters.dateTo,
            sortBy,
            sortDirection
          },
        });
        setRows(res.data?.data || []);
        setMeta({
          totalPages: res.data?.pagination?.totalPages || 1,
          total: res.data?.pagination?.total || 0,
        });
      } else if (tab === "transfer_orders") {
        const res = await axios.get(API_ROUTES.REQUISITION_TRANSFER_ORDERS, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRows(res.data || []);
      } else if (tab === "production_orders") {
        const res = await axios.get(API_ROUTES.REQUISITION_PRODUCTION_ORDERS, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRows(res.data || []);
      } else {
        const res = await axios.get(API_ROUTES.REQUISITION_PURCHASE_ORDERS, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRows(res.data || []);
      }
    } catch (error) {
      console.error(error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, itemsPerPage, page, sortBy, sortDirection, tab, token]);

  useEffect(() => {
    if (tab !== "requisitions") {
      fetchData("filter");
      return;
    }
    initializedRef.current = true;
    skipNextPageFetchRef.current = page !== 1;
    setPage(1);
    fetchData("filter", 1, itemsPerPage);
    fetchOverview();
  }, [tab, appliedFilters, sortBy, sortDirection, fetchData, fetchOverview, itemsPerPage]);

  useEffect(() => {
    if (tab !== "requisitions" || !initializedRef.current) return;
    if (skipNextPageFetchRef.current) {
      skipNextPageFetchRef.current = false;
      return;
    }
    fetchData("table", page, itemsPerPage);
  }, [page, tab, itemsPerPage, fetchData]);

  const openSegment = (requisition) => {
    const baseItems = (requisition.items || []).map((it) => ({
      requisitionItemId: it.id,
      itemType: it.itemType,
      itemId: it.itemType === "product" ? it.productId : it.materialId,
      name: it.itemType === "product" ? it.product?.name : it.material?.name,
      quantity: it.requestedQty,
    }));
    setSections([
      {
        title: "Section 1",
        note: "",
        actionType: requisition.requestType === "money" ? "approval" : "transfer_order",
        destinationType: "",
        destinationId: "",
        items: baseItems,
      },
    ]);
    setSegmentModal({ open: true, requisition });
  };

  const addSection = () => {
    setSections((prev) => [
      ...prev,
      {
        title: `Section ${prev.length + 1}`,
        note: "",
        actionType: segmentModal.requisition?.requestType === "money" ? "approval" : "transfer_order",
        destinationType: "",
        destinationId: "",
        items: [],
      },
    ]);
  };

  const updateSection = (idx, key, value) => {
    setSections((prev) => prev.map((s, i) => (i === idx ? { ...s, [key]: value } : s)));
  };

  const toggleItemInSection = (sectionIndex, item) => {
    setSections((prev) =>
      prev.map((section, i) => {
        if (i !== sectionIndex) return section;
        const exists = section.items.find((it) => it.requisitionItemId === item.requisitionItemId);
        if (exists) {
          return {
            ...section,
            items: section.items.filter((it) => it.requisitionItemId !== item.requisitionItemId),
          };
        }
        return { ...section, items: [...section.items, { ...item }] };
      })
    );
  };

  const updateSectionItemQty = (sectionIndex, requisitionItemId, quantity) => {
    setSections((prev) =>
      prev.map((section, i) => {
        if (i !== sectionIndex) return section;
        return {
          ...section,
          items: section.items.map((it) =>
            it.requisitionItemId === requisitionItemId ? { ...it, quantity } : it
          ),
        };
      })
    );
  };

  const submitSegmentation = async () => {
    if (!segmentModal.requisition) return;
    try {
      const payload = {
        sections: sections.map((section) => ({
          title: section.title,
          note: section.note,
          actionType: section.actionType,
          destinationType: section.destinationType || null,
          destinationId: section.destinationId ? parseInt(section.destinationId, 10) : null,
          items: section.items.map((it) => ({
            requisitionItemId: it.requisitionItemId,
            itemType: it.itemType,
            itemId: parseInt(it.itemId, 10),
            quantity: parseFloat(it.quantity || 0),
          })),
        })),
      };
      await axios.post(API_ROUTES.REQUISITION_SECTIONS(segmentModal.requisition.id), payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSegmentModal({ open: false, requisition: null });
      setSections([]);
      fetchData();
    } catch (error) {
      alert(error?.response?.data?.error || "Failed to segment requisition");
    }
  };

  const approve = async (id) => {
    await axios.post(API_ROUTES.REQUISITION_APPROVE(id), {}, { headers: { Authorization: `Bearer ${token}` } });
    fetchData();
  };

  const reject = async (id) => {
    await axios.post(API_ROUTES.REQUISITION_REJECT(id), {}, { headers: { Authorization: `Bearer ${token}` } });
    fetchData();
  };

  const deleteRequisition = async (id) => {
    const ok = window.confirm("Delete this requisition? This action cannot be undone.");
    if (!ok) return;
    try {
      await axios.delete(API_ROUTES.REQUISITION_BY_ID(id), {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchData();
      fetchOverview();
    } catch (error) {
      alert(error?.response?.data?.error || "Failed to delete requisition");
    }
  };

  const acceptOrder = (order, type) => {
    if (type === "transfer") {
      navigate("/transfer/add", { state: { requisitionOrder: order, orderType: "transfer" } });
    } else if (type === "production") {
      navigate("/productions/new", { state: { requisitionOrder: order, orderType: "production" } });
    } else {
      navigate("/purchase/new", { state: { requisitionOrder: order, orderType: "purchase" } });
    }
  };

  const addChildRequisition = (order) => {
    navigate("/requisition/create", {
      state: {
        parentRequisitionId: order.requisitionId,
        requisitionOrder: order,
      },
    });
  };

  const openRequisitionModal = async (orderRow) => {
    const requisitionId = orderRow?.requisitionId || orderRow?.requisition?.id;
    if (!requisitionId) return;

    setRequisitionModal({ open: true, loading: true, data: null, error: "" });
    try {
      const res = await axios.get(API_ROUTES.REQUISITION_BY_ID(requisitionId), {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRequisitionModal({ open: true, loading: false, data: res.data || null, error: "" });
    } catch (error) {
      setRequisitionModal({
        open: true,
        loading: false,
        data: null,
        error: error?.response?.data?.error || "Failed to load requisition details",
      });
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-amber-100 text-amber-700', icon: <Clock size={12} /> },
      segmented: { color: 'bg-blue-100 text-blue-700', icon: <Layers size={12} /> },
      in_process: { color: 'bg-purple-100 text-purple-700', icon: <Clock size={12} /> },
      approved: { color: 'bg-green-100 text-green-700', icon: <CheckCircle size={12} /> },
      rejected: { color: 'bg-red-100 text-red-700', icon: <XCircle size={12} /> },
    };
    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-700', icon: <AlertCircle size={12} /> };
    
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.icon}
        {status}
      </span>
    );
  };

  const getRequesterIcon = (type) => {
    switch(type) {
      case 'shop': return <ShoppingBag size={14} className="text-purple-500" />;
      case 'store': return <Store size={14} className="text-blue-500" />;
      case 'factory': return <Factory size={14} className="text-amber-500" />;
      default: return <Building2 size={14} className="text-gray-500" />;
    }
  };

  const processingCount =
    Number(overview.byStatus?.segmented || 0) +
    Number(overview.byStatus?.in_process || 0);
  const approvedCount = Number(overview.byStatus?.approved || 0);
  const rejectedCount = Number(overview.byStatus?.rejected || 0);

  const goToPage = (pageNum) => {
    if (pageNum >= 1 && pageNum <= meta.totalPages) {
      setPage(pageNum);
    }
  };

  const renderPaginationControls = () => (
    <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl p-4 mt-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Show:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setPage(1);
              }}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <span className="text-sm text-gray-600">per page</span>
          </div>

          <div className="text-sm text-gray-700">
            Showing <span className="font-semibold">{meta.total === 0 ? 0 : (page - 1) * itemsPerPage + 1}</span> to{" "}
            <span className="font-semibold">{Math.min(page * itemsPerPage, meta.total)}</span>{" "}
            of <span className="font-semibold">{meta.total}</span> requisitions
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => goToPage(1)}
            disabled={page === 1}
            className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
            title="First page"
          >
            <ChevronsLeft size={16} className="text-gray-600" />
          </button>

          <button
            onClick={() => goToPage(page - 1)}
            disabled={page === 1}
            className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
            title="Previous page"
          >
            <ChevronLeft size={16} className="text-gray-600" />
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, meta.totalPages) }, (_, i) => {
              let pageNum;
              if (meta.totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= meta.totalPages - 2) {
                pageNum = meta.totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => goToPage(pageNum)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                    page === pageNum
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
                      : "hover:bg-white/50 text-gray-700"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            {meta.totalPages > 5 && page < meta.totalPages - 2 && (
              <>
                <span className="mx-1 text-gray-400">...</span>
                <button
                  onClick={() => goToPage(meta.totalPages)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                    page === meta.totalPages
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
                      : "hover:bg-white/50 text-gray-700"
                  }`}
                >
                  {meta.totalPages}
                </button>
              </>
            )}
          </div>

          <button
            onClick={() => goToPage(page + 1)}
            disabled={page === meta.totalPages}
            className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
            title="Next page"
          >
            <ChevronRight size={16} className="text-gray-600" />
          </button>

          <button
            onClick={() => goToPage(meta.totalPages)}
            disabled={page === meta.totalPages}
            className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
            title="Last page"
          >
            <ChevronsRight size={16} className="text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );

  const handleApplyFilters = () => {
    setAppliedFilters({
      search,
      status,
      requesterType,
      requesterId,
      dateFrom,
      dateTo,
    });
    setPage(1);
  };

  const handleClearFilters = () => {
    const empty = {
      search: "",
      status: "",
      requesterType: "",
      requesterId: "",
      dateFrom: "",
      dateTo: "",
    };
    setSearch(empty.search);
    setStatus(empty.status);
    setRequesterType(empty.requesterType);
    setRequesterId(empty.requesterId);
    setDateFrom(empty.dateFrom);
    setDateTo(empty.dateTo);
    setAppliedFilters(empty);
    setPage(1);
  };

  if (loading && loadMode === "filter") {
    return (
      <div className="min-h-screen rounded-t-2xl w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
        <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl p-10 text-center">
          <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading requisitions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen  rounded-t-2xl w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-300/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-300/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full mx-auto">
        {/* Header Card */}
        <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl shadow-indigo-100/50 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg">
                <ClipboardList className="text-white" size={36} />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Requisition Management
                </h1>
                <p className="text-gray-600 mt-2">Track requisitions and process transfer/production orders</p>
              </div>
            </div>
            
            <button
              type="button"
              onClick={() => navigate("/requisition/create")}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Plus size={20} />
              Create Requisition
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-2 mb-6 inline-flex flex-wrap gap-2">
          {[
            { id: "requisitions", label: "Requisitions", icon: <ClipboardList size={16} /> },
            { id: "transfer_orders", label: "Transfer Orders", icon: <Truck size={16} /> },
            { id: "production_orders", label: "Production Orders", icon: <Factory size={16} /> },
            { id: "purchase_orders", label: "Purchase Orders", icon: <ShoppingBag size={16} /> }
          ].map((item) => (
            <button
              key={item.id}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                tab === item.id
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg"
                  : "bg-white/50 text-gray-700 hover:bg-white/80"
              }`}
              onClick={() => setTab(item.id)}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>

        {/* Filters Section - Only for Requisitions */}
        {tab === "requisitions" && (
          <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Filter size={18} className="text-indigo-600" />
              <h2 className="text-lg font-semibold text-gray-800">Filters & Search</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="relative col-span-2">
                <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search reference/title..."
                  className="w-full pl-10 p-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm focus:ring-2 focus:ring-indigo-500/30 focus:border-transparent transition-all duration-300"
                />
              </div>
              
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full p-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm focus:ring-2 focus:ring-indigo-500/30 focus:border-transparent transition-all duration-300"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="segmented">Segmented</option>
                <option value="in_process">In Process</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>

              <select
                value={requesterType}
                onChange={(e) => {
                  setRequesterType(e.target.value);
                  setRequesterId("");
                }}
                className="w-full p-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm focus:ring-2 focus:ring-indigo-500/30 focus:border-transparent transition-all duration-300"
              >
                <option value="">All Requesters</option>
                <option value="shop">Shop</option>
                <option value="store">Store</option>
                <option value="factory">Factory</option>
              </select>

              <select
                value={requesterId}
                onChange={(e) => setRequesterId(e.target.value)}
                disabled={!requesterType}
                className="w-full p-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm focus:ring-2 focus:ring-indigo-500/30 focus:border-transparent transition-all duration-300 disabled:opacity-60"
              >
                <option value="">{requesterType ? "All Places" : "Select requester type first"}</option>
                {requesterPlaceOptions.map((row) => (
                  <option key={row.id} value={row.id}>{row.name}</option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPage(1);
                }}
                className="w-full p-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm focus:ring-2 focus:ring-indigo-500/30 focus:border-transparent transition-all duration-300"
              >
                <option value="createdAt">Sort by Created Date</option>
                <option value="reference">Sort by Reference</option>
                <option value="status">Sort by Status</option>
              </select>

              <select
                value={sortDirection}
                onChange={(e) => {
                  setSortDirection(e.target.value);
                  setPage(1);
                }}
                className="w-full p-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm focus:ring-2 focus:ring-indigo-500/30 focus:border-transparent transition-all duration-300"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>

              <div className="grid grid-cols-2 gap-2 md:col-span-2">
                <input
                  type="datetime-local"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full p-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm focus:ring-2 focus:ring-indigo-500/30 focus:border-transparent transition-all duration-300"
                />
                <input
                  type="datetime-local"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full p-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm focus:ring-2 focus:ring-indigo-500/30 focus:border-transparent transition-all duration-300"
                />
              </div>
              <div className="md:col-span-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleApplyFilters}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 text-sm font-medium inline-flex items-center gap-2"
                >
                  <Filter size={16} />
                  Apply
                </button>
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="px-4 py-2 rounded-xl bg-white/80 border border-gray-300 text-gray-700 hover:bg-white text-sm font-medium"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-gray-600">Loading data...</p>
              </div>
            </div>
          ) : (
            <>
              {tab === "requisitions" ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100/80">
                      <tr>
                        <th className="p-4 text-left font-medium text-gray-700">Reference</th>
                        <th className="p-4 text-left font-medium text-gray-700">Requester</th>
                        <th className="p-4 text-left font-medium text-gray-700">Items</th>
                        <th className="p-4 text-left font-medium text-gray-700">Status</th>
                        <th className="p-4 text-left font-medium text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, index) => (
                        <tr
                          key={row.id}
                          className={`border-t border-white/50 hover:bg-white/30 transition-colors duration-200 ${
                            index % 2 === 0 ? 'bg-white/10' : ''
                          }`}
                        >
                          <td className="p-4">
                            <div>
                              <span className="font-medium text-indigo-600">{row.reference}</span>
                              {row.title && (
                                <div className="text-xs text-gray-500 mt-1">{row.title}</div>
                              )}
                            </div>
                          </td>
                          
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                                {row.requesterName?.charAt(0) || 'R'}
                              </div>
                              <div>
                                <div className="flex items-center gap-1">
                                  {getRequesterIcon(row.requesterType)}
                                  <span className="font-medium text-gray-800">{row.requesterName || `ID: ${row.requesterId}`}</span>
                                </div>
                                <span className="text-xs text-gray-500 capitalize">{row.requesterType}</span>
                              </div>
                            </div>
                          </td>
                          
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Package size={14} className="text-gray-400" />
                              <span className="font-medium">{(row.items || []).length}</span>
                              {row.requestType === 'money' && (
                                <span className="flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                                  <DollarSign size={10} />
                                  {row.currency} {row.requestedAmount}
                                </span>
                              )}
                            </div>
                          </td>
                          
                          <td className="p-4">
                            {getStatusBadge(row.status)}
                          </td>
                          
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <button
                                className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors duration-300"
                                onClick={() => navigate(`/requisition/view/${row.id}`)}
                                title="View Details"
                              >
                                <Eye size={16} />
                              </button>
                              
                              {!row.isSegmented && row.requesterUserId === currentUser?.id && (
                                <button
                                  className="p-2 bg-teal-50 text-teal-600 rounded-lg hover:bg-teal-100 transition-colors duration-300"
                                  onClick={() => navigate(`/requisition/edit/${row.id}`)}
                                  title="Edit"
                                >
                                  <Edit size={16} />
                                </button>
                              )}

                              {!row.isSegmented && (isAdmin || row.requesterUserId === currentUser?.id) && (
                                <button
                                  className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors duration-300"
                                  onClick={() => deleteRequisition(row.id)}
                                  title="Delete"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                              
                              {isAdmin && row.status === "pending" && (
                                <>
                                  <button
                                    className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors duration-300"
                                    onClick={() => approve(row.id)}
                                    title="Approve"
                                  >
                                    <Check size={16} />
                                  </button>
                                  
                                  <button
                                    className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors duration-300"
                                    onClick={() => reject(row.id)}
                                    title="Reject"
                                  >
                                    <X size={16} />
                                  </button>
                                  
                                  <button
                                    className="p-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors duration-300"
                                    onClick={() => openSegment(row)}
                                    title="Segment"
                                  >
                                    <Layers size={16} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100/80">
                      <tr>
                        <th className="p-4 text-left font-medium text-gray-700">Requisition</th>
                        <th className="p-4 text-left font-medium text-gray-700">Section</th>
                        <th className="p-4 text-left font-medium text-gray-700">Items</th>
                        <th className="p-4 text-left font-medium text-gray-700">Destination</th>
                        <th className="p-4 text-left font-medium text-gray-700">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, index) => (
                        <tr
                          key={row.id}
                          className={`border-t border-white/50 hover:bg-white/30 transition-colors duration-200 ${
                            index % 2 === 0 ? 'bg-white/10' : ''
                          }`}
                        >
                          <td className="p-4">
                            <span className="font-medium text-indigo-600">{row.requisition?.reference}</span>
                          </td>
                          
                          <td className="p-4">
                            <div>
                              <div className="font-medium text-gray-800">{row.title || `Section ${row.sectionNo}`}</div>
                              <div className="mt-1">{getStatusBadge(row.status)}</div>
                            </div>
                          </td>
                          
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Package size={14} className="text-gray-400" />
                              <span className="font-medium">{(row.items || []).length}</span>
                            </div>
                          </td>
                          
                          <td className="p-4">
                            {row.destinationType ? (
                              <div className="flex items-center gap-2">
                                {getRequesterIcon(row.destinationType)}
                                <span className="capitalize">{row.destinationType}</span>
                                {row.destinationName ? (
                                  <span className="text-gray-700">- {row.destinationName}</span>
                                ) : row.destinationId ? (
                                  <span className="text-gray-500">#{row.destinationId}</span>
                                ) : null}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          
                          <td className="p-4">
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => openRequisitionModal(row)}
                                className="px-4 py-2 rounded-lg bg-white/70 border border-white/60 hover:bg-white text-gray-700 text-xs font-semibold inline-flex items-center gap-2 transition-all duration-300"
                              >
                                <Eye size={14} />
                                View Requisition
                              </button>

                              <button
                                type="button"
                                onClick={() => acceptOrder(row, tab === "transfer_orders" ? "transfer" : tab === "production_orders" ? "production" : "purchase")}
                                className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-semibold inline-flex items-center gap-2 transition-all duration-300 shadow-md hover:shadow-lg"
                              >
                                {tab === "transfer_orders" ? <Truck size={14} /> : tab === "production_orders" ? <Factory size={14} /> : <ShoppingBag size={14} />}
                                Accept Order
                              </button>
                              
                              {tab === "production_orders" && (
                                <button
                                  type="button"
                                  onClick={() => addChildRequisition(row)}
                                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white text-xs font-semibold inline-flex items-center gap-2 transition-all duration-300 shadow-md hover:shadow-lg"
                                >
                                  <GitBranchPlus size={14} />
                                  Add Requisition
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Empty State */}
              {rows.length === 0 && (
                <div className="text-center py-12">
                  <div className="p-4 bg-white/50 rounded-full inline-block mb-4">
                    <ClipboardList size={48} className="text-gray-300" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No {tab.replace('_', ' ')} found</h3>
                  <p className="text-gray-600 mb-6">There are no items to display at the moment.</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Pagination - Only for Requisitions */}
        {tab === "requisitions" && meta.total > 0 && (
          <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-4 mt-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-700">
                  Total <span className="font-semibold text-indigo-600">{meta.total}</span> requisitions
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(1)}
                  disabled={page <= 1}
                  className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                  title="First page"
                >
                  <ChevronsLeft size={16} className="text-gray-600" />
                </button>

                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                  title="Previous page"
                >
                  <ChevronLeft size={16} className="text-gray-600" />
                </button>

                <span className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-sm font-medium">
                  Page {page} of {meta.totalPages}
                </span>

                <button
                  onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                  disabled={page >= meta.totalPages}
                  className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                  title="Next page"
                >
                  <ChevronRight size={16} className="text-gray-600" />
                </button>

                <button
                  onClick={() => setPage(meta.totalPages)}
                  disabled={page >= meta.totalPages}
                  className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                  title="Last page"
                >
                  <ChevronsRight size={16} className="text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {requisitionModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setRequisitionModal({ open: false, loading: false, data: null, error: "" })}></div>
          <div className="relative backdrop-blur-xl bg-white/95 border border-white/60 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
            <div className="sticky top-0 z-10 p-6 border-b border-white/50 bg-gradient-to-r from-indigo-500/10 to-purple-600/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                    <ClipboardList className="text-white" size={22} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">Requisition Details</h2>
                    {requisitionModal.data?.reference ? <p className="text-gray-600">{requisitionModal.data.reference}</p> : null}
                  </div>
                </div>
                <button
                  onClick={() => setRequisitionModal({ open: false, loading: false, data: null, error: "" })}
                  className="p-2 bg-white/60 rounded-lg hover:bg-white/80 transition-colors duration-300"
                >
                  <X size={20} className="text-gray-600" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
              {requisitionModal.loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-600 rounded-full animate-spin"></div>
                </div>
              ) : requisitionModal.error ? (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700">{requisitionModal.error}</div>
              ) : requisitionModal.data ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-white/60 border border-white/60">
                      <p><strong>Reference:</strong> {requisitionModal.data.reference}</p>
                      <p><strong>Title:</strong> {requisitionModal.data.title || "-"}</p>
                      <p><strong>Status:</strong> {requisitionModal.data.status}</p>
                      <p><strong>Type:</strong> {requisitionModal.data.requestType}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/60 border border-white/60">
                      <p>
                        <strong>Requester:</strong>{" "}
                        {requisitionModal.data.requesterType} -{" "}
                        {requisitionModal.data.requesterName || `#${requisitionModal.data.requesterId}`}
                      </p>
                      <p><strong>Parent:</strong> {requisitionModal.data.parentRequisition?.reference || "-"}</p>
                      <p><strong>Created:</strong> {requisitionModal.data.createdAt ? new Date(requisitionModal.data.createdAt).toLocaleString() : "-"}</p>
                      <p><strong>Updated:</strong> {requisitionModal.data.updatedAt ? new Date(requisitionModal.data.updatedAt).toLocaleString() : "-"}</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white/60 border border-white/60">
                    <h3 className="font-semibold text-gray-800 mb-3">Items</h3>
                    {(requisitionModal.data.items || []).length === 0 ? (
                      <p className="text-gray-500">No items</p>
                    ) : (
                      <div className="space-y-2">
                        {(requisitionModal.data.items || []).map((it) => (
                          <div key={it.id} className="flex items-center justify-between p-2 rounded-lg bg-white/70 border border-white/50">
                            <div className="text-sm">
                              <span className="font-medium">{it.product?.name || it.material?.name || "-"}</span>
                              <span className="ml-2 text-xs text-gray-500">({it.itemType})</span>
                            </div>
                            <div className="text-sm text-gray-700">Requested: {it.requestedQty}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-gray-500">No data found.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Segment Modal */}
      {segmentModal.open && segmentModal.requisition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSegmentModal({ open: false, requisition: null })}></div>
          <div className="relative backdrop-blur-xl bg-white/95 border border-white/60 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="sticky top-0 z-10 p-6 border-b border-white/50 bg-gradient-to-r from-indigo-500/10 to-purple-600/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                    <Layers className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">Segment Requisition</h2>
                    <p className="text-gray-600">{segmentModal.requisition.reference}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={addSection}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium inline-flex items-center gap-2 hover:shadow-lg transition-all duration-300"
                  >
                    <Plus size={16} />
                    Add Section
                  </button>
                  <button
                    onClick={() => setSegmentModal({ open: false, requisition: null })}
                    className="p-2 bg-white/60 rounded-lg hover:bg-white/80 transition-colors duration-300"
                  >
                    <X size={20} className="text-gray-600" />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="">
                {sections.map((section, sIdx) => (
                  <div key={sIdx} className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs flex items-center justify-center">
                        {sIdx + 1}
                      </div>
                      Section {sIdx + 1}
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      <input
                        className="p-3 rounded-xl border border-gray-300 bg-white/70 focus:ring-2 focus:ring-indigo-500/30 focus:border-transparent transition-all duration-300"
                        value={section.title}
                        onChange={(e) => updateSection(sIdx, "title", e.target.value)}
                        placeholder="Section title"
                      />
                      
                      <select
                        className="p-3 rounded-xl border border-gray-300 bg-white/70 focus:ring-2 focus:ring-indigo-500/30 focus:border-transparent transition-all duration-300"
                        value={section.actionType}
                        onChange={(e) => updateSection(sIdx, "actionType", e.target.value)}
                      >
                        {segmentModal.requisition?.requestType === "money" ? (
                          <>
                            <option value="approval">Approval</option>
                            <option value="rejected">Rejected</option>
                          </>
                        ) : (
                          <>
                            <option value="transfer_order">Transfer Order</option>
                            <option value="production_order">Production Order</option>
                            <option value="purchase_order">Purchase Order</option>
                            <option value="rejected">Rejected</option>
                          </>
                        )}
                      </select>

                      <select
                        className="p-3 rounded-xl border border-gray-300 bg-white/70 focus:ring-2 focus:ring-indigo-500/30 focus:border-transparent transition-all duration-300"
                        value={section.destinationType}
                        onChange={(e) => updateSection(sIdx, "destinationType", e.target.value)}
                      >
                        <option value="">Select destination type</option>
                        <option value="shop">Shop</option>
                        <option value="store">Store</option>
                        <option value="factory">Factory</option>
                      </select>

                      <select
                        className="p-3 rounded-xl border border-gray-300 bg-white/70 focus:ring-2 focus:ring-indigo-500/30 focus:border-transparent transition-all duration-300"
                        value={section.destinationId}
                        onChange={(e) => updateSection(sIdx, "destinationId", e.target.value)}
                        disabled={!section.destinationType}
                      >
                        <option value="">Select destination</option>
                        {(placeOptions[section.destinationType] || []).map((row) => (
                          <option key={row.id} value={row.id}>{row.name}</option>
                        ))}
                      </select>
                    </div>

                    <input
                      className="w-full p-3 rounded-xl border border-gray-300 bg-white/70 focus:ring-2 focus:ring-indigo-500/30 focus:border-transparent transition-all duration-300 mb-4"
                      value={section.note}
                      onChange={(e) => updateSection(sIdx, "note", e.target.value)}
                      placeholder="Section note (optional)"
                    />

                    {segmentModal.requisition?.requestType === "money" && (
                      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 mb-4">
                        <div className="flex items-center gap-2 text-amber-800">
                          <DollarSign size={18} />
                          <span className="font-medium">Money Requisition:</span>
                          <span>{segmentModal.requisition.currency || "BDT"} {segmentModal.requisition.requestedAmount || 0}</span>
                          <span className="text-sm text-amber-600">({segmentModal.requisition.amountPurpose || "No purpose"})</span>
                        </div>
                      </div>
                    )}

                    {segmentModal.requisition?.requestType === "items" && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="border border-white/40 rounded-xl p-4 bg-white/30">
                          <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                            <Package size={16} className="text-indigo-600" />
                            Available Items
                          </h4>
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {(segmentModal.requisition.items || []).map((it) => {
                              const row = {
                                requisitionItemId: it.id,
                                itemType: it.itemType,
                                itemId: it.itemType === "product" ? it.productId : it.materialId,
                                name: it.itemType === "product" ? it.product?.name : it.material?.name,
                                quantity: it.requestedQty,
                              };
                              const selected = section.items.some((x) => x.requisitionItemId === it.id);
                              return (
                                <label
                                  key={it.id}
                                  className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-200 cursor-pointer ${
                                    selected 
                                      ? 'border-indigo-300 bg-indigo-50' 
                                      : 'border-white/60 hover:bg-white/50'
                                  }`}
                                >
                                  <div className="flex-1">
                                    <div className="font-medium text-gray-800">{row.name}</div>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                                        row.itemType === 'product' 
                                          ? 'bg-blue-100 text-blue-700' 
                                          : 'bg-green-100 text-green-700'
                                      }`}>
                                        {row.itemType}
                                      </span>
                                      <span className="text-xs text-gray-500">Qty: {row.quantity}</span>
                                    </div>
                                  </div>
                                  <input
                                    type="checkbox"
                                    checked={selected}
                                    onChange={() => toggleItemInSection(sIdx, row)}
                                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                  />
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        <div className="border border-white/40 rounded-xl p-4 bg-white/30">
                          <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                            <Package size={16} className="text-purple-600" />
                            Selected Items
                          </h4>
                          <div className="space-y-3 max-h-64 overflow-y-auto">
                            {section.items.length === 0 ? (
                              <p className="text-gray-500 text-center py-4">No items selected</p>
                            ) : (
                              section.items.map((it) => (
                                <div key={it.requisitionItemId} className="flex items-center justify-between gap-2 p-3 bg-white/50 rounded-lg border border-white/60">
                                  <div className="flex-1">
                                    <div className="font-medium text-gray-800">{it.name}</div>
                                    <div className="text-xs text-gray-500 mt-1">{it.itemType}</div>
                                  </div>
                                  <input
                                    type="number"
                                    className="w-24 p-2 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-indigo-500/30"
                                    value={it.quantity}
                                    min="0.01"
                                    step="0.01"
                                    onChange={(e) => updateSectionItemQty(sIdx, it.requisitionItemId, e.target.value)}
                                  />
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <div className="p-6 mb-5 border-t border-white/50 bg-white/80 backdrop-blur-sm">
                  <div className="flex justify-end gap-3">
                    <button
                      className="px-6 py-3 bg-gray-200/60 text-gray-700 font-medium rounded-xl hover:bg-gray-300/80 transition-all duration-300 border border-white/60"
                      onClick={() => setSegmentModal({ open: false, requisition: null })}
                    >
                      Cancel
                    </button>
                    <button
                      className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-xl hover:shadow-lg transition-all duration-300"
                      onClick={submitSegmentation}
                    >
                      Save Segments
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequisitionList;
