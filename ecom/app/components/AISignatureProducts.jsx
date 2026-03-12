"use client";

const signatureItems = [
  {
    id: 1,
    name: "Cream Jam",
    image: "https://ext.same-assets.com/3310335706/2294167738.jpeg",
    size: "normal",
  },
  {
    id: 2,
    name: "Chocolate Barfi",
    image: "https://ext.same-assets.com/3310335706/129000677.jpeg",
    size: "normal",
  },
  {
    id: 3,
    name: "Madraji Golla",
    image: "https://ext.same-assets.com/3310335706/1298652454.jpeg",
    size: "normal",
  },
  {
    id: 4,
    name: "Baby Sweets",
    image: "https://ext.same-assets.com/3310335706/3360348333.png",
    size: "large",
  },
  {
    id: 5,
    name: "Semai Laddu",
    image: "https://ext.same-assets.com/3310335706/3274954951.jpeg",
    size: "tall",
  },
  {
    id: 6,
    name: "Apple Shondesh",
    image: "https://ext.same-assets.com/3310335706/1135452213.jpeg",
    size: "normal",
  },
  {
    id: 7,
    name: "Roshgolla",
    image: "https://ext.same-assets.com/3310335706/3524380110.jpeg",
    size: "normal",
  },
  {
    id: 8,
    name: "Traditional Sweet",
    image: "https://ext.same-assets.com/3310335706/3360348333.png",
    size: "large",
  },
  {
    id: 9,
    name: "Orange Barfi",
    image: "https://ext.same-assets.com/3310335706/1135452213.jpeg",
    size: "normal",
  },
  {
    id: 10,
    name: "Lal Mohan",
    image: "https://ext.same-assets.com/3310335706/197777064.jpeg",
    size: "tall",
  },
  {
    id: 11,
    name: "Black Toast",
    image: "https://ext.same-assets.com/3310335706/4103938156.jpeg",
    size: "tall",
  },
  {
    id: 12,
    name: "Tang Toast",
    image: "https://ext.same-assets.com/3310335706/3402507196.png",
    size: "tall",
  },
  {
    id: 13,
    name: "Special Sweets",
    image: "https://ext.same-assets.com/3310335706/2006251097.jpeg",
    size: "normal",
  },
];

export default function AISignatureProducts() {
  return (
    <section className="py-16 bg-pattern">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-maroon-dark mb-4">
            Our Signature Products
          </h2>
          <p className="text-burgundy">
            Explore product collections from our vendors
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[200px]">
          {/* Row 1 */}
          <div className="relative rounded-2xl overflow-hidden group cursor-pointer">
            <img
              src={signatureItems[0].image}
              alt={signatureItems[0].name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <span className="absolute top-4 left-4 bg-white/90 text-maroon-dark px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
              <span className="w-2 h-2 bg-yellow-600 rounded-full" />
              {signatureItems[0].name}
            </span>
          </div>

          <div className="relative rounded-2xl overflow-hidden group cursor-pointer">
            <img
              src={signatureItems[1].image}
              alt={signatureItems[1].name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <span className="absolute top-4 left-4 bg-white/90 text-maroon-dark px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
              <span className="w-2 h-2 bg-orange-600 rounded-full" />
              {signatureItems[1].name}
            </span>
          </div>

          <div className="relative rounded-2xl overflow-hidden group cursor-pointer">
            <img
              src={signatureItems[2].image}
              alt={signatureItems[2].name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <span className="absolute top-4 left-4 bg-white/90 text-maroon-dark px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
              <span className="w-2 h-2 bg-red-600 rounded-full" />
              {signatureItems[2].name}
            </span>
          </div>

          <div className="relative rounded-2xl overflow-hidden group cursor-pointer row-span-2">
            <img
              src={signatureItems[3].image}
              alt={signatureItems[3].name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <span className="absolute top-4 left-4 bg-white/90 text-maroon-dark px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
              <span className="w-2 h-2 bg-pink-600 rounded-full" />
              {signatureItems[3].name}
            </span>
          </div>

          {/* Row 2 */}
          <div className="relative rounded-2xl overflow-hidden group cursor-pointer row-span-2">
            <img
              src={signatureItems[4].image}
              alt={signatureItems[4].name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <span className="absolute top-4 left-4 bg-white/90 text-maroon-dark px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
              <span className="w-2 h-2 bg-yellow-600 rounded-full" />
              {signatureItems[4].name}
            </span>
          </div>

          <div className="relative rounded-2xl overflow-hidden group cursor-pointer">
            <img
              src={signatureItems[5].image}
              alt={signatureItems[5].name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <span className="absolute top-4 left-4 bg-white/90 text-maroon-dark px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
              <span className="w-2 h-2 bg-red-400 rounded-full" />
              {signatureItems[5].name}
            </span>
          </div>

          <div className="relative rounded-2xl overflow-hidden group cursor-pointer row-span-2">
            <img
              src={signatureItems[6].image}
              alt={signatureItems[6].name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <span className="absolute top-4 left-4 bg-white/90 text-maroon-dark px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
              <span className="w-2 h-2 bg-red-400 rounded-full" />
              {signatureItems[6].name}
            </span>
          </div>

          {/* Description Card */}
          <div className="bg-white rounded-2xl p-6 flex flex-col justify-center">
            <h3 className="text-2xl font-bold text-maroon-dark mb-2">#Prime Sweets</h3>
            <p className="text-gray-600 text-sm">
              Indulge in the rich and golden taste of Dhaka Prime Sweets' special Baklava, handcrafted with love and care. Perfect for gifting and celebrations.
            </p>
          </div>

          {/* Row 3 */}
          <div className="relative rounded-2xl overflow-hidden group cursor-pointer">
            <img
              src={signatureItems[8].image}
              alt={signatureItems[8].name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <span className="absolute top-4 left-4 bg-white/90 text-maroon-dark px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
              <span className="w-2 h-2 bg-yellow-600 rounded-full" />
              {signatureItems[8].name}
            </span>
          </div>

          {/* Info Card */}
          <div className="bg-white rounded-2xl p-6 flex flex-col justify-center">
            <h3 className="text-xl font-bold text-maroon-dark mb-2">Dhaka Prime Sweets</h3>
            <p className="text-gray-600 text-sm">
              Choose your favorite sweet to impress your beloved.
            </p>
          </div>

          <div className="relative rounded-2xl overflow-hidden group cursor-pointer row-span-2">
            <img
              src={signatureItems[9].image}
              alt={signatureItems[9].name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <span className="absolute top-4 left-4 bg-white/90 text-maroon-dark px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
              <span className="w-2 h-2 bg-red-400 rounded-full" />
              {signatureItems[9].name}
            </span>
          </div>

          <div className="relative rounded-2xl overflow-hidden group cursor-pointer row-span-2">
            <img
              src={signatureItems[7].image}
              alt={signatureItems[7].name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <span className="absolute top-4 left-4 bg-white/90 text-maroon-dark px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
              <span className="w-2 h-2 bg-yellow-600 rounded-full" />
              {signatureItems[7].name}
            </span>
          </div>

          {/* Row 4 */}
          <div className="relative rounded-2xl overflow-hidden group cursor-pointer row-span-2">
            <img
              src={signatureItems[10].image}
              alt={signatureItems[10].name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <span className="absolute top-4 left-4 bg-white/90 text-maroon-dark px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
              <span className="w-2 h-2 bg-red-400 rounded-full" />
              {signatureItems[10].name}
            </span>
          </div>

          <div className="relative rounded-2xl overflow-hidden group cursor-pointer row-span-2">
            <img
              src={signatureItems[11].image}
              alt={signatureItems[11].name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <span className="absolute top-4 left-4 bg-white/90 text-maroon-dark px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
              <span className="w-2 h-2 bg-red-400 rounded-full" />
              {signatureItems[11].name}
            </span>
          </div>

          {/* Row 5 */}
          <div className="relative rounded-2xl overflow-hidden group cursor-pointer">
            <img
              src={signatureItems[12].image}
              alt={signatureItems[12].name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <span className="absolute top-4 left-4 bg-white/90 text-maroon-dark px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
              <span className="w-2 h-2 bg-yellow-600 rounded-full" />
              {signatureItems[12].name}
            </span>
          </div>

          <div className="bg-gradient-to-br from-maroon to-burgundy rounded-2xl p-6 flex flex-col justify-center text-white">
            <h3 className="text-xl font-bold mb-2">View All Products</h3>
            <p className="text-white/80 text-sm mb-3">
              Explore our complete collection
            </p>
            <button className="bg-white text-maroon px-4 py-2 rounded-full font-medium text-sm hover:bg-gold hover:text-white transition-colors w-fit">
              Shop Now
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}