"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

import cat1 from ".././../public/cat1.jpg";

const categories = [
  {
    id: 1, // Add this
    name: "লাড্ডু",
    slug: "laddu",
    image: cat1,
  },
  {
    id: 2, // Add this
    name: "ঝাঁই",
    slug: "jhai",
    image: cat1,
  },
  {
    id: 3, // Add this
    name: "দই",
    slug: "doi",
    image: cat1,
  },
  {
    id: 4, // Add this
    name: "আদি মিষ্টি",
    slug: "adi-misti",
    image: cat1,
  },
  {
    id: 5, // Add this
    name: "সন্দেশ",
    slug: "sandesh",
    image: cat1,
  },
  {
    id: 6, // Add this
    name: "স্পেশাল মিষ্টি",
    slug: "special-misti",
    image: cat1,
  },
];

export default function Categories() {
  const router = useRouter();

  const handleNavigation = (path) => {
    router.push(path);
  };

  return (
    <section className="py-16 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/arabesque.png')]"></div>

      <div className="relative max-w-7xl mx-auto px-6 text-center">
        {/* Title */}
        <h2 className="text-5xl font-extrabold text-red-900">Our Categories</h2>

        <div className="w-16 h-1 bg-gradient-to-r from-red-900 to-red-600 mx-auto mt-3 mb-4 rounded-full"></div>

        <p className="text-gray-400 text-xl font-medium mb-12">
          Explore our premium collection of handcrafted sweets and desserts
        </p>

        {/* Categories Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-8">
          {categories.map((category) => (
            <div
              key={category.id}
              onClick={() => handleNavigation(`/category/${category.slug}`)}
              className="relative w-42 h-42 rounded-full overflow-hidden cursor-pointer group transition-all duration-300 hover:ring-4 hover:ring-red-700 hover:ring-offset-1
              ring-4 ring-gray-200 ring-offset-1"
            >
              <Image
                src={category.image}
                alt={category.name}
                width={268}
                height={268}
                className="w-full h-full object-cover group-hover:scale-120 transition duration-500"
              />

              {/* Overlay */}
              <div className="absolute inset-0 bg-black/20 flex flex-col items-center justify-center rounded-full group-hover:bg-black/30 transition-all duration-300">
                <p className="text-white text-lg font-semibold">
                  {category.name}
                </p>
                <p className="text-white text-lg font-medium mt-1 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                  5 items
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
