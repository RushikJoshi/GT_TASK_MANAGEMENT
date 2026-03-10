import React, { useEffect, useState } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';

export default function Notifications() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const { token } = useAuth();

    useEffect(() => {
        fetchNotifications();
    }, [token]);

    const fetchNotifications = async () => {
        try {
            const res = await axiosInstance.get('/notifications');
            if (res.data.success) {
                setNotifications(res.data.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (id) => {
        try {
            await axiosInstance.put(`/notifications/${id}/read`);
            setNotifications(prev =>
                prev.map(n => n._id === id ? { ...n, isRead: true } : n)
            );
        } catch (err) {
            console.error(err);
        }
    };

    const markAllRead = async () => {
        // Just for UI logic since we only have single read API
        const unread = notifications.filter(n => !n.isRead);
        for (const n of unread) {
            markAsRead(n._id);
        }
    }

    // Grouping by date
    const groupedNotifications = notifications.reduce((groups, n) => {
        const date = new Date(n.createdAt);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        let dateStr;
        if (date.toDateString() === today.toDateString()) {
            dateStr = 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            dateStr = 'Yesterday';
        } else {
            dateStr = date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
        }

        if (!groups[dateStr]) groups[dateStr] = [];
        groups[dateStr].push(n);
        return groups;
    }, {});

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-medium animate-pulse">Loading alerts...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-[1000px] mx-auto pb-12 animate-fade-in font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3 mb-10 mt-4">
                <div>
                    <h1 className="text-[28px] md:text-[32px] font-heading font-black text-slate-900 tracking-tight">
                        Notifications
                    </h1>
                    <p className="text-[15px] font-medium text-slate-500 mt-1 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
                        Stay updated with real-time feedback and assignments.
                    </p>
                </div>
                {notifications.some(n => !n.isRead) && (
                    <button onClick={markAllRead} className="text-[12px] font-black text-teal-600 hover:text-teal-700 uppercase tracking-widest bg-teal-50 hover:bg-teal-100 px-5 py-2.5 rounded-xl border border-teal-100 transition-all shadow-sm">
                        Mark all as read
                    </button>
                )}
            </div>

            {notifications.length === 0 ? (
                <div className="bg-white rounded-[32px] border border-dashed border-slate-200 p-20 text-center">
                    <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                    </div>
                    <h3 className="text-[20px] font-heading font-extrabold text-slate-800 tracking-tight">All caught up!</h3>
                    <p className="text-slate-500 mt-2 font-medium max-w-xs mx-auto">You have no new notifications. New alerts will appear here as they happen.</p>
                </div>
            ) : (
                <div className="space-y-12">
                    {Object.entries(groupedNotifications).map(([date, items]) => (
                        <div key={date}>
                            <div className="flex items-center gap-4 mb-6">
                                <span className={`text-[12px] font-black uppercase tracking-widest ${date === 'Today' ? 'text-teal-600' : 'text-slate-400'}`}>{date}</span>
                                <div className="h-px flex-1 bg-slate-100"></div>
                            </div>

                            <div className="space-y-3">
                                {items.map(n => (
                                    <div
                                        key={n._id}
                                        className={`group relative bg-white p-5 rounded-[24px] border transition-all duration-300 flex items-start gap-5 hover:translate-x-1 ${!n.isRead ? 'border-teal-100/80 shadow-md shadow-teal-500/5 bg-gradient-to-br from-white to-teal-50/10' : 'border-slate-100 shadow-sm hover:border-slate-200 hover:shadow-md'}`}
                                    >
                                        {/* Status Indicator Bar */}
                                        {!n.isRead && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-10 bg-teal-500 rounded-r-full shadow-lg shadow-teal-500/50"></div>}

                                        {/* Icon/Avatar */}
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-transform duration-300 group-hover:scale-105 ${!n.isRead ? 'bg-teal-50 border-teal-100 text-teal-600 shadow-sm' : 'bg-slate-50 border-slate-100 text-slate-400 opacity-60'}`}>
                                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                {n.type === 'task' ? (
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                                ) : n.type === 'project' ? (
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                                ) : (
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                                )}
                                            </svg>
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 pt-1">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                                <h4 className={`text-[16px] font-bold tracking-tight leading-none ${!n.isRead ? 'text-slate-900' : 'text-slate-600'}`}>
                                                    {n.title}
                                                </h4>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                                                    {new Date(n.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <p className={`text-[14px] leading-relaxed font-medium ${!n.isRead ? 'text-slate-600' : 'text-slate-500'}`}>
                                                {n.message}
                                            </p>
                                        </div>

                                        {/* Actions */}
                                        <div className="shrink-0 flex items-center self-center">
                                            {!n.isRead ? (
                                                <button
                                                    onClick={() => markAsRead(n._id)}
                                                    className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center hover:bg-teal-600 hover:text-white transition-all duration-300 shadow-sm border border-teal-100/50"
                                                    title="Mark as read"
                                                >
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                </button>
                                            ) : (
                                                <div className="w-10 h-10 flex items-center justify-center text-slate-200">
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
