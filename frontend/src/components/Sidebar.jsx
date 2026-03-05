import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Sidebar() {
    const { role } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Base items
    const defaultDashboardPath = role === 'admin' ? '/admin' : role === 'manager' ? '/dashboard' : '/employee-dashboard';

    let navItems = [
        { name: 'Dashboard', path: defaultDashboardPath, icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /> },
    ];

    if (role === 'admin') {
        navItems.push({ name: 'Users', path: '/admin/users', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /> });
        navItems.push({ name: 'Create User', path: '/admin/create-user', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /> });
    }

    navItems.push({ name: 'Projects', path: '/projects', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /> });
    navItems.push({ name: 'Tasks', path: '/tasks', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /> });
    navItems.push({ name: 'Quick Tasks', path: '/quick-tasks', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /> });
    navItems.push({ name: 'Activity', path: '/activity', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /> });
    navItems.push({ name: 'Notifications', path: '/notifications', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m-9-11a2 2 0 11-4 0 2 2 0 014 0z" /> });

    return (
        <div className="w-16 md:w-[260px] bg-white border-r border-slate-200/50 flex flex-col py-6 shrink-0 z-20 transition-all duration-300 relative">

            {/* Logo Section */}
            <div className="flex items-center gap-3.5 px-6 mb-10 cursor-pointer group" onClick={() => navigate(defaultDashboardPath)}>
                <div className="w-9 h-9 bg-gradient-to-br from-teal-400 to-teal-600 rounded-xl flex items-center justify-center text-white font-bold shadow-md shadow-teal-500/20 group-hover:shadow-teal-500/30 group-hover:-translate-y-0.5 transition-all duration-300 shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                </div>
                <span className="font-heading font-bold text-slate-800 tracking-tight hidden md:block text-[19px]">
                    {role === 'admin' ? 'Admin Panel' : role === 'manager' ? 'Manager Panel' : 'Employee Panel'}
                </span>
            </div>

            {/* Nav Items */}
            <nav className="flex flex-col gap-1 w-full px-4">
                {navItems.map((item, i) => {
                    const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                    return (
                        <div
                            key={i}
                            onClick={() => navigate(item.path)}
                            className={`group relative flex items-center md:justify-start justify-center w-full h-11 px-3.5 rounded-xl cursor-pointer transition-all duration-200 font-medium text-[13px] tracking-wide ${isActive ? 'bg-teal-50/50 text-teal-700 shadow-sm shadow-teal-100/50' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                        >
                            <svg className={`shrink-0 w-5 h-5 md:mr-3.5 transition-colors ${isActive ? 'text-teal-600' : 'text-slate-400 group-hover:text-slate-700'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                {item.icon}
                            </svg>
                            <span className="hidden md:block transition-transform duration-200 group-hover:translate-x-0.5">{item.name}</span>

                            {/* Mobile Tooltip */}
                            <div className="md:hidden absolute left-[calc(100%+14px)] px-3 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg">
                                {item.name}
                                <div className="absolute top-1/2 -left-1 -translate-y-1/2 border-4 border-transparent border-r-slate-800" />
                            </div>

                            {/* Active Indicator on Left */}
                            {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-teal-500 rounded-r-lg" />}
                        </div>
                    );
                })}
            </nav>

            <div className="mt-auto flex flex-col gap-2 w-full px-4 pt-5 border-t border-slate-100/60 mt-6">
                {/* Settings */}
                {role === 'admin' && (
                    <div onClick={() => navigate('/settings')} className="group relative flex items-center md:justify-start justify-center w-full h-11 px-3.5 rounded-xl cursor-pointer transition-all duration-200 font-medium text-[13px] tracking-wide text-slate-500 hover:bg-slate-50 hover:text-slate-900">
                        <svg className="shrink-0 w-5 h-5 md:mr-3.5 text-slate-400 group-hover:text-slate-700 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="hidden md:block transition-transform duration-200 group-hover:translate-x-0.5">Settings</span>

                        {/* Mobile Tooltip */}
                        <div className="md:hidden absolute left-[calc(100%+14px)] px-3 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg">
                            Settings
                            <div className="absolute top-1/2 -left-1 -translate-y-1/2 border-4 border-transparent border-r-slate-800" />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
