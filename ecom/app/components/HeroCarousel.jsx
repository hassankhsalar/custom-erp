"use client";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { api } from '@/lib/api'

const ADMIN_PANEL_URL = 'http://localhost:3001'

export default function HeroCarousel() {
  const [banners, setBanners] = useState([])
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch banners from API
  useEffect(() => {
    async function fetchBanners() {
      try {
        const data = await api.getHomeBanners()
        setBanners(data)
        setLoading(false)
      } catch (err) {
        setError(err.message)
        setLoading(false)
      }
    }
    
    fetchBanners()
  }, [])

  // Auto Slide
  useEffect(() => {
    if (banners.length === 0) return
    
    const interval = setInterval(() => {
      setCurrent((prev) => (prev === banners.length - 1 ? 0 : prev + 1));
    }, 5000);
    return () => clearInterval(interval);
  }, [banners.length]);

  const prevSlide = () => {
    setCurrent(current === 0 ? banners.length - 1 : current - 1);
  };

  const nextSlide = () => {
    setCurrent(current === banners.length - 1 ? 0 : current + 1);
  };

  // Loading state
  if (loading) {
    return (
      <div className="relative w-full max-w-7xl mx-auto h-[500px] rounded-3xl overflow-hidden shadow-2xl bg-gray-100 animate-pulse">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-gray-400">Loading banners...</div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="relative w-full max-w-7xl mx-auto h-[500px] rounded-3xl overflow-hidden shadow-2xl bg-red-50">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-red-500">Failed to load banners: {error}</div>
        </div>
      </div>
    )
  }

  // No banners state - show fallback or hide
  if (banners.length === 0) {
    return null // Or you can show a default banner
  }

  return (
    <div className="relative w-full max-w-7xl mx-auto h-[500px] rounded-3xl overflow-hidden shadow-2xl">
      {banners.map((banner, index) => (
        <div
          key={banner.id}
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
            index === current ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
        >
          {/* Single div with background image and overlay */}
          <div
            className="relative w-full h-full bg-cover bg-center"
            style={{
              backgroundImage: `url(${ADMIN_PANEL_URL}${banner.image || ''})`,
            }}
          >
            {/* Dark overlay for better text readability */}
            <div className="absolute inset-0 bg-black/30"></div>

            {/* Content overlay */}
            <div className="absolute inset-0 flex items-center p-16">
              <div className="text-white max-w-xl">
                <p className="text-yellow-400 tracking-widest mb-4 text-md font-bold">
                  {banner.heading || "LIMITED TIME OFFER"}
                </p>

                <h1 className="text-5xl font-extrabold leading-tight whitespace-pre-line mb-6">
                  {banner.title || "Dhaka Prime\nSweets Collection"}
                </h1>

                <p className="text-gray-200 mb-8 max-w-md text-xl font-normal">
                  {banner.description || "Indulge in our handcrafted sweets made with traditional recipes and the finest ingredients."}
                </p>

                <button className="relative bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-8 py-3 rounded-full font-bold text-lg tracking-wide shadow-xl hover:shadow-2xl hover:shadow-red-500/50 transform hover:scale-105 active:scale-95 transition-all duration-300 ease-out group overflow-hidden">
                  {/* Continuous shine effect */}
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/70 to-transparent -skew-x-12 animate-shine"></span>

                  {/* Button text with icon */}
                  <span className="relative flex items-center gap-2">
                    {banner.button || "SHOP NOW"}
                    <svg
                      className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                      />
                    </svg>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Arrows - only show if more than 1 banner */}
      {banners.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-6 top-1/2 -translate-y-1/2 bg-white/30 backdrop-blur-md p-3 rounded-full text-white hover:bg-white/50 transition z-20"
          >
            <ChevronLeft size={24} />
          </button>

          <button
            onClick={nextSlide}
            className="absolute right-6 top-1/2 -translate-y-1/2 bg-white/30 backdrop-blur-md p-3 rounded-full text-white hover:bg-white/50 transition z-20"
          >
            <ChevronRight size={24} />
          </button>
        </>
      )}

      {/* Dots */}
      {banners.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 z-20">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrent(index)}
              className={`w-3 h-3 rounded-full transition ${
                current === index
                  ? "bg-white scale-125"
                  : "bg-white/40 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}