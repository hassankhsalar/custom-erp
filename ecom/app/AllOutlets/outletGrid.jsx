"use client";

import Image from "next/image";
import { MapPin, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import { api } from '@/lib/api'

const ADMIN_PANEL_URL = 'http://localhost:3001'

// Helper function for image URL (same as other components)
const getImageUrl = (imagePath) => {
  if (!imagePath) return '/outlet.jpg'; // Fallback image
  
  if (imagePath.startsWith('http')) return imagePath;
  
  if (imagePath.startsWith('/uploads')) {
    return `${ADMIN_PANEL_URL}${imagePath}`;
  }
  
  return `${ADMIN_PANEL_URL}/uploads/${imagePath}`;
};

export default function OutletGrid() {
  const [outlets, setOutlets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchOutlets() {
      try {
        const response = await api.getAllOutlets();
        console.log('Fetched outlets:', response); // Debug log
        
        // Handle both paginated and non-paginated responses
        const outletsData = response.outlets || response;
        setOutlets(outletsData);
      } catch (err) {
        console.error('Error fetching outlets:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchOutlets();
  }, []);

  // Loading state
  if (loading) {
    return (
      <section className="py-16 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-semibold text-center text-gray-800 mb-12">
            Our Outlets
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-xl h-96 animate-pulse"></div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Error state
  if (error) {
    return (
      <section className="py-16 px-4 bg-white">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-red-500">Failed to load outlets: {error}</p>
        </div>
      </section>
    );
  }

  // If no outlets, show message
  if (outlets.length === 0) {
    return (
      <section className="py-16 px-4 bg-white">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl font-semibold text-gray-800 mb-4">Our Outlets</h2>
          <p className="text-gray-600">No outlets available at the moment.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-4xl font-semibold text-center text-gray-800 mb-12">
          Our Outlets
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {outlets.map((outlet) => {
            // Split name for Bengali and English if needed
            // You might store both in separate fields or handle differently
            const nameBangla = outlet.name; // Assuming name is stored in Bengali
            const nameEnglish = outlet.nameEn || outlet.name; // Fallback to name if no English version

            return (
              <div
                key={outlet.id}
                className="group bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100"
              >
                <div className="relative h-64 overflow-hidden">
                  {outlet.image ? (
                    <Image
                      src={getImageUrl(outlet.image)}
                      alt={nameEnglish}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        e.target.src = '/outlet.jpg';
                      }}
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-400">No Image</span>
                    </div>
                  )}
                </div>

                <div className="p-6">
                  <h3 className="bengali-text text-2xl font-bold text-gray-800 mb-2">
                    {outlet.name}
                  </h3>
                  <p className="bengali-text text-gray-600 mb-3 leading-relaxed">
                    {outlet.address}
                  </p>
                  <p className="bengali-text text-[#b21a17] font-semibold text-lg mb-4">
                    মোবাইলঃ {outlet.mobile}
                  </p>

                  {outlet.googleMapLink && (
                    <a
                      href={outlet.googleMapLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-gray-700 hover:text-[#b21a17] transition-colors font-medium group/link"
                    >
                      <MapPin className="w-5 h-5" />
                      <span>See in Google Map</span>
                      <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}