"use client";

import Image from "next/image";
import { Mail, Phone, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const outlets = [
  {
    name: "কল্যাণপুর",
    address: "বিআরটিসি মার্কেট, কল্যাণপুর বিআরটিসি বাসস্ট্যান্ড, মিরপুর রোড",
    phone: "01904-111819",
    mapLink: "https://maps.app.goo.gl/5qhPv42qjeVyswYr9",
  },
  {
    name: "যাত্রাবাড়ি",
    address: "বিবির বাগিচা, গেইট নং- ০১, উত্তর যাত্রাবাড়ি",
    phone: "01958-601014",
    mapLink: "https://maps.app.goo.gl/63hXT36bMZ7YWkPA7",
  },
  {
    name: "শান্তিনগর",
    address: "দোকান নং- ৪১, শান্তিনগর মসজিদ মার্কেট, পল্টন",
    phone: "01958-601012",
    mapLink: "https://maps.app.goo.gl/uGELc7VdoAJAR8cWA",
  },
  {
    name: "লক্ষ্মীবাজার",
    address: "৮০, লক্ষ্মীবাজার",
    phone: "01904-111809",
    mapLink: "https://maps.app.goo.gl/Pr6ZN74b571JeGjz6",
  },
  {
    name: "লিংক রোড",
    address: "বাড্ডা লিংক রোড, গুলশান",
    phone: "01950-601015",
    mapLink: "https://maps.app.goo.gl/Z2x8fUmH7vPwWgZL9",
  },
];

export default function ContactPage() {
  

  return (
    <div>
      {/* Hero Section */}
      <section className="relative h-[300px] md:h-[350px]">
        <Image
          src="https://ext.same-assets.com/3310335706/3475358420.jpeg"
          alt="Get in Touch"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/40 via-purple-600/70 to-pink-500/50" />
        <div className="absolute inset-0 flex flex-col justify-center container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
            Get in Touch
          </h1>
          <p className="text-lg md:text-xl text-white/90 max-w-xl">
            Just give us a hint. We will get back to you as soon as possible.
          </p>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Information & Outlets */}
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">
                Contact Information
              </h2>
              <div className="grid sm:grid-cols-2 gap-6 mb-10">
                {/* Email */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Email Address</h3>
                    <a href="mailto:dhakaprimesweet@gmail.com" className="text-gray-600 hover:text-primary block">
                      dhakaprimesweet@gmail.com
                    </a>
                    <a href="mailto:info@dhakaprimesweets.com" className="text-gray-600 hover:text-primary block">
                      info@dhakaprimesweets.com
                    </a>
                  </div>
                </div>
                {/* Phone */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Phone</h3>
                    <a href="tel:01958601003" className="text-gray-600 hover:text-primary block">
                      01958-601003
                    </a>
                  </div>
                </div>
              </div>

              {/* Our Outlets */}
              <h3 className="text-xl font-bold text-gray-900 mb-6">Our Outlets:</h3>
              <div className="grid sm:grid-cols-2 gap-6">
                {outlets.map((outlet) => (
                  <div key={outlet.name} className="pb-4 border-b border-gray-100">
                    <a
                      href={outlet.mapLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 font-semibold font-bengali text-gray-900 hover:text-primary mb-2"
                    >
                      {outlet.name} <ArrowRight className="w-4 h-4" />
                    </a>
                    <p className="text-gray-600 text-sm font-bengali mb-1">
                      {outlet.address}
                    </p>
                    <p className="text-gray-900 font-semibold font-bengali">
                      মোবাইলঃ {outlet.phone}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-gray-50 rounded-xl p-8">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
                Get In Touch
              </h2>
              <form className="space-y-5">
                <div>
                  <Input
                    type="text"
                    placeholder="Your Name"
                    className="bg-white border-gray-200 h-12"
                    required
                  />
                </div>
                <div>
                  <Input
                    type="email"
                    placeholder="Your Email"
                    className="bg-white border-gray-200 h-12"
                    required
                  />
                </div>
                <div>
                  <Input
                    type="text"
                    placeholder="Your Subject"
                    className="bg-white border-gray-200 h-12"
                    required
                  />
                </div>
                <div>
                  <Textarea
                    placeholder="Your Message"
                    className="bg-white border-gray-200 min-h-[150px] resize-none"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 bg-red-600 hover:bg-red-800/90 text-white font-semibold rounded-lg"
                >
                  Send Message
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}