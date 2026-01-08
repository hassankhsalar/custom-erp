import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API_ROUTES } from '../../config';
import { Pen, Trash2 } from 'lucide-react';

const AllProducts = () => {
  const [products, setProducts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [expandedProductId, setExpandedProductId] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get(API_ROUTES.PRODUCTS, {
          params: { page: currentPage, limit: itemsPerPage },
        });
        setProducts(response.data.products);
        setTotalPages(Math.ceil(response.data.totalCount / itemsPerPage));
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    };
    fetchProducts();
  }, [currentPage, itemsPerPage]);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await axios.delete(`${API_ROUTES.PRODUCTS}/${id}`);
        // Refetch products for the current page
        const response = await axios.get(API_ROUTES.PRODUCTS, {
          params: { page: currentPage, limit: itemsPerPage },
        });
        setProducts(response.data.products);
        setTotalPages(Math.ceil(response.data.totalCount / itemsPerPage));
      } catch (error) {
        console.error('Error deleting product:', error);
      }
    }
  };

  const toggleMaterials = (id) => {
    setExpandedProductId(expandedProductId === id ? null : id);
  };

  const paginate = pageNumber => setCurrentPage(pageNumber);

  const getStockStatus = (stock) => {
    if (stock <= 0) return { text: 'Out of Stock', color: 'bg-red-100 text-red-800 border-red-200' };
    if (stock <= 10) return { text: 'Low Stock', color: 'bg-amber-100 text-amber-800 border-amber-200' };
    return { text: 'In Stock', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
  };

  return (
    <div className="container mx-auto p-4 min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="backdrop-blur-lg bg-white/70 rounded-2xl shadow-2xl p-6 border border-white/30">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              All Products
            </h2>
            <p className="text-gray-600 mt-2">Manage your product inventory and details</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600 bg-white/50 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/40">
              Page {currentPage} of {totalPages}
            </div>
            <Link 
              to="/products/create" 
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2.5 rounded-lg font-medium transition-all duration-200 hover:shadow-lg backdrop-blur-sm"
            >
              + New Product
            </Link>
          </div>
        </div>

        {/* Products Table */}
        <div className="backdrop-blur-sm bg-white/50 rounded-xl overflow-hidden border border-white/40 shadow-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gradient-to-r from-gray-800 to-gray-700 text-white">
                <tr>
                  <th className="py-4 px-6 text-left font-medium text-sm uppercase tracking-wider">Product Details</th>
                  <th className="py-4 px-6 text-left font-medium text-sm uppercase tracking-wider">Sale Price</th>
                  <th className="py-4 px-6 text-left font-medium text-sm uppercase tracking-wider">Wholesale Price</th>
                  <th className="py-4 px-6 text-left font-medium text-sm uppercase tracking-wider">Cost</th>
                  <th className="py-4 px-6 text-left font-medium text-sm uppercase tracking-wider">Stock</th>
                  <th className="py-4 px-6 text-left font-medium text-sm uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/50">
                {products.map((product, index) => {
                  const stockStatus = getStockStatus(product.stock);
                  return (
                    <React.Fragment key={product.id}>
                      <tr className={`${index % 2 === 0 ? 'bg-gray-50/30' : 'bg-white/30'} hover:bg-gray-100/50 transition-colors duration-150`}>
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-3">
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-900">{product.name}</h3>
                            </div>
                            <button 
                              onClick={() => toggleMaterials(product.id)}
                              className="flex-shrink-0 bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 hover:text-blue-800 text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-200 backdrop-blur-sm border border-blue-200/50"
                            >
                              {expandedProductId === product.id ? '▲ Hide Materials' : '▼ Show Materials'}
                            </button>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-semibold text-gray-900">${parseFloat(product.sale_price).toFixed(2)}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-semibold text-gray-900">${parseFloat(product.wholesale_price).toFixed(2)}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-semibold text-gray-900">${parseFloat(product.cost).toFixed(2)}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex flex-col space-y-1">
                            <div className="font-semibold text-gray-900">{product.stock}</div>
                            <span className={`text-xs px-2 py-1 rounded-full border ${stockStatus.color} inline-block w-fit backdrop-blur-sm`}>
                              {stockStatus.text}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex space-x-3">
                            <Link 
                              to={`/products/edit/${product.id}`}
                              className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 hover:text-amber-800 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 backdrop-blur-sm border border-amber-200/50"
                            >
                              <Pen/>
                            </Link>
                            <button 
                              onClick={() => handleDelete(product.id)}
                              className="bg-red-500/10 hover:bg-red-500/20 text-red-700 hover:text-red-800 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 backdrop-blur-sm border border-red-200/50"
                            >
                              <Trash2/>
                            </button>
                          </div>
                        </td>
                      </tr>
                      
                      {/* Expanded Materials Section */}
                      {expandedProductId === product.id && (
                        <tr className="bg-blue-50/30 border-t border-blue-100/50">
                          <td colSpan="6" className="py-6 px-6">
                            <div className="backdrop-blur-sm bg-white/50 rounded-lg p-4 border border-white/40">
                              <h4 className="font-medium text-gray-800 mb-3 flex items-center">
                                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                                Materials ({product.materials.length})
                              </h4>
                              <div className="overflow-x-auto">
                                <table className="min-w-full bg-white/80 backdrop-blur-sm rounded-lg overflow-hidden">
                                  <thead className="bg-gray-100/80">
                                    <tr>
                                      <th className="py-3 px-4 text-left text-sm font-medium text-gray-700">Material Name</th>
                                      <th className="py-3 px-4 text-left text-sm font-medium text-gray-700">Quantity</th>
                                      <th className="py-3 px-4 text-left text-sm font-medium text-gray-700">Price</th>
                                      <th className="py-3 px-4 text-left text-sm font-medium text-gray-700">Total</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-200/50">
                                    {product.materials.map(mat => (
                                      <tr key={mat.material_id} className="hover:bg-gray-50/50 transition-colors duration-150">
                                        <td className="py-3 px-4">
                                          <div className="flex items-center space-x-2">
                                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                            <span className="text-gray-800">{mat.material.name}</span>
                                          </div>
                                        </td>
                                        <td className="py-3 px-4">
                                          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded-full">
                                            {mat.material_quantity}
                                          </span>
                                        </td>
                                        <td className="py-3 px-4 font-medium text-gray-900">
                                          ${parseFloat(mat.price).toFixed(2)}
                                        </td>
                                        <td className="py-3 px-4 font-semibold text-gray-900">
                                          ${(parseFloat(mat.price) * parseFloat(mat.material_quantity)).toFixed(2)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex justify-center">
            <nav className="backdrop-blur-sm bg-white/50 rounded-lg p-2 border border-white/40">
              <ul className="inline-flex items-center -space-x-px">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <li key={page}>
                    <button
                      onClick={() => paginate(page)}
                      className={`py-2.5 px-4 leading-tight font-medium transition-all duration-200 backdrop-blur-sm border ${
                        currentPage === page 
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white border-blue-500 shadow-lg' 
                          : 'bg-white/80 text-gray-700 hover:text-gray-900 hover:bg-gray-100/80 border-gray-300/50 hover:border-gray-400/50'
                      } hover:shadow-md first:rounded-l-lg last:rounded-r-lg`}
                    >
                      {page}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        )}

        {/* Empty State */}
        {products.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-blue-100 to-blue-200 mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Products Found</h3>
            <p className="text-gray-600 mb-4">Get started by creating your first product</p>
            <Link 
              to="/products/create" 
              className="inline-flex items-center bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2.5 rounded-lg font-medium transition-all duration-200 hover:shadow-lg backdrop-blur-sm"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create Product
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllProducts;