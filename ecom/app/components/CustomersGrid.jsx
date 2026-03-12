import Image from "next/image";

const customers = [
  { id: 1, src: "/partners/1.png", alt: "Customer 1" },
  { id: 2, src: "/partners/1.png", alt: "Customer 2" },
  { id: 3, src: "/partners/1.png", alt: "Customer 3" },
  { id: 4, src: "/partners/1.png", alt: "Customer 4" },
  { id: 5, src: "/partners/1.png", alt: "Customer 5" },
  { id: 6, src: "/partners/1.png", alt: "Customer 6" },
  { id: 7, src: "/partners/1.png", alt: "Customer 7" },
  { id: 8, src: "/partners/1.png", alt: "Customer 8" },
];

export default function CustomersGrid() {
  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-center mb-12 text-red-900">
          Our Valued Customers
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center">
          {customers.map((customer) => (
            <div
              key={customer.id}
              className="flex justify-center items-center p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition"
            >
              <Image
                src={customer.src}
                alt={customer.alt}
                width={180}
                height={100}
                className="object-contain"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}