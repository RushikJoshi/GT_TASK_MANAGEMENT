import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';

export default function DashboardLayout() {
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    return (
        <div className="flex h-screen bg-white overflow-hidden font-sans selection:bg-teal-200 selection:text-teal-900">
            {/* Sidebar receives mobile toggle state */}
            <Sidebar isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />

            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/40 z-30 md:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            <div className="flex flex-col flex-1 min-w-0 transition-all duration-300 ease-in-out bg-[#fcfcfc]">
                <Navbar onToggleSidebar={() => setIsMobileOpen(true)} />
                <main className="flex-1 overflow-y-auto overflow-x-hidden hide-scrollbar scroll-smooth">
                    <div className="p-4 sm:p-6 lg:p-10 max-w-[1920px] mx-auto pb-20">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
