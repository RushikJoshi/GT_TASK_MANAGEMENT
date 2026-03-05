import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';

export default function DashboardLayout() {
    return (
        <div className="flex h-screen bg-white overflow-hidden font-sans selection:bg-yellow-200 selection:text-gray-900">
            <Sidebar />
            <div className="flex flex-col flex-1 w-full transition-all duration-300 bg-[#fcfcfc]">
                <Navbar />
                <main className="flex-1 overflow-y-auto overflow-x-hidden hide-scrollbar">
                    <div className="p-6 lg:p-10 max-w-[1920px] mx-auto pb-20">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
