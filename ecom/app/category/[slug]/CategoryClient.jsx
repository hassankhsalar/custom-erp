// app/category/[slug]/CategoryClient.jsx
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ShoppingCart, Eye } from "lucide-react";
import { api } from '@/lib/api'
import { useCart } from "@/app/context/CartContext";

const ADMIN_PANEL_URL = 'http://localhost:3001'

const getImageUrl = (imagePath) => {
  if (!imagePath) return '/categories/test.jpg'
  if (imagePath.startsWith('http')) return imagePath
  if (imagePath.startsWith('/uploads')) {
    return `${ADMIN_PANEL_URL}${imagePath}`
  }
  return `${ADMIN_PANEL_URL}/uploads/${imagePath}`
}

export default function CategoryClient({ categoryName, slug }) {
  const [products, setProducts] = useState([])
  const [category, setCategory] = useState(null)
  const [loading, setLoading] = useState(true)
  const { addToCart } = useCart()
  const [hoveredProduct, setHoveredProduct] = useState(null)
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    totalCount: 0
  })

  const handleAddToCart = (product, e) => {
  e.stopPropagation()
  addToCart(product, 1)
}

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        // Fetch category details first (if needed for image)
        const categories = await api.getFoodCategories()
        const foundCategory = categories.find(c => c.name === categoryName)
        setCategory(foundCategory || { name: categoryName })

        // Fetch products for this category
        const response = await api.getProductsByCategory(categoryName, pagination.page, 20)
        setProducts(response.products || [])
        setPagination({
          page: response.currentPage,
          totalPages: response.totalPages,
          totalCount: response.totalCount
        })
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [categoryName, pagination.page])

  const displayCategory = category || { name: categoryName }

  if (loading && products.length === 0) {
    return (
      <div className="max-w-7xl mx-auto py-16 px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-2xl h-80 animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-transparent py-16 px-6 lg:px-20">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center gap-12">
            {/* Left - Category Image */}
            <div className="w-full md:w-1/2 relative">
              <div className="relative h-[400px] md:h-[500px] w-full rounded-3xl overflow-hidden shadow-2xl">
                {displayCategory.image ? (
                  <Image
                    src={getImageUrl(displayCategory.image)}
                    alt={displayCategory.name}
                    fill
                    className="object-cover hover:scale-105 transition-transform duration-700"
                    priority
                    onError={(e) => {
                      e.target.src = '/categories/ss.jpg'
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-red-100 to-amber-100 flex items-center justify-center">
                    <span className="text-4xl text-red-600 font-bold">{displayCategory.name}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-red-900/20 to-transparent"></div>
              </div>
            </div>

            {/* Right - Content */}
            <div className="w-full md:w-1/2 space-y-6">
              <div>
                <p className="text-red-600 font-semibold tracking-wider mb-2 uppercase">
                  {displayCategory.name} Collection
                </p>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                  {displayCategory.name}
                </h1>
              </div>
              
              <p className="text-lg text-gray-600 leading-relaxed">
                Explore our exclusive collection of {displayCategory.name}. Each product is crafted with premium ingredients 
                and traditional recipes to bring you the authentic taste of quality.
              </p>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold text-red-600">{pagination.totalCount}</span>
                  <span className="text-gray-600">Products Available</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Products Grid Section */}
      <section className="max-w-7xl mx-auto py-16 px-6 lg:px-20 bg-transparent">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-12">
          <div>
            <h2 className="text-4xl font-bold text-red-900 mb-4 relative inline-block">
              {displayCategory.name} Collection
              <span className="absolute top-12 left-0 w-1/3 h-1 bg-red-500 rounded-full"></span>
            </h2>
            <p className="text-gray-600 max-w-md leading-relaxed">
              Discover our handpicked selection of premium {displayCategory.name.toLowerCase()} products.
            </p>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-2xl">
            <p className="text-gray-500 text-lg">No products found in this category</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="group bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 relative"
                  onMouseEnter={() => setHoveredProduct(product.id)}
                  onMouseLeave={() => setHoveredProduct(null)}
                >
                  {/* Image Container */}
                  <div className="relative h-64 w-full overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
                    {product.image ? (
                      <Image
                        src={getImageUrl(product.image)}
                        alt={product.name}
                        fill
                        className="object-cover rounded-b-2xl group-hover:scale-110 transition-transform duration-700 ease-out"
                        onError={(e) => {
                          e.target.src = '/categories/test.jpg'
                        }}
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        No Image
                      </div>
                    )}
                    
                    <div className={`absolute top-4 left-4 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg ${
                      product.stock > 0 ? 'bg-green-500' : 'bg-red-500'
                    }`}>
                      {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5 relative bg-white">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2 group-hover:text-red-600 transition-colors">
                      {product.name}
                    </h3>

                    <p className="text-sm text-gray-500 mb-2 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                      Unit: {product.unit || 'N/A'}
                    </p>

                    <div className="flex items-center justify-between">
                      <p className="text-2xl font-bold text-red-600">
                        {product.sale_price || product.wholesale_price || 0}.00 <span className="text-sm">৳</span>
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div 
                    className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent pt-8 pb-4 px-5 transform transition-transform duration-500 ease-out ${
                      hoveredProduct === product.id ? "translate-y-0" : "translate-y-full"
                    }`}
                  >
                    <div className="flex gap-3">
                      <button
                        onClick={(e) => handleAddToCart(product, e)}
                        disabled={product.stock <= 0}
                        className={`flex-1 py-3 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all duration-300 ${
                          product.stock > 0 
                            ? 'bg-gradient-to-r from-red-600 to-red-500 text-white hover:shadow-lg hover:shadow-red-500/30' 
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        <ShoppingCart size={18} />
                        {product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
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
                </div>
              ))}
            </div>

            {/* Load More Button */}
            {pagination.page < pagination.totalPages && (
              <div className="text-center mt-16">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  className="bg-white text-red-600 border-2 border-red-600 px-10 py-4 rounded-full font-semibold hover:bg-red-600 hover:text-white transition-all duration-300 hover:shadow-xl hover:shadow-red-500/30"
                >
                  Load More Products ({pagination.totalCount - products.length} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}