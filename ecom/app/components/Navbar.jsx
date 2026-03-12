"use client";
import React, { useState } from "react";

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

const Navbar = () => {
  const [mobileAboutUsOpen, setMobileAboutUsOpen] = useState(false);
  const [mobileServiceOpen, setMobileServiceOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <>
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
            <button className="flex gap-2 bg-red-500 px-4 py-3 rounded-xl font-semibold cursor-pointer hover:bg-red-700">
              <ReceiptText className="text-[1.6rem] text-white" />
              Track Order
            </button>
            <button className="flex bg-red-900 py-2 px-4 rounded-xl text-white hover:text-red-500  transition-all">
              <ShoppingCart className="text-[1.6rem]  cursor-pointer" />0
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
              <li className="hover:text-[#3B9DF8] dark:text-[#abc2d3] group transition-all duration-500 cursor-pointer capitalize flex items-center gap-[10px]">
                Home
              </li>

              <li className="hover:text-[#3B9DF8] dark:text-[#abc2d3] group transition-all duration-500 cursor-pointer capitalize flex items-center gap-[10px]">
                Home
              </li>
              <li className="hover:text-[#3B9DF8] dark:text-[#abc2d3] group transition-all duration-500 cursor-pointer capitalize flex items-center gap-[10px]">
                Home
              </li>
            </ul>
          </aside>
        </div>

        {/* bottom navpart */}
        <div className="flex max-w-7xl justify-between w-full px-4 pb-2 h-auto mx-auto border-t border-gray-100">
          {/* categories - horizontally scrollable on mobile */}
          <div className="flex items-center gap-5 overflow-x-auto scrollbar-hide pb-2 md:pb-0 md:overflow-visible md:flex-wrap md:justify-center">
            <Link
              href="/categories/specialSweets"
              className="text-red-900 flex gap-1 items-center justify-center hover:-translate-y-1 hover:scale-105 hover:shadow-lg transition-all duration-300 whitespace-nowrap"
            >
              <Image
                alt="Special Sweets"
                width={24}
                height={24}
                src="/categories/TokDoi.png"
              />
              Special Sweets
            </Link>

            <Link
              href="/categories/Laddu"
              className="text-red-900 flex gap-1 items-center justify-center hover:-translate-y-1 hover:scale-105 hover:shadow-lg transition-all duration-300 whitespace-nowrap"
            >
              <Image
                alt="Laddu"
                width={24}
                height={24}
                src="/categories/traditionalsweets.webp"
              />
              Laddu
            </Link>

            <Link
              href="/categories/Curd"
              className="text-red-900 flex gap-1 items-center justify-center hover:-translate-y-1 hover:scale-105 hover:shadow-lg transition-all duration-300 whitespace-nowrap"
            >
              <Image
                alt="Curd"
                width={24}
                height={24}
                src="/categories/curd.png"
              />
              Curd
            </Link>

            <Link
              href="/categories/TraditionalSweets"
              className="text-red-900 flex gap-1 items-center justify-center hover:-translate-y-1 hover:scale-105 hover:shadow-lg transition-all duration-300 whitespace-nowrap"
            >
              <Image
                alt="Traditional Sweets"
                width={24}
                height={24}
                src="/categories/ts.jpg"
              />
              Traditional Sweets
            </Link>

            <Link
              href="/categories/DryItem"
              className="text-red-900 flex gap-1 items-center justify-center hover:-translate-y-1 hover:scale-105 hover:shadow-lg transition-all duration-300 whitespace-nowrap"
            >
              <Image
                alt="Dry item"
                width={24}
                height={24}
                src="/categories/Dryitem.png"
              />
              Dry item
            </Link>

            <Link
              href="/categories/Shondesh"
              className="text-red-900 flex gap-1 items-center justify-center hover:-translate-y-1 hover:scale-105 hover:shadow-lg transition-all duration-300 whitespace-nowrap"
            >
              <Image
                alt="Shondesh"
                width={24}
                height={24}
                src="/categories/Shondesh.png"
              />
              Shondesh
            </Link>
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
