import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_ROUTES, MEDIA_BASE_URL } from "../../config";
import { activeOnly } from "../../utils/softDelete";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Package,
  AlertTriangle,
  DollarSign,
  Save,
  X,
  Search,
  FileText,
  Check,
  AlertCircle,
  Loader,
  Image as ImageIcon,
  Building,
  Store,
  Factory,
} from "lucide-react";

const AddMaterialScrapRecord = () => {
  const navigate = useNavigate();

  // Form state
  const [formData, setFormData] = useState({
    fromType: "store",
    fromBranchId: "",
    reason: "",
    note: "",
  });

  // Branches by type
  const [stores, setStores] = useState([]);
  const [shops, setShops] = useState([]);
  const [factories, setFactories] = useState([]);

  // Available materials from selected branch (with stock)
  const [availableMaterials, setAvailableMaterials] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fetchingBranches, setFetchingBranches] = useState(true);
  const [fetchingMaterials, setFetchingMaterials] = useState(false);

  // Scrap materials state (materials to be scrapped)
  const [scrapMaterials, setScrapMaterials] = useState([]);

  // New material to add to scrap
  const [newMaterial, setNewMaterial] = useState({
    materialId: "",
    materialName: "",
    maxQuantity: 0, // Available stock
    quantity: 1,
    lossPerUnit: 0,
    branchMaterialId: "", // StoreMaterial/ShopMaterial/FactoryMaterial ID
  });

  // Statistics
  const [statistics, setStatistics] = useState({
    totalMaterials: 0,
    totalUnits: 0,
    totalLoss: 0,
  });

  // Get token from localStorage
  const getToken = () => {
    return localStorage.getItem("token");
  };

  // Create axios instance with auth header
  const getAuthHeaders = () => {
    const token = getToken();
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  };

  // Fetch branches on component mount
  useEffect(() => {
    fetchBranches();
  }, []);

  // Fetch materials when fromType or fromBranchId changes
  useEffect(() => {
    if (formData.fromBranchId) {
      fetchBranchMaterials();
    }
  }, [formData.fromType, formData.fromBranchId]);

  // Update statistics when scrap materials change
  useEffect(() => {
    const stats = {
      totalMaterials: scrapMaterials.length,
      totalUnits: scrapMaterials.reduce(
        (sum, m) => sum + parseFloat(m.quantity || 0),
        0,
      ),
      totalLoss: scrapMaterials.reduce(
        (sum, m) =>
          sum + parseFloat(m.quantity || 0) * parseFloat(m.lossPerUnit || 0),
        0,
      ),
    };
    setStatistics(stats);
  }, [scrapMaterials]);

  const fetchBranches = async () => {
    try {
      setFetchingBranches(true);
      const token = getToken();

      if (!token) {
        alert("Authentication required. Please login again.");
        return;
      }

      // Fetch stores
      const storesRes = await axios.get(
        `${API_ROUTES.STORES}`,
        getAuthHeaders(),
      );
      setStores(activeOnly(storesRes.data.stores || storesRes.data || []));

      // Fetch shops
      const shopsRes = await axios.get(`${API_ROUTES.SHOPS}`, getAuthHeaders());
      setShops(activeOnly(shopsRes.data.shops || shopsRes.data || []));

      // Fetch factories
      const factoriesRes = await axios.get(
        `${API_ROUTES.FACTORIES}`,
        getAuthHeaders(),
      );
      setFactories(activeOnly(factoriesRes.data.factories || factoriesRes.data || []));
    } catch (error) {
      console.error("Error fetching branches:", error);
      if (error.response?.status === 401) {
        alert("Session expired. Please login again.");
      } else {
        alert("Failed to load branches. Please refresh the page.");
      }
    } finally {
      setFetchingBranches(false);
    }
  };

  const fetchBranchMaterials = async () => {
    if (!formData.fromBranchId) {
      setAvailableMaterials([]);
      return;
    }

    try {
      setFetchingMaterials(true);
      const token = getToken();

      if (!token) {
        alert("Authentication required. Please login again.");
        return;
      }

      // Try with full URL first
      const url = `${API_ROUTES.BRANCH_MATERIALS}?type=${formData.fromType}&branchId=${formData.fromBranchId}`;
      console.log("Trying full URL:", url);

      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("API Response:", response.data);

      // Handle the response structure
      if (
        response.data &&
        response.data.success === true &&
        Array.isArray(response.data.materials)
      ) {
        setAvailableMaterials(activeOnly(response.data.materials));
        console.log(
          "Successfully fetched materials:",
          response.data.materials.length,
        );
      } else {
        console.warn("Unexpected response structure");
        setAvailableMaterials([]);
      }
    } catch (error) {
      console.error("Error fetching branch materials:", error);
      console.error("Error response:", error.response);

      if (error.response?.status === 401) {
        alert("Session expired. Please login again.");
      } else {
        setAvailableMaterials([]);
        alert(
          "Failed to load materials from this branch. Check console for details.",
        );
      }
    } finally {
      setFetchingMaterials(false);
    }
  };

  // Search materials as user types
  const handleSearchChange = useCallback(
    (e) => {
      const query = e.target.value;
      setSearchQuery(query);

      if (!query.trim() || !formData.fromBranchId) {
        setSearchResults([]);
        setShowResults(false);
        return;
      }

      setShowResults(true);
      const searchTerm = query.toLowerCase();

      // Ensure availableMaterials is an array before filtering
      const materialsArray = Array.isArray(availableMaterials)
        ? availableMaterials
        : [];

      const results = materialsArray
        .filter((branchMaterial) => {
          const material = branchMaterial.material || {};
          return (
            material.name?.toLowerCase().includes(searchTerm) ||
            material.barcode?.toLowerCase().includes(searchTerm) ||
            material.description?.toLowerCase().includes(searchTerm) ||
            material.brand?.toLowerCase().includes(searchTerm)
          );
        })
        .slice(0, 10);

      setSearchResults(results);
    },
    [availableMaterials, formData.fromBranchId],
  );

  // Handle material selection from search results
  const handleMaterialSelect = (branchMaterial) => {
    const material = branchMaterial.material || {};
    const materialId = material.id || branchMaterial.materialId;
    const materialName = material.name || "Unknown Material";
    const stock = branchMaterial.stock || branchMaterial.quantity || 0;
    // Use avg_cost from branchMaterial instead of unit_cost from material
    const avgCost = branchMaterial.avg_cost || 0;

    if (!materialId) {
      alert("Invalid material data");
      return;
    }

    setNewMaterial({
      materialId: materialId,
      materialName: materialName,
      maxQuantity: stock,
      quantity: 1,
      lossPerUnit: avgCost, // Changed from unitCost to avgCost
      branchMaterialId: branchMaterial.id || "", // ID from StoreMaterial/ShopMaterial/FactoryMaterial
    });
    setSearchResults([]);
    setSearchQuery("");
    setShowResults(false);
  };

  const handleAddMaterial = () => {
    if (
      !newMaterial.materialId ||
      newMaterial.quantity <= 0 ||
      newMaterial.lossPerUnit < 0
    ) {
      alert("Please fill all material fields correctly");
      return;
    }

    if (newMaterial.quantity > newMaterial.maxQuantity) {
      alert(`Cannot exceed available stock (${newMaterial.maxQuantity})`);
      return;
    }

    // Check if material already exists in scrap materials
    const existingIndex = scrapMaterials.findIndex(
      (m) => m.materialId === newMaterial.materialId,
    );

    if (existingIndex !== -1) {
      // Update existing scrap material
      const updatedMaterials = [...scrapMaterials];
      const updatedQuantity =
        parseFloat(updatedMaterials[existingIndex].quantity) +
        parseFloat(newMaterial.quantity);

      if (updatedQuantity > newMaterial.maxQuantity) {
        alert(`Cannot exceed available stock (${newMaterial.maxQuantity})`);
        return;
      }

      updatedMaterials[existingIndex] = {
        ...updatedMaterials[existingIndex],
        quantity: updatedQuantity,
        lossPerUnit: newMaterial.lossPerUnit,
      };
      setScrapMaterials(updatedMaterials);
    } else {
      // Add new scrap material
      setScrapMaterials([
        ...scrapMaterials,
        {
          ...newMaterial,
          id: Date.now(), // Temporary ID for rendering
        },
      ]);
    }

    // Reset form
    setNewMaterial({
      materialId: "",
      materialName: "",
      maxQuantity: 0,
      quantity: 1,
      lossPerUnit: 0,
      branchMaterialId: "",
    });
  };

  const handleRemoveMaterial = (index) => {
    setScrapMaterials(scrapMaterials.filter((_, i) => i !== index));
  };

  const handleUpdateMaterial = (index, field, value) => {
    const updatedMaterials = [...scrapMaterials];
    const material = updatedMaterials[index];

    if (field === "quantity" && parseFloat(value) > material.maxQuantity) {
      alert(`Cannot exceed available stock (${material.maxQuantity})`);
      return;
    }

    if (field === "lossPerUnit" && parseFloat(value) < 0) {
      alert("Loss per unit cannot be negative");
      return;
    }

    updatedMaterials[index] = {
      ...material,
      [field]: value,
    };
    setScrapMaterials(updatedMaterials);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.fromBranchId) {
      alert("Please select a source branch");
      return;
    }

    if (!formData.reason.trim()) {
      alert("Please enter a reason for scrapping");
      return;
    }

    if (scrapMaterials.length === 0) {
      alert("Please add at least one material");
      return;
    }

    // Validate all scrap materials
    for (const material of scrapMaterials) {
      if (material.quantity <= 0) {
        alert(`Quantity must be greater than 0 for ${material.materialName}`);
        return;
      }
      if (material.lossPerUnit < 0) {
        alert(`Loss per unit cannot be negative for ${material.materialName}`);
        return;
      }
      if (material.quantity > material.maxQuantity) {
        alert(
          `Quantity cannot exceed available stock (${material.maxQuantity}) for ${material.materialName}`,
        );
        return;
      }
    }

    try {
      setSubmitting(true);
      const token = getToken();

      if (!token) {
        alert("Authentication required. Please login again.");
        return;
      }

      const payload = {
        fromType: formData.fromType,
        fromId: parseInt(formData.fromBranchId),
        reason: formData.reason,
        note: formData.note || "",
        materials: scrapMaterials.map((m) => ({
          branchMaterialId: m.branchMaterialId,
          materialId: parseInt(m.materialId),
          quantity: parseFloat(m.quantity),
          lossPerUnit: parseFloat(m.lossPerUnit),
          maxQuantity: parseFloat(m.maxQuantity), // For validation on backend
        })),
      };

      const response = await axios.post(
        API_ROUTES.MATERIAL_SCRAP_RECORDS,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      alert("Material scrap record created successfully!");
      navigate("/damage-record");
    } catch (error) {
      console.error("Error creating material scrap record:", error);
      alert(
        error.response?.data?.error || "Failed to create material scrap record",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (
      scrapMaterials.length > 0 ||
      formData.reason ||
      formData.note ||
      formData.fromBranchId
    ) {
      if (
        window.confirm(
          "Are you sure you want to cancel? All unsaved changes will be lost.",
        )
      ) {
        navigate("/damage-record");
      }
    } else {
      navigate("/damage-record");
    }
  };

  // Get current branches based on selected type
  const getCurrentBranches = () => {
    switch (formData.fromType) {
      case "store":
        return stores;
      case "shop":
        return shops;
      case "factory":
        return factories;
      default:
        return [];
    }
  };

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showResults && !e.target.closest(".search-container")) {
        setShowResults(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showResults]);

  // Get icon based on branch type
  const getBranchIcon = (type) => {
    switch (type) {
      case "store":
        return <Store size={20} />;
      case "shop":
        return <Building size={20} />;
      case "factory":
        return <Factory size={20} />;
      default:
        return <Building size={20} />;
    }
  };

  // Get image URL helper
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith("http")) return imagePath;

    if (imagePath.startsWith("/uploads/"))
      return `${MEDIA_BASE_URL}${imagePath}`;

    return `${MEDIA_BASE_URL}/uploads/${imagePath}`;
  };

  return (
    <div className="min-h-screen rounded-t-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-300/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full mx-auto">
        {/* Header */}
        <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl shadow-red-100/50 mb-6 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={handleCancel}
                className="p-3 bg-white/60 rounded-xl hover:bg-white/80 transition-colors duration-300"
              >
                <ArrowLeft size={20} className="text-gray-600" />
              </button>
              <div className="flex items-center gap-4">
                <div className="p-4 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl shadow-lg">
                  <AlertTriangle className="text-white" size={36} />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                    Add Material Scrap Record
                  </h1>
                  <p className="text-gray-600 mt-2">
                    Record material losses due to damage, defects, or waste
                  </p>
                </div>
              </div>
            </div>

            <div className="hidden md:block px-6 py-3 bg-white/60 backdrop-blur-sm rounded-xl border border-white/80">
              <p className="text-sm font-medium text-gray-700">
                Estimated Loss
              </p>
              <p className="text-2xl font-bold text-red-600">
                ${statistics.totalLoss.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Loading state for branches */}
          {fetchingBranches ? (
            <div className="text-center py-4">
              <div className="flex items-center justify-center gap-3">
                <Loader className="w-5 h-5 animate-spin text-blue-500" />
                <p className="text-gray-600">Loading branches...</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="backdrop-blur-sm bg-white/60 border border-white/40 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Materials</p>
                    <p className="text-xl font-bold text-blue-600">
                      {statistics.totalMaterials}
                    </p>
                  </div>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Package size={20} className="text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="backdrop-blur-sm bg-white/60 border border-white/40 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Units</p>
                    <p className="text-xl font-bold text-orange-600">
                      {statistics.totalUnits}
                    </p>
                  </div>
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <AlertTriangle size={20} className="text-orange-600" />
                  </div>
                </div>
              </div>

              <div className="backdrop-blur-sm bg-white/60 border border-white/40 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Loss</p>
                    <p className="text-xl font-bold text-red-600">
                      ${statistics.totalLoss.toFixed(2)}
                    </p>
                  </div>
                  <div className="p-2 bg-red-100 rounded-lg">
                    <DollarSign size={20} className="text-red-600" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Left Column - Record Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Source Information Card */}
              <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <Building size={24} className="text-blue-600" />
                  Source Information
                </h2>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Source Type *
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {["store", "shop", "factory"].map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              fromType: type,
                              fromBranchId: "",
                            });
                            setScrapMaterials([]);
                            setAvailableMaterials([]);
                          }}
                          className={`px-4 py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
                            formData.fromType === type
                              ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg"
                              : "bg-white/60 text-gray-700 hover:bg-white/80"
                          }`}
                        >
                          {getBranchIcon(type)}
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select{" "}
                      {formData.fromType.charAt(0).toUpperCase() +
                        formData.fromType.slice(1)}{" "}
                      *
                    </label>
                    <select
                      value={formData.fromBranchId}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          fromBranchId: e.target.value,
                        });
                        setScrapMaterials([]);
                      }}
                      className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300"
                      required
                      disabled={fetchingBranches}
                    >
                      <option value="">Select a {formData.fromType}</option>
                      {getCurrentBranches().map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}{" "}
                          {branch.address ? `- ${branch.address}` : ""}
                        </option>
                      ))}
                    </select>
                    {fetchingBranches && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                        <Loader className="w-4 h-4 animate-spin" />
                        Loading {formData.fromType}s...
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason for Scrapping *
                    </label>
                    <input
                      type="text"
                      value={formData.reason}
                      onChange={(e) =>
                        setFormData({ ...formData, reason: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-300"
                      placeholder="e.g., Damaged during handling, Manufacturing defect, Wastage, etc."
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Additional Notes
                    </label>
                    <textarea
                      value={formData.note}
                      onChange={(e) =>
                        setFormData({ ...formData, note: e.target.value })
                      }
                      rows="3"
                      className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300"
                      placeholder="Any additional details about why these materials were scrapped..."
                    />
                  </div>
                </div>
              </div>

              {/* Add Materials Card */}
              <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <Package size={24} className="text-orange-600" />
                  Select Materials to Scrap
                </h2>

                {/* Source not selected message */}
                {!formData.fromBranchId ? (
                  <div className="text-center py-8">
                    <div className="p-4 bg-white/50 rounded-xl inline-block mb-4">
                      <AlertCircle size={48} className="text-gray-300" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">
                      Select a Source First
                    </h3>
                    <p className="text-gray-600">
                      Please select a source {formData.fromType} to view
                      available materials
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Loading state for materials */}
                    {fetchingMaterials ? (
                      <div className="text-center py-8">
                        <div className="flex flex-col items-center gap-4">
                          <Loader className="w-8 h-8 animate-spin text-blue-500" />
                          <p className="text-gray-600">Loading materials...</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Search Material */}
                        <div className="mb-6 search-container">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Search Material
                          </label>
                          <div className="relative mb-4">
                            <div className="relative">
                              <input
                                type="text"
                                value={searchQuery}
                                onChange={handleSearchChange}
                                className="w-full pl-4 pr-10 py-3 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300"
                                placeholder="Search by material name, brand, or barcode..."
                                disabled={availableMaterials.length === 0}
                              />
                              <Search
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                                size={20}
                              />
                            </div>

                            {/* Real-time Search Results Dropdown */}
                            {showResults && searchResults.length > 0 && (
                              <div className="absolute z-10 w-full mt-1 bg-white/90 backdrop-blur-sm border border-gray-200/50 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                                <div className="py-2">
                                  <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b border-gray-100">
                                    Available Materials ({searchResults.length})
                                  </div>
                                  {searchResults.map((branchMaterial) => {
                                    const material =
                                      branchMaterial.material || {};
                                    const materialName =
                                      material.name || "Unknown Material";
                                    const stock = branchMaterial.stock || 0;
                                    const unitCost = material.unit_cost || 0;
                                    const materialImage = material.image;
                                    const imageUrl = materialImage
                                      ? getImageUrl(materialImage)
                                      : null;

                                    return (
                                      <div
                                        key={
                                          branchMaterial.id ||
                                          `${material.id}_${stock}`
                                        }
                                        onClick={() =>
                                          handleMaterialSelect(branchMaterial)
                                        }
                                        className="px-3 py-3 hover:bg-gray-50/80 cursor-pointer transition-colors duration-150 border-b border-gray-100 last:border-b-0"
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200 bg-gray-50">
                                              {imageUrl ? (
                                                <img
                                                  src={imageUrl}
                                                  alt={materialName}
                                                  className="w-full h-full object-cover"
                                                  onError={(e) => {
                                                    e.target.style.display =
                                                      "none";
                                                    e.target.parentElement.innerHTML =
                                                      '<div class="w-full h-full bg-gray-100 flex items-center justify-center"><ImageIcon size={12} class="text-gray-400" /></div>';
                                                  }}
                                                />
                                              ) : (
                                                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                                  <ImageIcon
                                                    size={12}
                                                    className="text-gray-400"
                                                  />
                                                </div>
                                              )}
                                            </div>
                                            <div>
                                              <p className="font-medium text-gray-800">
                                                {materialName}
                                              </p>
                                              <div className="flex flex-wrap gap-2 text-xs text-gray-500 mt-1">
                                                <span>Available: {stock}</span>
                                                <span>
                                                  • Avg Cost: $
                                                  {branchMaterial.avg_cost?.toFixed(
                                                    2,
                                                  ) || "0.00"}
                                                  /unit
                                                </span>
                                                {material.brand && (
                                                  <span>
                                                    • Brand: {material.brand}
                                                  </span>
                                                )}
                                                {material.barcode && (
                                                  <span>
                                                    • Code: {material.barcode}
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                          <div className="text-xs text-green-600 font-medium">
                                            Select
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* No materials available */}
                          {availableMaterials.length === 0 &&
                            !fetchingMaterials && (
                              <div className="mb-6 p-4 bg-amber-50/60 border border-amber-200/50 rounded-xl">
                                <div className="flex items-center gap-3">
                                  <AlertTriangle
                                    size={20}
                                    className="text-amber-600"
                                  />
                                  <div>
                                    <p className="text-sm font-medium text-amber-800">
                                      No materials available
                                    </p>
                                    <p className="text-xs text-amber-700">
                                      There are no materials available at this{" "}
                                      {formData.fromType}.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                          {/* Selected Material Form */}
                          {newMaterial.materialName && (
                            <div className="mb-6 p-4 bg-gradient-to-r from-green-50/60 to-emerald-50/60 border border-green-200/50 rounded-xl">
                              <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-medium text-gray-700">
                                  Selected: {newMaterial.materialName}
                                </h3>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500">
                                    Available: {newMaterial.maxQuantity}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setNewMaterial({
                                        materialId: "",
                                        materialName: "",
                                        maxQuantity: 0,
                                        quantity: 1,
                                        lossPerUnit: 0,
                                        branchMaterialId: "",
                                      })
                                    }
                                    className="p-1 text-gray-400 hover:text-gray-600"
                                    title="Clear selection"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">
                                    Quantity *
                                  </label>
                                  <input
                                    type="number"
                                    value={newMaterial.quantity}
                                    onChange={(e) =>
                                      setNewMaterial({
                                        ...newMaterial,
                                        quantity: e.target.value,
                                      })
                                    }
                                    className="w-full px-3 py-2 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                    min="1"
                                    max={newMaterial.maxQuantity}
                                    step="0.01"
                                  />
                                  <p className="text-xs text-gray-500 mt-1">
                                    Max: {newMaterial.maxQuantity}
                                  </p>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">
                                    Loss per Unit ($) *
                                  </label>
                                  <input
                                    type="number"
                                    value={newMaterial.lossPerUnit}
                                    onChange={(e) =>
                                      setNewMaterial({
                                        ...newMaterial,
                                        lossPerUnit: e.target.value,
                                      })
                                    }
                                    className="w-full px-3 py-2 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/30"
                                    min="0"
                                    step="0.01"
                                  />
                                </div>
                                <div className="flex items-end">
                                  <button
                                    type="button"
                                    onClick={handleAddMaterial}
                                    className="w-full px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-300 flex items-center justify-center gap-2"
                                  >
                                    <Plus size={16} />
                                    Add to List
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Scrap Materials List */}
                        {scrapMaterials.length > 0 ? (
                          <div className="overflow-hidden rounded-xl border border-white/60">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-100/80">
                                <tr>
                                  <th className="p-3 text-left font-medium text-gray-700">
                                    Material
                                  </th>
                                  <th className="p-3 text-left font-medium text-gray-700">
                                    Quantity
                                  </th>
                                  <th className="p-3 text-left font-medium text-gray-700">
                                    Loss/Unit
                                  </th>
                                  <th className="p-3 text-left font-medium text-gray-700">
                                    Total Loss
                                  </th>
                                  <th className="p-3 text-left font-medium text-gray-700">
                                    Actions
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {scrapMaterials.map((material, index) => (
                                  <tr
                                    key={material.id}
                                    className="border-t border-white/50 hover:bg-white/30"
                                  >
                                    <td className="p-3">
                                      <div className="flex items-center gap-2">
                                        <div className="p-2 bg-orange-100 rounded-lg">
                                          <Package
                                            size={14}
                                            className="text-orange-600"
                                          />
                                        </div>
                                        <div>
                                          <span className="font-medium">
                                            {material.materialName}
                                          </span>
                                          <p className="text-xs text-gray-500">
                                            Available: {material.maxQuantity}
                                          </p>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="p-3">
                                      <input
                                        type="number"
                                        value={material.quantity}
                                        onChange={(e) =>
                                          handleUpdateMaterial(
                                            index,
                                            "quantity",
                                            e.target.value,
                                          )
                                        }
                                        className="w-24 px-2 py-1 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                        min="0.01"
                                        max={material.maxQuantity}
                                        step="0.01"
                                      />
                                    </td>
                                    <td className="p-3">
                                      <input
                                        type="number"
                                        value={material.lossPerUnit}
                                        onChange={(e) =>
                                          handleUpdateMaterial(
                                            index,
                                            "lossPerUnit",
                                            e.target.value,
                                          )
                                        }
                                        className="w-24 px-2 py-1 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded focus:outline-none focus:ring-2 focus:ring-red-500/30"
                                        min="0"
                                        step="0.01"
                                      />
                                    </td>
                                    <td className="p-3 font-bold text-red-600">
                                      $
                                      {(
                                        material.quantity * material.lossPerUnit
                                      ).toFixed(2)}
                                    </td>
                                    <td className="p-3">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleRemoveMaterial(index)
                                        }
                                        className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors duration-300"
                                        title="Remove"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <div className="p-4 bg-white/50 rounded-xl inline-block mb-4">
                              <AlertCircle
                                size={48}
                                className="text-gray-300"
                              />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-700 mb-2">
                              No Materials Added for Scrapping
                            </h3>
                            <p className="text-gray-600">
                              Search and select materials to add to this scrap
                              record
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Right Column - Summary & Actions */}
            <div className="space-y-6">
              {/* Summary Card */}
              <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <DollarSign size={24} className="text-red-600" />
                  Summary
                </h2>

                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-white/30">
                    <span className="text-gray-600">Source Type</span>
                    <span className="font-semibold capitalize">
                      {formData.fromType}
                    </span>
                  </div>
                  {formData.fromBranchId && (
                    <div className="flex justify-between items-center py-2 border-b border-white/30">
                      <span className="text-gray-600">Source Branch</span>
                      <span className="font-semibold">
                        {getCurrentBranches().find(
                          (b) => b.id == formData.fromBranchId,
                        )?.name || "N/A"}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center py-2 border-b border-white/30">
                    <span className="text-gray-600">Materials Count</span>
                    <span className="font-semibold">
                      {statistics.totalMaterials}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/30">
                    <span className="text-gray-600">Total Units</span>
                    <span className="font-semibold">
                      {statistics.totalUnits}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/30">
                    <span className="text-gray-600">Total Loss</span>
                    <span className="text-xl font-bold text-red-600">
                      ${statistics.totalLoss.toFixed(2)}
                    </span>
                  </div>
                  <div className="pt-4">
                    <div className="p-3 bg-red-50/60 border border-red-200/50 rounded-lg">
                      <p className="text-sm text-red-700">
                        <AlertTriangle size={14} className="inline mr-1" />
                        This loss will be recorded permanently and cannot be
                        recovered.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Card */}
              <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-6">
                  Actions
                </h2>

                <div className="space-y-3">
                  <button
                    type="submit"
                    disabled={
                      submitting ||
                      scrapMaterials.length === 0 ||
                      !formData.fromBranchId ||
                      !formData.reason
                    }
                    className={`w-full px-6 py-3 rounded-xl font-semibold shadow-lg transition-all duration-300 flex items-center justify-center gap-2 ${
                      submitting ||
                      scrapMaterials.length === 0 ||
                      !formData.fromBranchId ||
                      !formData.reason
                        ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                        : "bg-gradient-to-r from-red-500 to-orange-500 text-white hover:from-red-600 hover:to-orange-600 hover:shadow-xl"
                    }`}
                  >
                    {submitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save size={20} />
                        Save Scrap Record
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleCancel}
                    className="w-full px-6 py-3 bg-white/60 text-gray-700 font-medium rounded-xl hover:bg-gray-300/80 transition-all duration-300 border border-white/60"
                  >
                    Cancel
                  </button>
                </div>

                {/* Quick Tips */}
                <div className="mt-6 pt-6 border-t border-white/40">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">
                    Tips:
                  </h3>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li className="flex items-start gap-2">
                      <Check size={12} className="text-green-500 mt-0.5" />
                      <span>
                        Select source location first to view available materials
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check size={12} className="text-green-500 mt-0.5" />
                      <span>Verify quantities before saving</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check size={12} className="text-green-500 mt-0.5" />
                      <span>Loss per unit is typically the unit cost</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMaterialScrapRecord;
