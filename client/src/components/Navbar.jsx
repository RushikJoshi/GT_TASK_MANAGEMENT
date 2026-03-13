import React, { useEffect, useState } from 'react';
import Input from './UI/Input';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { notificationApi } from '../api/notification.api';

export default function Navbar({ onToggleSidebar }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [unreadCount, setUnreadCount] = useState(0);

    const [searchText, setSearchText] = useState('');

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSearchText(params.get('search') || '');
    }, [location.search]);

    const handleSearchSubmit = () => {
        const trimmed = searchText.trim();
        const params = new URLSearchParams();
        if (trimmed) params.set('search', trimmed);

        const basePath = location.pathname;
        const allowedPaths = ['/tasks', '/quick-tasks', '/projects', '/activity', '/notifications'];
        const targetPath = allowedPaths.includes(basePath) ? basePath : '/tasks';

        navigate({ pathname: targetPath, search: params.toString() ? `?${params.toString()}` : '' });
    };

    const handleSearchKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSearchSubmit();
        }
    };

    useEffect(() => {
        const fetchUnread = async () => {
            try {
                const res = await notificationApi.getAll();
                if (res.success) {
                    setUnreadCount(res.data.filter(n => !n.isRead).length);
                }
            } catch (_err) {
                // ignore
            }
        };

        fetchUnread();
        const interval = setInterval(fetchUnread, 30000); // refresh every 30s
        return () => clearInterval(interval);
    }, []);

    const searchIcon = (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
    );

    const userName = user?.fullName || 'User';
    const userRole = user?.role || 'Member';
    const userAvatar = user?.avatar || `https://ui-avatars.com/api/?name=${userName}&background=random`;

    return (
        <header className="h-[68px] bg-white/80 backdrop-blur-2xl sticky top-0 z-10 flex items-center justify-between px-8 border-b border-slate-200/50 shadow-sm transition-all duration-300">

            <div className="flex-1 max-w-md hidden md:block">
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-hover:text-teal-500 transition-colors duration-300">
                        {searchIcon}
                    </div>
                    <input
                        type="text"
                        placeholder="Search tasks, projects, or commands..."
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50/50 border border-slate-200 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500/50 hover:bg-white hover:shadow-sm transition-all duration-300 text-slate-700 placeholder-slate-400"
                    />
                </div>
            </div>

            <div className="flex font-heading font-semibold text-xl md:hidden text-slate-800 tracking-tight items-center gap-3">
                <button onClick={onToggleSidebar} className="p-1 -ml-1 text-slate-500 hover:text-teal-600 focus:outline-none transition-colors">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
                Dashboard
            </div>

            <div className="flex items-center gap-3 md:gap-5">


                {/* Notifications */}
                <button
                    onClick={() => navigate('/notifications')}
                    className="relative p-2 text-slate-400 hover:text-teal-600 transition-all duration-300 rounded-full hover:bg-teal-50 flex items-center justify-center cursor-pointer"
                    title="Notifications"
                >
                    {unreadCount > 0 ? (
                        <span className="absolute top-5 right-1 min-w-[5px] h-3 px-1.5 bg-rose-500 text-[10px] font-bold text-white rounded-full flex items-center justify-center ring-2 ring-white">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    ) : (
                        <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white opacity-50"></span>
                    )}
                    <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m-9-11a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                </button>

                <div className="h-5 w-[1px] bg-slate-200 hidden md:block mx-1"></div>

                <div
                    className="flex items-center gap-3 cursor-pointer group px-1 py-1 rounded-full hover:bg-slate-50 transition-colors"
                    onClick={() => navigate('/profile')}
                >
                    <div className="relative">
                        <img src={userAvatar} alt="Profile" className="w-[38px] h-[38px] rounded-full border border-slate-200 object-cover shadow-sm group-hover:ring-4 ring-teal-50 transition-all duration-300" />
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white"></div>
                    </div>
                    <div className="hidden md:flex flex-col pr-1">
                        <p className="text-slate-800 text-[13px] font-semibold leading-tight group-hover:text-teal-700 transition-colors">{userName}</p>
                        <p className="text-slate-500 text-[11px] font-medium tracking-wide uppercase mt-0.5">{userRole}</p>
                    </div>
                </div>

                {/* Logout Button */}
                <button
                    onClick={() => {
                        logout();
                        navigate('/employee-login');
                    }}
                    className="ml-1 text-slate-400 hover:text-rose-600 transition-all duration-300 p-2 rounded-full hover:bg-rose-50 flex items-center justify-center group"
                    title="Log out"
                >
                    <svg className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                </button>
            </div>
        </header>
    );
}
