"use client";
import React, { useState, useEffect } from "react";

// react icons
import { IoIosArrowDown, IoIosSearch } from "react-icons/io";
import { FaDiscord } from "react-icons/fa";
import { TbBrandGithubFilled } from "react-icons/tb";
import { CiMenuFries } from "react-icons/ci";
import { MdDashboardCustomize, MdKeyboardArrowDown } from "react-icons/md";
import { BsArrowRight } from "react-icons/bs";
import { CgIfDesign } from "react-icons/cg";
import { FaCubesStacked } from "react-icons/fa6";
import { Mail, Phone, ReceiptText, ShoppingCart, Truck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { api } from "@/lib/api";
import { useCart } from "@/app/context/CartContext";
import { Cart } from "./Cart";
import { OrderTracker } from "./OrderTracker";

const ADMIN_PANEL_URL = "http://localhost:3001";

// EXACT SAME image URL function as Categories.jsx
const getImageUrl = (imagePath) => {
  console.log("Navbar - Original image path from DB:", imagePath);

  if (!imagePath) {
    console.log("Navbar - No image path, using fallback");
    return "/cat1.jpg"; // Same fallback as Categories page
  }

  // If it's already a full URL
  if (imagePath.startsWith("http")) {
    console.log("Navbar - Image is full URL:", imagePath);
    return imagePath;
  }

  // If it starts with /uploads
  if (imagePath.startsWith("/uploads")) {
    const finalUrl = `${ADMIN_PANEL_URL}${imagePath}`;
    console.log("Navbar - Image with /uploads prefix:", finalUrl);
    return finalUrl;
  }

  // Default case - add /uploads/ prefix
  const finalUrl = `${ADMIN_PANEL_URL}/uploads/${imagePath}`;
  console.log("Navbar - Image with added /uploads/:", finalUrl);
  return finalUrl;
};

// EXACT SAME slug creation function as Categories.jsx
const createSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^\u0980-\u09FF\w\s-]/g, "") // Allow Bengali characters
    .replace(/\s+/g, "-")
    .replace(/--+/g, "-")
    .trim();
};

const Navbar = () => {
  const [mobileAboutUsOpen, setMobileAboutUsOpen] = useState(false);
  const [mobileServiceOpen, setMobileServiceOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isTrackerOpen, setIsTrackerOpen] = useState(false);

  // Get cart functions
  const { getItemCount, setIsCartOpen } = useCart();

  useEffect(() => {
    async function fetchCategories() {
      try {
        const data = await api.getFoodCategories();
        console.log("Navbar - Fetched categories:", data); // Debug log

        // Store categories with slugs (EXACT same as Categories.jsx)
        const categoriesWithSlugs = data.map((cat) => ({
          ...cat,
          slug: createSlug(cat.name),
        }));
        setCategories(categoriesWithSlugs);
      } catch (error) {
        console.error("Navbar - Error fetching categories:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchCategories();
  }, []);

  // Fallback categories (only used if API fails)
  const fallbackCategories = [
    { name: "Special Sweets", slug: "special-sweets", image: null },
    { name: "Laddu", slug: "laddu", image: null },
    { name: "Curd", slug: "curd", image: null },
    { name: "Traditional Sweets", slug: "traditional-sweets", image: null },
    { name: "Dry Item", slug: "dry-item", image: null },
    { name: "Shondesh", slug: "shondesh", image: null },
  ];

  const displayCategories =
    categories.length > 0 ? categories : fallbackCategories;

  return (
    <>
      {/* Cart Drawer Component - Rendered once at the navbar level */}
      <Cart />

      {/* top red navpart */}
      <div
        className="h-9 w-full bg-gradient-to-r from-red-900/50 to-red-900/50, url('/bg.png') bg-repeat-x bg-[length:370px_auto] bg-center"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(157, 29, 29, 0.85), rgba(157, 29, 29, 0.85)), url('/bg.png')`,
        }}
      >
        <div className="px-7 max-w-7xl mx-auto flex justify-between items-center text-xs md:text-base font-medium text-white">
          {/* left top buttons */}
          <div className="flex items-center gap-2">
            <Link
              href="/AboutUs"
              className="hover:scale-105 transition-transform duration-300 ease-in-out inline-block"
            >
              About Us
            </Link>
            <Link
              className="hover:scale-105 transition-transform duration-300 ease-in-out inline-block"
              href="/AllOutlets"
            >
              All Outlets
            </Link>
            <Link
              className="hover:scale-105 transition-transform duration-200 ease-in-out inline-block"
              href="/ContactPage"
            >
              Contact Us
            </Link>
          </div>
          {/* middle red part */}
          <div className="bg-red-600 w-3/12 h-9 rounded-b-full"></div>
          {/*right top buttons */}
          <div className="flex justify-center items-center gap-4">
            <p className="flex justify-center items-center gap-1">
              <Phone size={16} fill="currentColor" /> +8801726798844
            </p>
            <p className="flex justify-center items-center gap-1 hidden sm:flex">
              <Mail size={16} />
              testmail@gmail.com
            </p>
          </div>
        </div>
      </div>

      {/* Sticky Header - Middle and Bottom Nav */}
      <header className="sticky top-0 z-50 w-full bg-white shadow-md">
        {/* middle navpart */}
        <div className="flex h-30 max-w-7xl items-center justify-between w-full relative px-6 mx-auto">
          {/* logo */}
          <Link href="/">
            <img src="/logo.png" alt="logo" className="w-[80px]" />
          </Link>

          {/* nav links */}
          <ul className="items-center gap-[20px] text-[1rem] text-[#424242] md:flex hidden">
            <li className="transition-all duration-500 cursor-pointer dark:text-[#abc2d3] hover:text-[#3B9DF8] capitalize">
              <div className="relative md:flex hidden items-center">
                <input
                  className="py-2.5 pr-74 dark:bg-transparent dark:border-slate-300 dark:placeholder:text-slate-500 dark:text-[#abc2d3] border border-[#424242d2] pl-10 rounded-xl text-md outline-none focus:border-[#3B9DF8]"
                  placeholder="Search for sweets,cookies"
                />
                <IoIosSearch className="absolute top-[15px] dark:text-slate-500 left-3 text-[#424242] text-[1.3rem]" />
              </div>
            </li>
          </ul>

          <div className="flex items-center gap-[10px] text-white">
            <button
              className="flex gap-2 bg-red-500 px-4 py-3 rounded-xl font-semibold cursor-pointer hover:bg-red-700"
              onClick={() => setIsTrackerOpen(true)}
            >
              <ReceiptText className="text-[1.6rem] text-white" />
              Track Order
            </button>

            {/* Add the OrderTracker component */}
            <OrderTracker
              isOpen={isTrackerOpen}
              onClose={() => setIsTrackerOpen(false)}
            />

            {/* Cart Button with Item Count */}
            <button
              className="flex bg-red-900 py-2 px-4 rounded-xl text-white hover:scale-110 transition-transform  relative"
              onClick={() => setIsCartOpen(true)}
            >
              <ShoppingCart className="text-[1.6rem] cursor-pointer" />
              {getItemCount() > 0 && (
                <span className="absolute -top-2 -right-2 bg-green-400 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {getItemCount()}
                </span>
              )}
            </button>

            <CiMenuFries
              className="text-[1.6rem] text-gray-800 cursor-pointer md:hidden flex"
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            />
          </div>

          {/* mobile sidebar */}
          <aside
            className={` ${
              mobileSidebarOpen
                ? "translate-x-0 opacity-100 z-20"
                : "translate-x-[200px] opacity-0 z-[-1]"
            } md:hidden bg-white boxShadow p-4 text-center absolute dark:bg-slate-700 top-20 right-0 sm:w-[300px] w-full rounded-md transition-all duration-300`}
          >
            <ul className="items-start gap-[20px] text-[1rem] text-gray-600 flex flex-col">
              {/* Mobile menu categories */}
              <li className="w-full">
                <p className="font-semibold text-red-900 mb-2">Categories</p>
                {displayCategories.map((category) => (
                  <Link
                    key={category.slug}
                    href={`/category/${category.slug}?name=${encodeURIComponent(category.name)}`}
                    className="flex items-center gap-2 py-2 px-3 hover:bg-gray-100 rounded-lg transition-colors"
                    onClick={() => setMobileSidebarOpen(false)}
                  >
                    {category.image && (
                      <div className="relative w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                        <Image
                          src={getImageUrl(category.image)}
                          alt={category.name}
                          width={24}
                          height={24}
                          className="object-cover"
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                          unoptimized
                        />
                      </div>
                    )}
                    <span>{category.name}</span>
                  </Link>
                ))}
              </li>
              <li className="hover:text-[#3B9DF8] dark:text-[#abc2d3] group transition-all duration-500 cursor-pointer capitalize flex items-center gap-[10px]">
                <Link
                  href="/AboutUs"
                  onClick={() => setMobileSidebarOpen(false)}
                >
                  About Us
                </Link>
              </li>
              <li className="hover:text-[#3B9DF8] dark:text-[#abc2d3] group transition-all duration-500 cursor-pointer capitalize flex items-center gap-[10px]">
                <Link
                  href="/AllOutlets"
                  onClick={() => setMobileSidebarOpen(false)}
                >
                  All Outlets
                </Link>
              </li>
              <li className="hover:text-[#3B9DF8] dark:text-[#abc2d3] group transition-all duration-500 cursor-pointer capitalize flex items-center gap-[10px]">
                <Link
                  href="/ContactPage"
                  onClick={() => setMobileSidebarOpen(false)}
                >
                  Contact Us
                </Link>
              </li>
            </ul>
          </aside>
        </div>

        {/* bottom navpart */}
        <div className="flex max-w-7xl justify-between w-full px-4 pb-2 h-auto mx-auto border-t border-gray-100">
          {/* categories - horizontally scrollable on mobile */}
          <div className="flex items-center gap-5 overflow-x-auto scrollbar-hide pb-2 md:pb-0 md:overflow-visible md:flex-wrap md:justify-center">
            {loading
              ? // Show loading skeletons
                [...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="w-24 h-8 bg-gray-200 rounded animate-pulse"
                  ></div>
                ))
              : // Show real categories from database with their actual images
                displayCategories.map((category) => (
                  <Link
                    key={category.slug}
                    href={`/category/${category.slug}?name=${encodeURIComponent(category.name)}`}
                    className="text-red-900 flex gap-1 items-center justify-center hover:-translate-y-1 hover:scale-105 hover:shadow-lg transition-all duration-300 whitespace-nowrap"
                  >
                    {category.image ? (
                      <div className="relative w-6 h-6 overflow-hidden rounded-full">
                        <Image
                          src={getImageUrl(category.image)}
                          alt={category.name}
                          width={24}
                          height={24}
                          className="object-cover pt-1.5"
                          onError={(e) => {
                            console.log(
                              "Navbar - Image failed to load for:",
                              category.name,
                            );
                            e.target.style.display = "none";
                            // Show a fallback colored circle
                            e.target.parentElement.innerHTML =
                              '<div class="w-6 h-6 bg-red-200 rounded-full"></div>';
                          }}
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div className="w-6 h-6 bg-red-200 rounded-full"></div>
                    )}
                    {category.name}
                  </Link>
                ))}
          </div>

          {/* right text - hidden on mobile, visible on desktop */}
          <p className="hidden md:flex justify-center items-center text-red-600">
            <Truck /> Free shipping for all orders of 2000 BDT
          </p>
        </div>

        {/* Free shipping message for mobile - appears below scrollable categories */}
        <p className="flex md:hidden justify-center items-center text-red-600 text-sm mt-2 pb-2">
          <Truck /> Free shipping for orders above 2000 BDT
        </p>
      </header>
    </>
  );
};

export default Navbar;
