import Image from "next/image";
import { MapPin, ArrowRight } from "lucide-react";

const outlets = [
  {
    id: 1,
    name: "কল্যাণপুর",
    nameEn: "Kalyanpur",
    address: "বিআরটিসি মার্কেট, কল্যাণপুর বিআরটিসি বাসস্ট্যান্ড, মিরপুর রোড",
    phone: "01904-111819",
    image: "/outlet.jpg",
    mapLink: "https://maps.app.goo.gl/5qhPv42qjeVyswYr9",
  },
  {
    id: 2,
    name: "যাত্রাবাড়ি",
    nameEn: "Jatrabari",
    address: "রবির বাগিচা, গেইট নং- ০৯, উত্তর যাত্রাবাড়ি",
    phone: "01958-601014",
    image: "/outlet.jpg",
    mapLink: "https://maps.app.goo.gl/63hXT36bMZ7YWkPA7",
  },
  {
    id: 3,
    name: "শান্তিনগর",
    nameEn: "Shantinagar",
    address: "দোকান নং- ৪১, শান্তিনগর মসজিদ মার্কেট, পল্টন",
    phone: "01958-601012",
    image: "/outlet.jpg",
    mapLink: "https://maps.app.goo.gl/uGELc7VdoAJAR8cWA",
  },
  {
    id: 4,
    name: "লক্ষ্মীবাজার",
    nameEn: "Laxmibazar",
    address: "৮০, লক্ষ্মীবাজার",
    phone: "01904-111809",
    image: "/outlet.jpg",
    mapLink: "https://maps.app.goo.gl/Pr6ZN74b571JeGjz6",
  },
  {
    id: 5,
    name: "লিংক রোড",
    nameEn: "Link Road",
    address: "বাড্ডা লিংক রোড, গুলশান",
    phone: "01950-601015",
    image: "/outlet.jpg",
    mapLink: "https://maps.app.goo.gl/Z2x8fUmH7vPwWgZL9",
  },
];

export default function OutletGrid() {
  return (
    <section className="py-16 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-4xl font-semibold text-center text-gray-800 mb-12">
          Our Outlets
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {outlets.map((outlet) => (
            <div
              key={outlet.id}
              className="group bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100"
            >
              <div className="relative h-64 overflow-hidden">
                <Image
                  src={outlet.image}
                  alt={outlet.nameEn}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>

              <div className="p-6">
                <h3 className="bengali-text text-2xl font-bold text-gray-800 mb-2">
                  {outlet.name}
                </h3>
                <p className="bengali-text text-gray-600 mb-3 leading-relaxed">
                  {outlet.address}
                </p>
                <p className="bengali-text text-[#b21a17] font-semibold text-lg mb-4">
                  মোবাইলঃ {outlet.phone}
                </p>

                <a
                  href={outlet.mapLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-gray-700 hover:text-[#b21a17] transition-colors font-medium group/link"
                >
                  <MapPin className="w-5 h-5" />
                  <span>See in Google Map</span>
                  <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
