"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { api } from '@/lib/api'

const ADMIN_PANEL_URL = 'http://localhost:3001'

// Helper function for image URL - exactly as in your admin panel
const getImageUrl = (imagePath) => {
  console.log('Original image path from DB:', imagePath); // Debug log
  
  if (!imagePath) {
    console.log('No image path, using fallback');
    return '/cat1.jpg'; // Fallback image
  }
  
  // If it's already a full URL
  if (imagePath.startsWith('http')) {
    console.log('Image is full URL:', imagePath);
    return imagePath;
  }
  
  // If it starts with /uploads
  if (imagePath.startsWith('/uploads')) {
    const finalUrl = `${ADMIN_PANEL_URL}${imagePath}`;
    console.log('Image with /uploads prefix:', finalUrl);
    return finalUrl;
  }
  
  // Default case - add /uploads/ prefix
  const finalUrl = `${ADMIN_PANEL_URL}/uploads/${imagePath}`;
  console.log('Image with added /uploads/:', finalUrl);
  return finalUrl;
};

const createSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^\u0980-\u09FF\w\s-]/g, '') // Allow Bengali characters
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim();
};

export default function Categories() {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const data = await api.getFoodCategories();
        // Store both original name and slug
        const categoriesWithSlugs = data.map(cat => ({
          ...cat,
          slug: createSlug(cat.name)
        }));
        setCategories(categoriesWithSlugs);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching categories:', err);
        setLoading(false);
      }
    }
    fetchCategories();
  }, []);

  const handleNavigation = (slug, originalName) => {
    // Pass both slug and original name
    router.push(`/category/${slug}?name=${encodeURIComponent(originalName)}`);
  };

  if (loading) {
    return (
      <section className="py-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/arabesque.png')]"></div>
        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-5xl font-extrabold text-red-900">Our Categories</h2>
          <div className="w-16 h-1 bg-gradient-to-r from-red-900 to-red-600 mx-auto mt-3 mb-4 rounded-full"></div>
          <p className="text-gray-400 text-xl font-medium mb-12">
            Loading categories...
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="relative w-42 h-42 rounded-full bg-gray-200 animate-pulse"></div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/arabesque.png')]"></div>
        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-5xl font-extrabold text-red-900">Our Categories</h2>
          <div className="w-16 h-1 bg-gradient-to-r from-red-900 to-red-600 mx-auto mt-3 mb-4 rounded-full"></div>
          <p className="text-red-500 text-xl font-medium mb-12">
            Failed to load categories: {error}
          </p>
        </div>
      </section>
    );
  }

  if (categories.length === 0) {
    return (
      <section className="py-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/arabesque.png')]"></div>
        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-5xl font-extrabold text-red-900">Our Categories</h2>
          <div className="w-16 h-1 bg-gradient-to-r from-red-900 to-red-600 mx-auto mt-3 mb-4 rounded-full"></div>
          <p className="text-gray-400 text-xl font-medium mb-12">
            No categories available at the moment
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/arabesque.png')]"></div>

      <div className="relative max-w-7xl mx-auto px-6 text-center">
        <h2 className="text-5xl font-extrabold text-red-900">Our Categories</h2>
        <div className="w-16 h-1 bg-gradient-to-r from-red-900 to-red-600 mx-auto mt-3 mb-4 rounded-full"></div>
        <p className="text-gray-400 text-xl font-medium mb-12">
          Explore our premium collection of handcrafted sweets and desserts
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-8">
          {categories.map((category) => {
            const slug = createSlug(category.name);
            const imageUrl = getImageUrl(category.image);
            
            return (
              <div
                key={category.id}
                onClick={() => handleNavigation(category.slug, category.name)}
                className="relative w-42 h-42 rounded-full overflow-hidden cursor-pointer group transition-all duration-300 hover:ring-4 hover:ring-red-700 hover:ring-offset-1 ring-4 ring-gray-200 ring-offset-1"
              >
                {category.image ? (
                  <div className="relative w-full h-full">
                    <Image
                      src={imageUrl}
                      alt={category.name}
                      width={268}
                      height={268}
                      className="w-full h-full object-cover group-hover:scale-120 transition duration-500"
                      onError={(e) => {
                        console.error('Image failed to load:', {
                          category: category.name,
                          originalPath: category.image,
                          attemptedUrl: imageUrl
                        });
                        e.target.src = '/cat1.jpg';
                      }}
                      onLoad={() => {
                        console.log('Image loaded successfully:', {
                          category: category.name,
                          url: imageUrl
                        });
                      }}
                      unoptimized // Add this for external images
                    />
                  </div>
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-400 text-sm">No Image</span>
                  </div>
                )}

                <div className="absolute inset-0 bg-black/20 flex flex-col items-center justify-center rounded-full group-hover:bg-black/30 transition-all duration-300">
                  <p className="text-white text-lg font-semibold">
                    {category.name}
                  </p>
                  <p className="text-white text-lg font-medium mt-1 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                    5 items
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}