import Image from "next/image";

export default function OutletHero() {
  return (
    <section className="relative bg-gradient-to-r from-[#b21a17] to-[#8a1513] bg-[url('/outletbg.webp')] bg-cover bg-center bg-blend-overlay overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 py-16 md:py-44 flex items-center justify-between">
        <div className="max-w-xl z-10">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            See Our Outlets
          </h1>
          <p className="text-white/90 text-lg md:text-xl leading-relaxed">
            Discover the passion, craftsmanship, and love that goes into every delightful creation at Dhaka Prime Sweets
          </p>
        </div>

      </div>

      {/* Decorative mandala pattern */}
      <div className="absolute top-0 right-0 w-96 h-96 opacity-10">
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <defs>
            <pattern id="mandala" x="0" y="0" width="50" height="50" patternUnits="userSpaceOnUse">
              <circle cx="25" cy="25" r="20" fill="none" stroke="white" strokeWidth="0.5" />
              <circle cx="25" cy="25" r="15" fill="none" stroke="white" strokeWidth="0.5" />
              <circle cx="25" cy="25" r="10" fill="none" stroke="white" strokeWidth="0.5" />
              <circle cx="25" cy="25" r="5" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="200" height="200" fill="url(#mandala)" />
        </svg>
      </div>
    </section>
  );
}
