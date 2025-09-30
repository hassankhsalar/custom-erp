import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API_ROUTES } from '../../config';

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

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">All Products</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-800 text-white">
            <tr>
              <th className="py-3 px-4 uppercase font-semibold text-sm">Product Details</th>
              <th className="py-3 px-4 uppercase font-semibold text-sm">Sale Price</th>
              <th className="py-3 px-4 uppercase font-semibold text-sm">Wholesale Price</th>
              <th className="py-3 px-4 uppercase font-semibold text-sm">Cost</th>
              <th className="py-3 px-4 uppercase font-semibold text-sm">Stock</th>
              <th className="py-3 px-4 uppercase font-semibold text-sm">Actions</th>
            </tr>
          </thead>
          <tbody className="text-gray-700">
            {products.map((product, index) => (
              <React.Fragment key={product.id}>
                <tr className={`${index % 2 === 0 ? 'bg-gray-200' : ''}`}>
                  <td className="py-3 px-4">
                    <strong>{product.name}</strong>
                    <br />
                    <button onClick={() => toggleMaterials(product.id)} className="text-blue-500 text-xs hover:underline mr-2 cursor-pointer">
                      {expandedProductId === product.id ? 'Hide' : 'Show'} Materials
                    </button>
                  </td>
                  <td className="py-3 px-4 text-center">{product.sale_price}</td>
                  <td className="py-3 px-4 text-center">{product.wholesale_price}</td>
                  <td className="py-3 px-4 text-center">{product.cost}</td>
                  <td className="py-3 px-4 text-center">{product.stock}</td>
                  <td className="py-3 px-4 text-center">
                    <Link to={`/products/edit/${product.id}`} className="text-blue-500 hover:underline mr-4 cursor-pointer">Edit</Link>
                    <button onClick={() => handleDelete(product.id)} className="text-red-500 hover:underline cursor-pointer">Delete</button>
                  </td>
                </tr>
                {expandedProductId === product.id && (
                  <tr className={`${index % 2 === 0 ? 'bg-gray-200' : ''}`}>
                    <td colSpan="6" className="py-3 px-4">
                        <table className="min-w-full bg-white">
                          <tbody>
                            {product.materials.map(mat => (
                              <tr key={mat.material_id}>
                                <td className="border border-gray-300 border border-gray-300-gray-300 text-sm p-2">{mat.material.name}</td>
                                <td className="border border-gray-300 border border-gray-300-gray-300 text-sm p-2">Qty: <span>{mat.material_quantity}</span></td>
                                <td className="border border-gray-300 border border-gray-300-gray-300 text-sm p-2"> {mat.price}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex justify-center">
        <nav>
          <ul className="inline-flex items-center -space-x-px">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <li key={page}>
                <button
                  onClick={() => paginate(page)}
                  className={`py-2 px-3 leading-tight ${currentPage === page ? 'bg-blue-500 text-white' : 'bg-white text-gray-500'} border border-gray-300 border border-gray-300-gray-300 hover:bg-gray-100 hover:text-gray-700`}
                >
                  {page}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
};

export default AllProducts;
