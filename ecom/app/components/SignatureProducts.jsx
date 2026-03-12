'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

const products = [
  {
    id: 1,
    name: 'Cream jam',
    color: 'bg-amber-600', // Warm brown/orange
    image: '/masonary/f1.jpg',
    span: 'row-span-2', // Tall
  },
  {
    id: 2,
    name: 'Apple Shondesh',
    color: 'bg-emerald-600', // Green
    image: '/masonary/f2.jpg',
    span: 'col-span-2', // Wide
  },
  {
    id: 3,
    name: 'Roshgolla',
    color: 'bg-rose-600', // Pink/red
    image: '/masonary/f3.jpg',
    span: 'row-span-1 col-span-1', // Square
  },
  {
    id: 4,
    name: 'Semai Laddu',
    color: 'bg-blue-600', // Blue
    image: '/masonary/f4.jpg',
    span: 'row-span-2 col-span-2', // Large
  },
  {
    id: 5,
    name: 'Black Toast',
    color: 'bg-purple-600', // Purple
    image: '/masonary/f5.jpg',
    span: 'row-span-1 col-span-1', // Square
  },
  {
    id: 14,
    name: 'Deshi sweets',
    color: 'bg-rose-500', // Lighter pink
    image: '/masonary/f3.jpg',
    span: 'row-span-1 col-span-1', // Square
  },
  {
    id: 6,
    name: 'Orange Barfi',
    color: 'bg-amber-700', // Darker brown
    image: '/masonary/f6.jpg',
    span: 'row-span-2', // Tall
  },
  {
    id: 7,
    name: 'Chocolate Barfi',
    color: 'bg-emerald-700', // Darker green
    image: '/masonary/f7.jpg',
    span: 'col-span-2', // Wide
  },
  {
    id: 8,
    name: 'Lal Mohan',
    color: 'bg-rose-700', // Darker pink
    image: '/masonary/f8.jpg',
    span: 'row-span-1 col-span-1', // Square
  },
  {
    id: 9,
    name: 'Tang Toast',
    color: 'bg-blue-700', // Darker blue
    image: '/masonary/f9.jpg',
    span: 'row-span-1 col-span-1', // Square
  },
  {
    id: 10,
    name: 'Madraji golla',
    color: 'bg-amber-500', // Lighter brown
    image: '/masonary/f6.jpg',
    span: 'row-span-1 col-span-1', // Square
  },
  {
    id: 11,
    name: 'Special Sweets',
    color: 'bg-emerald-500', // Lighter green
    image: '/masonary/f2.jpg',
    span: 'row-span-1 col-span-1', // Square
  },
  {
    id: 12,
    name: 'Deshi sweets',
    color: 'bg-rose-500', // Lighter pink
    image: '/masonary/f3.jpg',
    span: 'row-span-1 col-span-1', // Square
  },
];

export default function SignatureProducts() {
  const [hovered, setHovered] = useState(null);

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 py-20 md:px-6">
      <h2 className="text-5xl font-extrabold text-center text-red-900">
        Our Signature Products
      </h2>
      <p className='text-lg text-red-600 text-center mt-4 mb-12'>Explore product collections from our vendors</p>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-auto">
        {products.map((product, index) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.05 }}
            viewport={{ once: true }}
            onMouseEnter={() => setHovered(index)}
            onMouseLeave={() => setHovered(null)}
            className={`group relative overflow-hidden rounded-2xl shadow-lg transition-all duration-300 ease-in-out ${product.span}`}
          >
            {/* Background Image */}
            <motion.img
              src={product.image}
              alt={product.name}
              className={`w-full h-full object-cover transition-all duration-500 ease-in-out ${
                hovered === null
                  ? 'blur-0 scale-100'
                  : hovered === index
                    ? 'blur-0 scale-110'
                    : 'blur-sm scale-100'
              }`}
            />
            
            {/* Dark overlay */}
            <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-opacity duration-300 ${
              hovered === index ? 'opacity-90' : 'opacity-70'
            }`} />
            
            {/* Content - Always visible */}
            <div className="absolute top-0 left-0 right-0 p-4 text-gray-600">
              <div className="flex items-center gap-3 mb-2 bg-white px-3 py-1 rounded-full w-fit">
                {/* Circular color indicator */}
                <div className={`w-4 h-4 rounded-full ${product.color} shadow-lg ring-2 ring-white/50`} />
                
                {/* Product name */}
                <h3 className="text-lg font-semibold tracking-wide">
                  {product.name}
                </h3>
              </div>
              
              {/* Additional info that appears on hover */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ 
                  opacity: hovered === index ? 1 : 0,
                  y: hovered === index ? 0 : 10
                }}
                transition={{ duration: 0.2 }}
                className="text-sm text-gray-200 pl-7"
              >
              </motion.div>
            </div>

            {/* Top right indicator (optional) */}
            <div className={`absolute top-3 right-3 w-2 h-2 rounded-full ${product.color} animate-pulse ring-2 ring-white/50`} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}