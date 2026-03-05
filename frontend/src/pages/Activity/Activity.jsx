import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Activity() {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('All');
    const { token, user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchActivities = async () => {
            try {
                const res = await axios.get('http://localhost:5000/api/activity', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.data.success) {
                    setActivities(res.data.data);
                }
            } catch (err) {
                console.error("Failed to fetch activity", err);
            } finally {
                setLoading(false);
            }
        };
        fetchActivities();
    }, [token]);

    const filteredActivities = activities.filter(act => {
        if (filter === 'All') return true;
        if (filter === 'Tasks') return act.entityType === 'task' || act.action.toLowerCase().includes('task');
        if (filter === 'Projects') return act.entityType === 'project' || act.action.toLowerCase().includes('project');
        if (filter === 'Comments') return act.action.toLowerCase().includes('comment');
        return true;
    });

    // Group activities by date
    const groupedActivities = filteredActivities.reduce((groups, act) => {
        const dateStr = new Date(act.createdAt).toDateString() === new Date().toDateString() ? 'Today' :
            new Date(act.createdAt).toDateString() === new Date(Date.now() - 86400000).toDateString() ? 'Yesterday' :
                new Date(act.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });

        if (!groups[dateStr]) groups[dateStr] = [];
        groups[dateStr].push(act);
        return groups;
    }, {});

    const getStatusStyle = (action) => {
        const a = action.toLowerCase();
        if (a.includes('in progress')) return 'bg-blue-500/10 text-blue-600 ring-blue-500/20 shadow-blue-500/5';
        if (a.includes('todo') || a.includes('pending')) return 'bg-slate-500/10 text-slate-600 ring-slate-500/20 shadow-slate-500/5';
        if (a.includes('review')) return 'bg-amber-500/10 text-amber-600 ring-amber-500/20 shadow-amber-500/5';
        if (a.includes('done') || a.includes('completed') || a.includes('success')) return 'bg-teal-500/10 text-teal-600 ring-teal-500/20 shadow-teal-500/5';
        return 'bg-slate-500/10 text-slate-600 ring-slate-500/20';
    };

    const getActionIcon = (action) => {
        const a = action.toLowerCase();
        if (a.includes('status')) return <path d="M13 5l7 7-7 7M5 5l7 7-7 7" strokeWidth={2.5} />;
        if (a.includes('created') || a.includes('added')) return <path d="M12 4v16m8-8H4" strokeWidth={3} />;
        if (a.includes('comment')) return <path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" strokeWidth={2} />;
        return <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" strokeWidth={2} />;
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-12 h-12 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="max-w-[1300px] mx-auto pb-20 animate-fade-in font-sans">
            {/* Attractive Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-8 rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/40 mb-10 mt-6 gap-6 overflow-hidden relative group">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-teal-50 rounded-full blur-3xl opacity-50 group-hover:opacity-80 transition-opacity"></div>
                <div className="relative z-10 flex-1 text-center md:text-left">
                    <h1 className="text-[32px] font-heading font-black text-slate-900 tracking-tight leading-none mb-2">Activity Stream</h1>
                    <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px]">Everything happening in your workspace</p>
                </div>

                <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl relative z-10">
                    {['All', 'Tasks', 'Projects', 'Comments'].map(f => (
                        <button key={f} onClick={() => setFilter(f)}
                            className={`px-5 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-white text-teal-600 shadow-md ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {filteredActivities.length === 0 ? (
                <div className="py-32 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-100">
                    <p className="text-slate-400 font-black uppercase tracking-widest">No matching activities found</p>
                </div>
            ) : (
                <div className="space-y-12">
                    {Object.entries(groupedActivities).map(([date, items]) => (
                        <div key={date}>
                            {/* Stylish Date Separator */}
                            <div className="flex items-center gap-4 mb-8">
                                <span className={`text-[12px] font-black uppercase tracking-[0.3em] whitespace-nowrap ${date === 'Today' ? 'text-teal-600' : 'text-slate-400'}`}>
                                    {date}
                                </span>
                                <div className="h-[1px] flex-1 bg-gradient-to-r from-slate-100 to-transparent"></div>
                            </div>

                            <div className="space-y-4">
                                {items.map((act) => {
                                    const isStatus = act.action.toLowerCase().includes('status');
                                    const actionText = act.action.replace('You ', '').replace(`${act.user?.fullName} `, '');

                                    return (
                                        <div key={act._id} className="group relative bg-white p-5 rounded-[28px] border border-slate-100 hover:border-teal-200 shadow-sm hover:shadow-xl hover:shadow-teal-500/5 transition-all duration-300">
                                            <div className="flex gap-5">
                                                {/* Left: User Avatar & Icon Overlay */}
                                                <div className="relative shrink-0">
                                                    <div className="w-12 h-12 rounded-[18px] bg-slate-900 text-white flex items-center justify-center font-black text-[14px] shadow-lg border border-slate-800 rotate-2 group-hover:rotate-0 transition-transform">
                                                        {act.user?.fullName?.charAt(0) || '?'}
                                                    </div>
                                                    <div className={`absolute -right-1.5 -bottom-1.5 w-6 h-6 rounded-lg ${isStatus ? 'bg-teal-500' : 'bg-slate-700'} text-white flex items-center justify-center shadow-lg ring-2 ring-white p-1`}>
                                                        <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">{getActionIcon(act.action)}</svg>
                                                    </div>
                                                </div>

                                                {/* Middle: Activity Content */}
                                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                    <div className="flex justify-between items-start gap-4 mb-1">
                                                        <p className="text-[14px] font-bold text-slate-900">
                                                            {act.user?.fullName}
                                                            {act.user?._id === user?._id && <span className="ml-2 px-1.5 py-0.5 rounded bg-teal-50 text-teal-600 text-[8px] font-black tracking-tighter uppercase ring-1 ring-teal-100">You</span>}
                                                        </p>
                                                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
                                                        <span className="text-[14px] font-medium text-slate-500">
                                                            {isStatus ? 'migrated' : actionText.split(' ').slice(0, 2).join(' ')}
                                                        </span>

                                                        {isStatus ? (
                                                            <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ring-1 shadow-sm ${getStatusStyle(act.action)}`}>
                                                                {act.action.split(' ').pop()}
                                                            </div>
                                                        ) : (
                                                            <span className="text-[14px] font-black text-slate-800 border-b-2 border-slate-100 group-hover:border-teal-300 transition-all cursor-default">
                                                                {act.targetName || 'Workspace'}
                                                            </span>
                                                        )}

                                                        {isStatus && (
                                                            <span className="text-[14px] font-medium text-slate-500">
                                                                &bull; {act.targetName}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Right: ID Badge */}
                                                <div className="hidden sm:flex items-center self-center h-fit px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100 text-[10px] font-black text-slate-300 uppercase tracking-tighter">
                                                    #{act._id?.slice(-4)}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
