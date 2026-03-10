import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import axiosInstance from '../../api/axiosInstance';
import { useNavigate, Link } from 'react-router-dom';


export default function EmployeeDashboard() {
    const { user, token } = useAuth();
    const navigate = useNavigate();

    // State for dashboard data
    const [tasks, setTasks] = useState([]);
    const [projects, setProjects] = useState([]);
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [missingTasks, setMissingTasks] = useState([]);
    const [showReminder, setShowReminder] = useState(false);

    useEffect(() => {
        if (token) {
            fetchDashboardData();
            checkReports();
        }
    }, [token]);

    const checkReports = async () => {
        try {
            const res = await axiosInstance.get('/daily-reports/check-today');
            if (res.data.success && res.data.data && !res.data.data.isSubmittedToday) {
                setMissingTasks(res.data.data.missingTasks || []);
                // Only show reminder if not already shown in this session
                const alreadyShown = sessionStorage.getItem('dailyReminderShown');
                if (!alreadyShown) {
                    setShowReminder(true);
                    sessionStorage.setItem('dailyReminderShown', 'true');
                }
            }
        } catch (err) {
            console.error("Error checking reports:", err);
        }
    };

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const [tasksRes, projectsRes, activityRes] = await Promise.all([
                axiosInstance.get('/tasks'),
                axiosInstance.get('/projects'),
                axiosInstance.get('/activity')
            ]);

            if (tasksRes.data.success) setTasks(tasksRes.data.data);
            if (projectsRes.data.success) setProjects(projectsRes.data.data);
            if (activityRes.data.success) setActivities(activityRes.data.data);
        } catch (err) {
            console.error("Error fetching dashboard data:", err);
        } finally {
            setLoading(false);
        }
    };

    // Calculate Statistics
    const stats = {
        total: tasks.length,
        dueToday: tasks.filter(t => {
            if (!t.dueDate) return false;
            const now = new Date();
            const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const due = new Date(t.dueDate);
            const dueStr = `${due.getUTCFullYear()}-${String(due.getUTCMonth() + 1).padStart(2, '0')}-${String(due.getUTCDate()).padStart(2, '0')}`;
            return dueStr === todayStr;
        }).length,
        inProgress: tasks.filter(t => t.status === 'In Progress').length,
        completed: tasks.filter(t => t.status === 'Completed' || t.status === 'Done').length,
        upcoming: tasks.filter(t => {
            if (!t.dueDate || t.status === 'Completed' || t.status === 'Done') return false;
            const now = new Date();
            const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const due = new Date(t.dueDate);
            const dueStr = `${due.getUTCFullYear()}-${String(due.getUTCMonth() + 1).padStart(2, '0')}-${String(due.getUTCDate()).padStart(2, '0')}`;
            return dueStr > todayStr && due <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        }).length
    };

    // Task Distribution for Donut Chart
    const statusCounts = {
        todo: tasks.filter(t => t.status === 'To Do' || t.status === 'Planning').length,
        inProgress: tasks.filter(t => t.status === 'In Progress').length,
        review: tasks.filter(t => t.status === 'Review').length,
        completed: tasks.filter(t => t.status === 'Completed' || t.status === 'Done').length
    };

    const totalStatus = tasks.length || 1; // Avoid division by zero
    const statusPercentages = {
        todo: (statusCounts.todo / totalStatus) * 100,
        inProgress: (statusCounts.inProgress / totalStatus) * 100,
        review: (statusCounts.review / totalStatus) * 100,
        completed: (statusCounts.completed / totalStatus) * 100
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-medium animate-pulse">Building your workspace...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-[1600px] mx-auto pb-12 animate-fade-in font-sans space-y-8">
            {/* 1. Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-2">
                <div>
                    <h1 className="text-[28px] md:text-[32px] font-heading font-extrabold text-slate-900 tracking-tight">
                        {(() => { const h = new Date().getHours(); return h >= 5 && h < 12 ? 'Good Morning' : h >= 12 && h < 17 ? 'Good Afternoon' : 'Good Evening'; })()}, {user?.fullName?.split(' ')[0] || 'Employee'}!
                    </h1>
                    <p className="text-[15px] font-medium text-slate-500 mt-1.5 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Here's what's happening with your projects today.
                    </p>
                </div>
                <div className="hidden lg:flex items-center gap-3">
                    <div className="flex -space-x-2">
                        {projects.slice(0, 3).map((p, i) => (
                            <div key={i} className="w-8 h-8 rounded-full bg-teal-50 border-2 border-white flex items-center justify-center text-[10px] font-bold text-teal-700 shadow-sm" title={p.name}>
                                {p.name?.charAt(0)}
                            </div>
                        ))}
                    </div>
                    <span className="text-[13px] font-bold text-slate-400 uppercase tracking-wider">Active Projects</span>
                </div>
            </div>

            {/* 2. Stat Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                    { label: 'Total Tasks', value: stats.total, color: 'bg-indigo-50 text-indigo-700 border-indigo-100', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
                    { label: 'Due Today', value: stats.dueToday, color: 'bg-rose-50 text-rose-700 border-rose-100', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
                    { label: 'In Progress', value: stats.inProgress, color: 'bg-blue-50 text-blue-700 border-blue-100', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
                    { label: 'Completed', value: stats.completed, color: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
                    { label: 'Upcoming', value: stats.upcoming, color: 'bg-amber-50 text-amber-700 border-amber-100', icon: 'M13 10V3L4 14h7v7l9-11h-7z' }
                ].map((stat, i) => (
                    <div key={i} className={`p-5 rounded-[20px] bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 group`}>
                        <div className="flex items-center justify-between mb-3">
                            <div className={`p-2.5 rounded-xl ${stat.color} transition-colors group-hover:scale-110 duration-300`}>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} /></svg>
                            </div>
                            <span className="text-[22px] font-heading font-black text-slate-800">{stat.value}</span>
                        </div>
                        <p className="text-[13px] font-bold text-slate-500 uppercase tracking-widest">{stat.label}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* LEFT COLUMN: Tasks and Projects */}
                <div className="lg:col-span-8 space-y-8">
                    {/* 3. My Tasks Preview Table */}
                    <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                        <div className="px-6 py-5 border-b border-slate-50 flex justify-between items-center bg-white/50">
                            <h2 className="text-[18px] font-heading font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                                <span className="w-2 h-6 bg-teal-500 rounded-full"></span>
                                My Recent Tasks
                            </h2>
                            <Link to="/tasks" className="text-[12px] font-bold text-teal-600 hover:text-teal-700 uppercase tracking-widest flex items-center gap-1.5 transition-colors group">
                                View All Tasks
                                <svg className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                            </Link>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-50 bg-slate-50/30">
                                        <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Task Name</th>
                                        <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Project</th>
                                        <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Priority</th>
                                        <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                                        <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-right">Due Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {tasks.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-12 text-center text-slate-400 font-medium italic">No tasks assigned to you yet.</td>
                                        </tr>
                                    ) : tasks.slice(0, 5).map(task => (
                                        <tr key={task._id} onClick={() => navigate(`/tasks/${task._id}`)} className="group hover:bg-slate-50/50 cursor-pointer transition-colors duration-200">
                                            <td className="px-6 py-4">
                                                <p className="font-bold text-slate-800 text-[14px] group-hover:text-teal-600 transition-colors truncate max-w-[200px] leading-tight">{task.title}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-[13px] font-semibold text-slate-500">{task.project?.name || 'Isolated'}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border border-opacity-50 ${task.priority === 'High' ? 'text-rose-600 bg-rose-50 border-rose-100' : task.priority === 'Medium' ? 'text-amber-600 bg-amber-50 border-amber-100' : 'text-blue-600 bg-blue-50 border-blue-100'}`}>
                                                    {task.priority}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-1.5 h-1.5 rounded-full ${task.status === 'Completed' || task.status === 'Done' ? 'bg-emerald-500' : task.status === 'In Progress' ? 'bg-blue-500' : 'bg-slate-300'}`}></span>
                                                    <span className="text-[13px] font-bold text-slate-700 capitalize">{task.status?.toLowerCase().replace('_', ' ')}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-[12px] font-bold text-slate-500">{task.dueDate ? new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '-'}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* 5. Inner Grid for Projects, Activity and Deadlines */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
                        {/* 5a. Left Column: Projects & Activity */}
                        <div className="space-y-8">
                            {/* Active Projects */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-end">
                                    <h2 className="text-[18px] font-heading font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                                        <span className="w-2 h-6 bg-blue-500 rounded-full"></span>
                                        Active Projects
                                    </h2>
                                    <Link to="/projects" className="text-[12px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors">View All</Link>
                                </div>
                                <div className="grid grid-cols-1 gap-5">
                                    {projects.length === 0 ? (
                                        <div className="p-8 text-center bg-slate-50/50 rounded-[20px] border border-dashed border-slate-200 text-slate-400 font-medium">
                                            No active projects.
                                        </div>
                                    ) : projects.slice(0, 3).map(proj => {
                                        const projTasks = tasks.filter(t => t.project?._id === proj._id);
                                        const doneCount = projTasks.filter(t => t.status === 'Completed' || t.status === 'Done').length;
                                        const progress = projTasks.length > 0 ? Math.round((doneCount / projTasks.length) * 100) : 0;

                                        return (
                                            <div key={proj._id} onClick={() => navigate(`/projects/${proj._id}`)} className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm hover:shadow-md hover:border-teal-100 transition-all duration-300 cursor-pointer group relative overflow-hidden">
                                                <div className="flex justify-between items-start mb-3">
                                                    <h3 className="text-[16px] font-heading font-extrabold text-slate-800 group-hover:text-teal-600 transition-colors line-clamp-1">{proj.name}</h3>
                                                    <div className="flex -space-x-1.5">
                                                        {proj.members?.slice(0, 3).map((m, i) => (
                                                            <div key={i} className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[8px] font-bold text-slate-500">
                                                                {m.fullName?.charAt(0)}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="flex-1 h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                                                        <div className="h-full bg-teal-500 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                                                    </div>
                                                    <span className="text-[11px] font-black text-slate-800">{progress}%</span>
                                                </div>

                                                <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-widest text-slate-400">
                                                    <span className="flex items-center gap-1">
                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                        {projTasks.length} Tasks
                                                    </span>
                                                    <span>Due {proj.deadline ? new Date(proj.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'No Date'}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 7. Recent Activity Preview (Moved exactly below projects) */}
                            <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm overflow-hidden flex flex-col max-h-[400px]">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-[15px] font-heading font-extrabold text-slate-800 tracking-tight">Recent Activity</h3>
                                    <Link to="/activity" className="text-[10px] font-black text-teal-600 hover:underline uppercase tracking-widest">View All</Link>
                                </div>
                                <div className="space-y-5 overflow-y-auto hide-scrollbar">
                                    {activities.slice(0, 4).map((act, i) => (
                                        <div key={i} className="flex gap-3 relative before:absolute before:left-2 before:top-6 before:bottom-0 before:w-[1px] before:bg-slate-50 last:before:hidden">
                                            <div className="w-4 h-4 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center shrink-0 z-10 mt-0.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-teal-500"></div>
                                            </div>
                                            <div>
                                                <p className="text-[12px] font-medium text-slate-600 leading-[1.4]">
                                                    <span className="font-extrabold text-slate-900">{act.user?.fullName === user?.fullName ? 'You' : act.user?.fullName || 'System'}</span>
                                                    {' '}{act.action}{' '}
                                                    <span className="font-bold text-slate-800">{act.targetName}</span>
                                                </p>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-1 inline-block">
                                                    {new Date(act.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                    {activities.length === 0 && <p className="text-[12px] text-slate-400 italic text-center py-8">No recent activity.</p>}
                                </div>
                            </div>
                        </div>

                        {/* 5b. Right Column: Deadlines (Starts same line as projects) */}
                        <div className="space-y-8">
                            <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm">
                                <h3 className="text-[15px] font-heading font-extrabold text-slate-800 tracking-tight mb-4 flex items-center gap-2">
                                    Upcoming Deadlines
                                    <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 text-[9px] font-black">{stats.upcoming}</span>
                                </h3>
                                <div className="space-y-4">
                                    {tasks.filter(t => t.dueDate && t.status !== 'Completed' && t.status !== 'Done')
                                        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
                                        .slice(0, 4).map(task => (
                                            <div key={task._id} onClick={() => navigate(`/tasks/${task._id}`)} className="flex items-start gap-3 p-3 rounded-xl border border-transparent hover:border-slate-50 hover:bg-slate-50/30 transition-all cursor-pointer group">
                                                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center shrink-0 group-hover:bg-white group-hover:border-rose-100 transition-colors">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase leading-none">{new Date(task.dueDate).toLocaleString(undefined, { month: 'short' })}</span>
                                                    <span className="text-[14px] font-black text-slate-800 leading-none mt-0.5 group-hover:text-rose-600">{new Date(task.dueDate).getDate()}</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[13px] font-bold text-slate-800 truncate mb-1">{task.title}</p>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${task.priority === 'High' ? 'text-rose-600 bg-rose-50' : 'text-slate-500 bg-slate-50'}`}>
                                                            {task.priority}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-slate-400">{task.project?.name || 'No Project'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    {stats.upcoming === 0 && <p className="text-[12px] text-slate-400 italic text-center py-4">No urgent deadlines.</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Charts ONLY */}
                <div className="lg:col-span-4 space-y-8">
                    {/* 4. Modern Mini Charts */}
                    <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm space-y-6">
                        <div>
                            <h3 className="text-[15px] font-heading font-extrabold text-slate-800 tracking-tight mb-4">Task Distribution</h3>
                            <div className="flex items-center gap-6">
                                <div className="relative w-24 h-24 shrink-0">
                                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                        <circle cx="18" cy="18" r="15.5" fill="none" stroke="#f1f5f9" strokeWidth="4"></circle>
                                        <circle cx="18" cy="18" r="15.5" fill="none" stroke="#14b8a6" strokeWidth="4" strokeDasharray={`${statusPercentages.completed} 100`} strokeLinecap="round"></circle>
                                        <circle cx="18" cy="18" r="15.5" fill="none" stroke="#3b82f6" strokeWidth="4" strokeDasharray={`${statusPercentages.inProgress} 100`} strokeDashoffset={`-${statusPercentages.completed}`} strokeLinecap="round"></circle>
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-[14px] font-black text-slate-800">{stats.completed}</span>
                                    </div>
                                </div>
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-teal-500"></div>
                                            <span className="text-[11px] font-bold text-slate-500 uppercase">Done</span>
                                        </div>
                                        <span className="text-[12px] font-black text-slate-800">{statusCounts.completed}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                            <span className="text-[11px] font-bold text-slate-500 uppercase">Process</span>
                                        </div>
                                        <span className="text-[12px] font-black text-slate-800">{statusCounts.inProgress}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                                            <span className="text-[11px] font-bold text-slate-500 uppercase">Other</span>
                                        </div>
                                        <span className="text-[12px] font-black text-slate-800">{statusCounts.todo + statusCounts.review}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-slate-50">
                            <h3 className="text-[15px] font-heading font-extrabold text-slate-800 tracking-tight mb-4">Weekly Productivity</h3>
                            <div className="flex items-end justify-between h-24 gap-1.5 px-2">
                                {[65, 45, 80, 55, 95, 40, 60].map((h, i) => (
                                    <div key={i} className="flex-1 bg-slate-50 rounded-t-lg relative group transition-all duration-300 hover:bg-teal-50">
                                        <div className={`absolute bottom-0 left-0 right-0 bg-teal-500/80 rounded-t-lg transition-all duration-1000 group-hover:bg-teal-600`} style={{ height: `${h}%` }}></div>
                                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                            {h}%
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between mt-2 text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">
                                <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>


            {showReminder && ReactDOM.createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', backgroundColor: 'rgba(15,23,42,0.55)' }}>
                    <div className="bg-white rounded-[32px] w-full max-w-md p-8 shadow-[0_32px_80px_-12px_rgba(0,0,0,0.4)] border border-slate-100 relative overflow-hidden animate-in zoom-in duration-300">
                        {/* Top accent bar */}
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-teal-400 to-teal-600"></div>

                        <div className="flex flex-col items-center text-center mt-2">
                            {/* Icon */}
                            <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600 mb-6 shadow-sm border border-teal-100">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>

                            <h2 className="text-2xl font-black text-slate-900 mb-2">Daily Update Reminder</h2>
                            <p className="text-slate-500 font-medium text-[15px] max-w-[280px]">Please submit today's progress for your assigned tasks.</p>

                            <div className="w-full mt-8 space-y-3">
                                {missingTasks.map(t => (
                                    <div key={t._id} onClick={() => { setShowReminder(false); navigate(`/tasks/${t._id}`); }} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-teal-300 hover:bg-teal-50/30 transition-all cursor-pointer group">
                                        <span className="font-bold text-slate-700 text-[13px] truncate pr-4">{t.title}</span>
                                        <svg className="w-4 h-4 text-slate-300 group-hover:text-teal-500 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => setShowReminder(false)}
                                className="mt-8 text-[12px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors"
                            >
                                Remind me later
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

        </div>
    );
}

