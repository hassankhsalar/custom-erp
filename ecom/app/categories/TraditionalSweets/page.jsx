"use client";
import { useState } from "react";
import Image from "next/image";
import { ShoppingCart, Eye } from "lucide-react";

const categories = ["All", "Premium", "Seasonal", "Traditional"];

const specialSweets = [
  {
    id: 1,
    name: "Royal Sandesh",
    category: "Premium",
    weight: "500 g",
    price: 1250,
    image: "/categories/sh.jpg",
  },
  {
    id: 2,
    name: "Kesar Peda",
    category: "Premium",
    weight: "400 g",
    price: 980,
    image: "/categories/am.jpg",
  },
  {
    id: 3,
    name: "Mango Sandesh",
    category: "Seasonal",
    weight: "6 Pcs",
    price: 650,
    image: "/categories/ld.webp",
  },
  {
    id: 4,
    name: "Roshogolla",
    category: "Traditional",
    weight: "12 Pcs",
    price: 450,
    image: "/categories/ss.jpg",
  },
  {
    id: 5,
    name: "Kalakand",
    category: "Traditional",
    weight: "500 g",
    price: 720,
    image: "/categories/sh.jpg",
  },
  {
    id: 6,
    name: "Chomchom",
    category: "Traditional",
    weight: "6 Pcs",
    price: 380,
    image: "/categories/shnd.jpg",
  },
  {
    id: 7,
    name: "Pista Roll",
    category: "Premium",
    weight: "400 g",
    price: 1150,
    image: "/categories/ss.jpg",
  },
  {
    id: 8,
    name: "Special Mishti Doi",
    category: "Seasonal",
    weight: "500 ml",
    price: 290,
    image: "/categories/doi.jpg",
  },
];

export default function TraditionalSweets() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [hoveredProduct, setHoveredProduct] = useState(null);

  const filteredProducts = specialSweets.filter(
    (product) => activeCategory === "All" || product.category === activeCategory
  );

  const handleAddToCart = (product, e) => {
    e.stopPropagation();
    console.log("Added to cart:", product);
  };

  const handleViewDetails = (product, e) => {
    e.stopPropagation();
    console.log("View details:", product);
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-transparent py-16 px-6 lg:px-20">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center gap-12">
            {/* Left - Image */}
            <div className="w-full md:w-1/2 relative">
              <div className="relative h-[400px] md:h-[500px] w-full rounded-3xl overflow-hidden shadow-2xl">
                <Image
                  src="/categories/ss.jpg"
                  alt="Special Sweets Collection"
                  fill
                  className="object-cover hover:scale-105 transition-transform duration-700"
                  priority
                />
                {/* Decorative elements */}
                <div className="absolute inset-0 bg-gradient-to-t from-red-900/20 to-transparent"></div>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-red-500/20 rounded-full blur-3xl"></div>
                <div className="absolute -top-4 -left-4 w-32 h-32 bg-amber-500/20 rounded-full blur-3xl"></div>
              </div>
            </div>

            {/* Right - Content */}
            <div className="w-full md:w-1/2 space-y-6">
              <div>
                <p className="text-red-600 font-semibold tracking-wider mb-2">SPECIAL COLLECTION</p>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                  Exquisite <span className="text-red-600">Special Sweets</span> for Every Occasion
                </h1>
              </div>
              
              <p className="text-lg text-gray-600 leading-relaxed">
                Discover our handcrafted special sweets made with premium ingredients and traditional recipes. Each piece is a masterpiece of flavor and artistry, perfect for celebrations and special moments.
              </p>

            </div>
          </div>
        </div>
      </section>

      {/* Products Grid Section */}
      <section className="max-w-7xl mx-auto py-16 px-6 lg:px-20 bg-transparent">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-12">
          <div>
            <h2 className="text-4xl font-bold text-red-700 mb-4 relative inline-block">
              Our Special Collection
              <span className="absolute bottom-0 left-0 w-1/3 h-1 bg-red-500 rounded-full"></span>
            </h2>
            <p className="text-gray-600 max-w-md leading-relaxed">
              Explore our exclusive range of special sweets crafted for those who appreciate the finest things in life.
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
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-8">
          {filteredProducts.slice(0, 12).map((product) => (
            <div
              key={product.id}
              className="group bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 relative"
              onMouseEnter={() => setHoveredProduct(product.id)}
              onMouseLeave={() => setHoveredProduct(null)}
            >
              {/* Image Container */}
              <div className="relative h-64 w-full overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-contain p-6 group-hover:scale-110 transition-transform duration-700 ease-out"
                />
                
                {/* Special Badge */}
                <div className="absolute top-4 left-4 bg-gradient-to-r from-amber-500 to-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                  Special
                </div>
              </div>

              {/* Content */}
              <div className="p-5 relative bg-white">
                <h3 className="text-lg font-semibold text-gray-800 mb-2 group-hover:text-red-600 transition-colors">
                  {product.name}
                </h3>

                <p className="text-sm text-gray-500 mb-2 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                  Weight: {product.weight}
                </p>

                <div className="flex items-center justify-between">
                  <p className="text-2xl font-bold text-red-600">
                    {product.price}.00 <span className="text-sm">৳</span>
                  </p>
                  
                  {/* Rating Stars */}
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map((star) => (
                      <svg key={star} className="w-4 h-4 fill-yellow-400 text-yellow-400" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sliding Action Buttons */}
              <div 
                className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent pt-8 pb-4 px-5 transform transition-transform duration-500 ease-out ${
                  hoveredProduct === product.id ? "translate-y-0" : "translate-y-full"
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
                hoveredProduct === product.id ? "scale-100 opacity-100" : "scale-0 opacity-0"
              }`}>
                <Eye size={16} className="text-gray-700" />
              </div>
            </div>
          ))}
        </div>

        {/* Load More Button */}
        <div className="text-center mt-16">
          <button className="bg-white text-red-600 border-2 border-red-600 px-10 py-4 rounded-full font-semibold hover:bg-red-600 hover:text-white transition-all duration-300 hover:shadow-xl hover:shadow-red-500/30">
            Load More Special Sweets
          </button>
        </div>
      </section>
    </div>
  );
}