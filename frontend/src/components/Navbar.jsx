import React, { useState, useRef, useEffect } from "react";
import { CiMenuFries } from "react-icons/ci";
import logo from "/bspLogo.png";
import { Bell, CircleUserRound, Home, Zap, Newspaper, Store, Sun, Moon, LogOut } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { useAuth } from "../App";

const Navbar = () => {
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [isProfileOpen, setProfileOpen] = useState(false);
    const profileRef = useRef(null);
    const location = useLocation();
    const { currentUser, loading, error, logout } = useAuth();

    const localUserName = localStorage.getItem('name');
    const localUserEmail = localStorage.getItem('email');

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setProfileOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [profileRef]);


    const navItems = [
        { name: "Dashboard", icon: <Home size={18} />, path: "/dashboard" },
        { name: "All Sales", icon: <Zap size={18} />, path: "/sale/all" },
        { name: "POS", icon: <Store size={18} />, path: "/sale/pos" },
    ];

    const isActive = (path) => {
        return location.pathname === path;
    };

    return (
        <>
            {/* Glass Navbar */}
            <nav className="w-full rounded-2xl mx-2 mt-2 px-4 md:px-8 py-3 backdrop-blur-xl border border-white/20 shadow-xl bg-white/70 z-50 relative">
                <div className="flex items-center justify-between w-full">
                    
                    {/* Logo and Brand */}
                    <div className="flex items-center gap-4">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-white/30 backdrop-blur-md bg-white/90 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
                            <img src={logo} alt="BSP Logo" className="w-12 h-12 object-contain" />
                        </div>
                        {/* <div className="hidden md:block">
                            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                BSP
                            </h1>
                            <p className="text-xs text-gray-500">Inventory Management System</p>
                        </div> */}
                    </div>

                    {/* Desktop Navigation */}
                    <ul className="items-center gap-1 text-sm font-medium hidden md:flex">
                        {navItems.map((item) => (
                            <li key={item.name}>
                                <Link
                                    to={item.path}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300 backdrop-blur-sm bg-white/50 hover:bg-white/80 hover:translate-y-[-1px] hover:shadow-[0_5px_15px_rgba(0,0,0,0.05)] ${
                                        isActive(item.path)
                                            ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-600 border border-blue-500/30'
                                            : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                >
                                    <span className={isActive(item.path) ? "text-blue-500" : "text-gray-500"}>
                                        {item.icon}
                                    </span>
                                    {item.name}
                                </Link>
                            </li>
                        ))}
                    </ul>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3">
                        
                        

                        {/* Notifications */}
                        <Link to="/notifications">
                            <div className="relative">
                                <button className="p-2.5 rounded-xl bg-gradient-to-r from-purple-500/10 to-purple-600/10 hover:from-purple-500/20 hover:to-purple-600/20 text-purple-600 hover:text-purple-700 transition-all duration-300 relative backdrop-blur-sm bg-white/70 border border-white/20 hover:bg-white/90 hover:translate-y-[-1px] hover:shadow-[0_5px_15px_rgba(0,0,0,0.1)]">
                                    <Bell size={20} />
                                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-r from-red-500 to-red-600 text-white text-xs flex items-center justify-center shadow-[0_2px_8px_rgba(255,71,87,0.3)]">
                                        3
                                    </span>
                                </button>
                            </div>
                        </Link>

                        {/* User Profile Dropdown */}
                        <div className="relative" ref={profileRef}>
                            <button
                                onClick={() => setProfileOpen(!isProfileOpen)}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 hover:from-blue-500/20 hover:to-purple-500/20 border border-white/30 transition-all duration-300 group backdrop-blur-sm bg-white/80 hover:bg-white/95 hover:translate-y-[-1px] hover:shadow-[0_5px_20px_rgba(59,157,248,0.2)]"
                            >
                                <div className="p-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 shadow-[0_4px_12px_rgba(59,157,248,0.3)]">
                                    <CircleUserRound size={20} className="text-white" />
                                </div>
                                <div className="text-left hidden md:block">
                                    <p className="text-sm font-semibold text-gray-800">{loading ? "Loading..." : currentUser?.name || localUserName || "Guest"}</p>
                                    <p className="text-xs text-gray-500">{loading ? "..." : currentUser?.email || localUserEmail || "..."}</p>
                                </div>
                            </button>
                            {isProfileOpen && (currentUser || localUserName) && (
                                <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl bg-white/95 backdrop-blur-md border border-gray-200 shadow-xl focus:outline-none z-[1000]">
                                    <div className="py-1">
                                        
                                        <Link
                                            to="/profile"
                                            className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-white/50"
                                            onClick={() => setProfileOpen(false)}
                                        >
                                            <CircleUserRound size={16} />
                                            <span>Your Profile</span>
                                        </Link>
                                        <Link
                                            to="/settings"
                                            className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-white/50"
                                            onClick={() => setProfileOpen(false)}
                                        >
                                            <Zap size={16} />
                                            <span>Settings</span>
                                        </Link>
                                        <button
                                            onClick={() => {
                                                logout(); // Call the logout function from useAuth
                                                setProfileOpen(false);
                                            }}
                                            className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-white/50 hover:cursor-pointer"
                                        >
                                            <LogOut size={16} />
                                            <span>Logout</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>


                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
                            className="p-2.5 rounded-xl bg-gradient-to-r from-gray-500/10 to-gray-600/10 hover:from-gray-500/20 hover:to-gray-600/20 text-gray-600 hover:text-gray-700 transition-all duration-300 md:hidden backdrop-blur-sm bg-white/70 border border-white/20 hover:bg-white/90 hover:translate-y-[-1px] hover:shadow-[0_5px_15px_rgba(0,0,0,0.1)]"
                            title="Menu"
                        >
                            <CiMenuFries size={24} />
                        </button>
                    </div>
                </div>
            </nav>

            {/* Mobile Sidebar */}
            <aside
                className={`fixed inset-y-0 right-0 w-80 border-l border-white/20 backdrop-blur-xl shadow-2xl z-50 transform transition-transform duration-300 ease-in-out bg-white/90 ${
                    mobileSidebarOpen ? "translate-x-0" : "translate-x-full"
                } md:hidden`}
            >
                <div className="p-6 h-full overflow-y-auto">
                    {/* Mobile Sidebar Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-md bg-white/90 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
                                <img src={logo} alt="Logo" className="w-10 h-10" />
                            </div>
                            <div>
                                <h2 className="font-bold text-lg text-gray-800">Menu</h2>
                                <p className="text-xs text-gray-500">Navigation</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setMobileSidebarOpen(false)}
                            className="p-2 rounded-lg hover:text-red-600 backdrop-blur-sm bg-white/70 border border-white/20 hover:bg-white/90"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Mobile Navigation */}
                    <nav className="space-y-1 mb-8">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">
                            Navigation
                        </h3>
                        {navItems.map((item) => (
                            <Link
                                key={item.name}
                                to={item.path}
                                onClick={() => setMobileSidebarOpen(false)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                                    isActive(item.path)
                                        ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-600 border border-blue-500/30'
                                        : 'text-gray-700 hover:bg-white/30'
                                }`}
                            >
                                <div className={`p-2 rounded-lg ${
                                    isActive(item.path) 
                                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-[0_4px_12px_rgba(59,157,248,0.3)]' 
                                        : 'bg-gray-100/50 text-gray-600'
                                }`}>
                                    {item.icon}
                                </div>
                                <span className="font-medium">{item.name}</span>
                            </Link>
                        ))}
                    </nav>

                    {/* Quick Actions */}
                    <div className="mb-8">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">
                            Quick Actions
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                            <button className="p-3 rounded-xl text-center hover:bg-white/20 transition-colors backdrop-blur-sm bg-white/70 border border-white/20">
                                <div className="p-2 rounded-lg bg-gradient-to-r from-green-500/10 to-green-600/10 text-green-600 inline-flex mb-2">
                                    <Zap size={18} />
                                </div>
                                <p className="text-xs font-medium text-gray-700">New Order</p>
                            </button>
                            <button className="p-3 rounded-xl text-center hover:bg-white/20 transition-colors backdrop-blur-sm bg-white/70 border border-white/20">
                                <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500/10 to-blue-600/10 text-blue-600 inline-flex mb-2">
                                    <Store size={18} />
                                </div>
                                <p className="text-xs font-medium text-gray-700">Add Product</p>
                            </button>
                        </div>
                    </div>

                    {/* System Status */}
                    <div className="p-4 rounded-xl mb-8 bg-gradient-to-r from-blue-500/5 to-purple-500/5 backdrop-blur-sm bg-white/70 border border-white/20">
                        <h4 className="font-medium text-gray-800 mb-2">System Status</h4>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Uptime</span>
                            <span className="font-semibold text-green-600">99.8%</span>
                        </div>
                        <div className="flex items-center justify-between text-sm mt-1">
                            <span className="text-gray-600">Users Online</span>
                            <span className="font-semibold text-blue-600">24</span>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="pt-4 border-t border-white/10">
                        <p className="text-xs text-gray-500 text-center">
                            © 2024 Business Suite Pro. All rights reserved.
                        </p>
                    </div>
                </div>
            </aside>

            {/* Mobile Sidebar Backdrop */}
            {mobileSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
                    onClick={() => setMobileSidebarOpen(false)}
                />
            )}
        </>
    );
};

export default Navbar;
