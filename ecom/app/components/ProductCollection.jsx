"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { ShoppingCart, Eye } from "lucide-react";
import { api } from '@/lib/api'
import { useCart } from "../context/CartContext";

const ADMIN_PANEL_URL = 'http://localhost:3001'

const getImageUrl = (imagePath) => {
  if (!imagePath) return '/products/test.jpg';
  
  // If it's already a full URL
  if (imagePath.startsWith('http')) return imagePath;
  
  // If it starts with /uploads
  if (imagePath.startsWith('/uploads')) {
    return `${ADMIN_PANEL_URL}${imagePath}`;
  }
  
  // Default case - add /uploads/ prefix
  return `${ADMIN_PANEL_URL}/uploads/${imagePath}`;
};

const categories = ["TOP_RATED", "FEATURED", "PREMIUM"];

const formatCategoryName = (category) => {
  return category.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
};

export default function ProductCollection() {
  const [activeCategory, setActiveCategory] = useState("TOP_RATED");
  const [hoveredProduct, setHoveredProduct] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { addToCart } = useCart()

  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      try {
        const data = await api.getCollectionByType(activeCategory, 12);
        setProducts(data);
        setError(null);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching products:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, [activeCategory]);

  const handleAddToCart = (product, e) => {
  e.stopPropagation()
  addToCart(product, 1)
  };

  const handleViewDetails = (product, e) => {
    e.stopPropagation();
    console.log("View details:", product);
  };
  
  
  if (loading) {
    return (
      <section className="max-w-7xl mx-auto py-16 px-6 lg:px-20">
        {/* ... loading skeleton (keep as is) ... */}
      </section>
    );
  }

  if (error) {
    return (
      <section className="max-w-7xl mx-auto py-16 px-6 lg:px-20">
        <div className="text-center text-red-500 bg-red-50 p-8 rounded-2xl">
          <h3 className="text-xl font-bold mb-2">Failed to load products</h3>
          <p>{error}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-7xl mx-auto py-16 px-6 lg:px-20 bg-transparent">
      {/* Header Section - keep as is */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-12">
        <div>
          <h2 className="text-4xl font-bold text-red-700 mb-4 relative inline-block">
            Our Product Collection
            <span className="absolute bottom-0 left-0 w-1/3 h-1 bg-red-500 rounded-full"></span>
          </h2>
          <p className="text-gray-600 max-w-md leading-relaxed">
            Handcrafted with passion and the finest ingredients.
            Each creation tells a story of tradition, quality,
            and culinary artistry.
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="mt-6 lg:mt-0 bg-white rounded-full shadow-md p-1.5 flex gap-1.5 border border-gray-100">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300
                ${
                  activeCategory === cat
                    ? "bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg shadow-red-500/30"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
            >
              {formatCategoryName(cat)}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      {products.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-2xl">
          <p className="text-gray-500">No products found in this collection</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-8">
          {products.map((collection) => {
            const product = collection.product;
            if (!product) return null;

            return (
              <div
                key={collection.id}
                className="group bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 relative"
                onMouseEnter={() => setHoveredProduct(collection.id)}
                onMouseLeave={() => setHoveredProduct(null)}
              >
                {/* Image Container */}
                <div className="relative h-64 w-full overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
                  {product.image ? (
                    <Image
                      src={getImageUrl(product.image)}
                      alt={product.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                      onError={(e) => {
                        console.error('Image failed to load:', {
                          product: product.name,
                          attemptedUrl: getImageUrl(product.image)
                        });
                        e.target.src = '/products/test.jpg';
                      }}
                      unoptimized // Add this if images are from external domain
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      No Image
                    </div>
                  )}
                  
                  {/* Discount Badge */}
                  {product.wholesale_price && product.sale_price && product.wholesale_price > product.sale_price && (
                    <div className="absolute top-4 left-4 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                      -{Math.round(((product.wholesale_price - product.sale_price) / product.wholesale_price) * 100)}%
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-5 relative bg-white">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2 group-hover:text-red-600 transition-colors">
                    {product.name}
                  </h3>

                  {product.unit && (
                    <p className="text-sm text-gray-500 mb-2 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                      Unit: {product.unit}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <p className="text-2xl font-bold text-red-600">
                      {product.sale_price || product.wholesale_price || 0}.00 <span className="text-sm">৳</span>
                    </p>
                    
                    {product.category && (
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-600">
                        {product.category.name || 'Uncategorized'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Sliding Action Buttons */}
                <div 
                  className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent pt-8 pb-4 px-5 transform transition-transform duration-500 ease-out ${
                    hoveredProduct === collection.id ? "translate-y-0" : "translate-y-full"
                  }`}
                >
                  <div className="flex gap-3">
                    <button
                      onClick={(e) => handleAddToCart(product, e)}
                      className="flex-1 bg-gradient-to-r from-red-600 to-red-500 text-white py-3 px-4 rounded-xl font-medium text-sm hover:shadow-lg hover:shadow-red-500/30 transition-all duration-300 flex items-center justify-center gap-2 group/add"
                    >
                      <ShoppingCart size={18} className="group-hover/add:rotate-12 transition-transform" />
                      Add to Cart
                    </button>
                    
                    <button
                      onClick={(e) => handleViewDetails(product, e)}
                      className="bg-gray-100 text-gray-700 p-3 rounded-xl hover:bg-gray-200 hover:text-gray-900 transition-all duration-300 hover:scale-110"
                      title="View Details"
                    >
                      <Eye size={18} />
                    </button>
                  </div>
                </div>

                {/* Quick View Indicator */}
                <div className={`absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-lg transform transition-all duration-300 ${
                  hoveredProduct === collection.id ? "scale-100 opacity-100" : "scale-0 opacity-0"
                }`}>
                  <Eye size={16} className="text-gray-700" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View All Button */}
      <div className="text-center mt-16">
        <button className="bg-white text-red-600 border-2 border-red-600 px-10 py-4 rounded-full font-semibold hover:bg-red-600 hover:text-white transition-all duration-300 hover:shadow-xl hover:shadow-red-500/30">
          View All Products
        </button>
      </div>
    </section>
  );
}