import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const values = [
  {
    icon: (
      <svg className="w-16 h-16 text-[#352122]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4c-1.1 0-2 .9-2 2v1c0 .55.45 1 1 1h2c.55 0 1-.45 1-1V6c0-1.1-.9-2-2-2z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12c0-1.1-.9-2-2-2H4c-.55 0-1 .45-1 1v2c0 .55.45 1 1 1h1c1.1 0 2-.9 2-2z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 12c0-1.1.9-2 2-2h1c.55 0 1 .45 1 1v2c0 .55.45 1-1 1h-1c-1.1 0-2-.9-2-2z" />
      </svg>
    ),
    title: "Freshly baked every day",
  },
  {
    icon: (
      <svg className="w-16 h-16 text-[#352122]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
      </svg>
    ),
    title: "On-demand delivery",
  },
  {
    icon: (
      <svg className="w-16 h-16 text-[#352122]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
    title: "Crafted with care",
  },
];

const outlets = [
  {
    name: "কল্যাণপুর",
    address: "বিআরটিসি মার্কেট, কল্যাণপুর বিআরটিসি বাসস্ট্যান্ড, মিরপুর রোড",
    phone: "01904-111819",
    image: "https://ext.same-assets.com/3310335706/4131777634.jpeg",
    mapLink: "https://maps.app.goo.gl/5qhPv42qjeVyswYr9",
  },
  {
    name: "যাত্রাবাড়ি",
    address: "বিবির বাগিচা, গেইট নং- ০১, উত্তর যাত্রাবাড়ি",
    phone: "01958-601014",
    image: "https://ext.same-assets.com/3310335706/2917326960.jpeg",
    mapLink: "https://maps.app.goo.gl/63hXT36bMZ7YWkPA7",
  },
  {
    name: "শান্তিনগর",
    address: "দোকান নং- ৪১, শান্তিনগর মসজিদ মার্কেট, পল্টন",
    phone: "01958-601012",
    image: "https://ext.same-assets.com/3310335706/521281729.jpeg",
    mapLink: "https://maps.app.goo.gl/uGELc7VdoAJAR8cWA",
  },
  {
    name: "লক্ষ্মীবাজার",
    address: "৮০, লক্ষ্মীবাজার",
    phone: "01904-111809",
    image: "https://ext.same-assets.com/3310335706/2692296120.jpeg",
    mapLink: "https://maps.app.goo.gl/Pr6ZN74b571JeGjz6",
  },
  {
    name: "লিংক রোড",
    address: "বাড্ডা লিংক রোড, গুলশান",
    phone: "01950-601015",
    image: "https://ext.same-assets.com/3310335706/2461894526.jpeg",
    mapLink: "https://maps.app.goo.gl/Z2x8fUmH7vPwWgZL9",
  },
];

export default function AboutUsPage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative h-[350px] md:h-[400px]">
        <Image
          src="https://ext.same-assets.com/3310335706/3475358420.jpeg"
          alt="Our Sweet Story"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 hero-overlay" />
        <div className="absolute inset-0 flex flex-col justify-center container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
            Our Sweet Story
          </h1>
          <p className="text-lg md:text-xl text-white/90 max-w-xl">
            Discover the passion, craftsmanship, and love that goes into every delightful creation at Dhaka Prime Sweets
          </p>
        </div>
      </section>

      {/* About Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            About Dhaka Prime Sweets
          </h2>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
                Creating Sweet Memories<br />Since 2010
              </h3>
              <p className="text-gray-600 leading-relaxed mb-6">
                Established in 2017 as a sister concern of the RSF Group, Dhaka Prime Sweets Ltd. has rapidly evolved from a single shop in Jatrabari into a leading confectionery brand in Bangladesh. The company operates high-tech, BSTI-certified industrial facilities with a daily production capacity exceeding 15,000 liters, supported by a dedicated workforce of 350 employees.
              </p>
              <p className="text-gray-600 leading-relaxed mb-6">
                By combining traditional recipes with modern in-house R&D and testing labs, they offer premium sweets and bakery products across numerous Dhaka outlets, including Dhanmondi and Mirpur. Focused on uncompromising quality and innovation, the organization has achieved significant domestic success and is now strategically expanding into international markets to export its diverse range of products, such as special Chana and Malai Sarai.
              </p>
              <Link
                href="#"
                className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-full hover:bg-primary/90 transition-colors"
              >
                Our Products
              </Link>
            </div>
            <div className="relative">
              <Image
                src="https://ext.same-assets.com/3310335706/3294951062.jpeg"
                alt="Dhaka Prime Sweets Store"
                width={600}
                height={500}
                className="rounded-lg shadow-lg w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Managing Director's Message */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Managing Director&apos;s Message
          </h2>
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div className="relative">
              <Image
                src="https://ext.same-assets.com/3310335706/1467787099.webp"
                alt="Habibur Rahman - Managing Director"
                width={400}
                height={500}
                className="rounded-lg shadow-lg w-full max-w-md mx-auto"
              />
            </div>
            <div>
              <p className="text-gray-600 leading-relaxed mb-4">
                We live in an age of globalization where advances in science, technology, transportation, and communication have reduced global distances and unified cultures and markets. These changes have significantly transformed business, trade, and commerce worldwide. Bangladesh has also progressed rapidly, moving beyond traditional trade into manufacturing, with strong GDP growth.
              </p>
              <p className="text-gray-600 leading-relaxed mb-4">
                Inspired by this environment, I began my entrepreneurial journey over twenty years ago by establishing RSF (Real & Safe for Future) as a small customs clearing and forwarding firm. Over time, RSF has grown into a successful agro- and sweets-based commodity company in Bangladesh. This growth has been possible due to the dedication of our staff and the support of well-wishers and patrons.
              </p>
              <p className="text-gray-600 leading-relaxed mb-4">
                Our success is driven by a clear vision, strong teamwork, quality production, organized market practices, continuous improvement, and a willingness to face new challenges. We maintain zero tolerance for corruption and prioritize developing local talent.
              </p>
              <p className="text-gray-600 leading-relaxed mb-6">
                Going forward, we aim to uphold high standards across all operations, focus on safety, environmental responsibility, and sustainability, and strengthen a fair, ethical corporate culture where success is shared with employees, partners, and society.
              </p>
              <div className="mt-6">
                <h4 className="text-xl font-bold text-gray-900">Habibur Rahman</h4>
                <p className="text-gray-600">Managing Director</p>
                <Image
                  src="https://ext.same-assets.com/3310335706/1108515429.png"
                  alt="Signature"
                  width={120}
                  height={50}
                  className="mt-2"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Our Values
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {values.map((value, index) => (
              <div key={index} className="text-center">
                <div className="mb-4 flex justify-center">{value.icon}</div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {value.title}
                </h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Outlets */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Our Outlets
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {outlets.map((outlet) => (
              <div key={outlet.name} className="bg-white rounded-lg overflow-hidden shadow-md">
                <div className="relative h-48">
                  <Image
                    src={outlet.image}
                    alt={outlet.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-semibold font-bengali mb-2">
                    {outlet.name}
                  </h3>
                  <p className="text-gray-600 text-sm font-bengali mb-2">
                    {outlet.address}
                  </p>
                  <p className="text-gray-900 font-semibold mb-3 font-bengali">
                    মোবাইলঃ {outlet.phone}
                  </p>
                  <a
                    href={outlet.mapLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-primary hover:underline"
                  >
                    See in Google Map <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Frequently Asked Questions
          </h2>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1" className="border rounded-lg mb-3 px-4">
              <AccordionTrigger className="text-left font-medium">
                What dietary restrictions do you accommodate?
              </AccordionTrigger>
              <AccordionContent className="text-gray-600">
                We offer a wide range of options for various dietary needs including gluten-free, vegan, nut-free, and dairy-free desserts. Please let us know about any specific requirements when placing your order.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>
    </div>
  );
}
