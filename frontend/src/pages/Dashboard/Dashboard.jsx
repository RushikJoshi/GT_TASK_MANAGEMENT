import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function Dashboard() {
    const { user, token } = useAuth();
    const navigate = useNavigate();

    // Data State
    const [tasks, setTasks] = useState([]);
    const [projects, setProjects] = useState([]);
    const [activities, setActivities] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [reportSummary, setReportSummary] = useState({ reports: [], missingUpdates: [], summary: {} });

    useEffect(() => {
        if (token) {
            fetchDashboardData();
        }
    }, [token]);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const headers = { Authorization: `Bearer ${token}` };
            const [tasksRes, projectsRes, activityRes, employeeRes, summaryRes] = await Promise.all([
                axios.get('http://localhost:5000/api/tasks', { headers }),
                axios.get('http://localhost:5000/api/projects', { headers }),
                axios.get('http://localhost:5000/api/activity', { headers }),
                axios.get('http://localhost:5000/api/users/employees', { headers }),
                axios.get('http://localhost:5000/api/daily-reports/manager-summary', { headers })
            ]);

            if (tasksRes.data.success) setTasks(tasksRes.data.data || []);
            if (projectsRes.data.success) setProjects(projectsRes.data.data || []);
            if (activityRes.data.success) setActivities(activityRes.data.data || []);
            if (employeeRes.data.success) setEmployees(employeeRes.data.data || []);
            if (summaryRes.data.success) setReportSummary(summaryRes.data.data || { reports: [], missingUpdates: [], summary: {} });

        } catch (error) {
            console.error("Dashboard fetch error", error);
        } finally {
            setLoading(false);
        }
    };
    // --- Review State for Dashboard (no extra API, uses existing endpoint) ---
    const [reviewingId, setReviewingId] = useState(null);   // which report is being acted on
    const [reviewComment, setReviewComment] = useState({}); // { [reportId]: string }
    const [showCommentFor, setShowCommentFor] = useState(null); // reportId showing comment box

    const handleDashboardReview = async (reportId, isApproved) => {
        setReviewingId(reportId);
        try {
            const comment = reviewComment[reportId] || '';
            await axios.put(`http://localhost:5000/api/daily-reports/${reportId}/review`,
                { isApproved, managerNote: comment },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setShowCommentFor(null);
            fetchDashboardData(); // Re-fetch to get updated statuses
        } catch (err) {
            console.error('Review error', err);
        } finally {
            setReviewingId(null);
        }
    };

    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const activeTasksList = tasks.filter(t => t.status !== 'Completed' && t.status !== 'Done');

    const kpis = [
        { title: 'Total Projects', value: projects.length, icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z', color: 'bg-indigo-50 text-indigo-600', trend: 'Active' },
        { title: 'Active Tasks', value: activeTasksList.length, icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', color: 'bg-blue-50 text-blue-600', trend: 'Running' },
        { title: 'To Be Reviewed', value: tasks.filter(t => t.status === 'Review').length, icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z', color: 'bg-amber-50 text-amber-600', trend: 'Action Needed' },
        { title: 'Overdue', value: tasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'Completed' && t.status !== 'Done').length, icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', color: 'bg-rose-50 text-rose-600', trend: 'Critical' },
        { title: 'Due Soon', value: tasks.filter(t => t.dueDate && new Date(t.dueDate) > now && new Date(t.dueDate) <= sevenDaysLater && t.status !== 'Completed' && t.status !== 'Done').length, icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', color: 'bg-orange-50 text-orange-600', trend: '7 Days' },
        { title: 'Teams Working', value: `${employees.length > 0 ? Math.min(100, Math.round((tasks.filter(t => t.status === 'In Progress').length / (employees.length * 3)) * 100)) : 0}%`, icon: 'M13 10V3L4 14h7v7l9-11h-7z', color: 'bg-emerald-50 text-emerald-600', trend: 'Load' },
    ];

    // Status Distribution
    const statusCounts = tasks.reduce((acc, t) => {
        const s = t.status === 'Done' ? 'Completed' : t.status;
        acc[s] = (acc[s] || 0) + 1;
        return acc;
    }, {});

    // Priority Breakdown
    const priorityCounts = tasks.reduce((acc, t) => {
        acc[t.priority] = (acc[t.priority] || 0) + 1;
        return acc;
    }, { High: 0, Medium: 0, Low: 0 });

    // Team Workload calculation
    const teamWorkload = employees.map(emp => {
        const empTasks = tasks.filter(t => t.assignedTo?._id === emp._id);
        const active = empTasks.filter(t => t.status !== 'Completed' && t.status !== 'Done').length;
        const overdue = empTasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'Completed' && t.status !== 'Done').length;
        let indicator = 'Low';
        if (active > 5) indicator = 'High';
        else if (active > 2) indicator = 'Medium';

        return { ...emp, active, overdue, total: empTasks.length, indicator };
    });

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin"></div>
                <p className="text-slate-500 font-medium animate-pulse">Orchestrating your dashboard...</p>
            </div>
        </div>
    );

    return (
        <div className="max-w-[1600px] mx-auto space-y-8 animate-fade-in font-sans pb-12">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-[32px] font-heading font-black text-slate-900 tracking-tight">Manager Dashboard</h1>
                    <p className="text-slate-500 font-medium flex items-center gap-2 mt-1">
                        <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                        Overview of your {projects.length} active projects
                    </p>
                </div>
                <div className="flex gap-3">
                    <button onClick={fetchDashboardData} className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all shadow-sm">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>
                    <button onClick={() => navigate('/projects')} className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-teal-500/20 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                        Create Project
                    </button>
                </div>
            </div>

            {/* 1. KPI Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-5">
                {kpis.map((kpi, idx) => (
                    <div key={idx} className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 group">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-2.5 rounded-xl ${kpi.color} shadow-sm group-hover:scale-110 transition-transform`}>
                                <svg className="w-5 h-5 focus:outline-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d={kpi.icon} /></svg>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{kpi.trend}</span>
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 leading-none">{kpi.value}</h3>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-2">{kpi.title}</p>
                    </div>
                ))}
            </div>

            {/* Daily Report Summary Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-3 bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-7 py-5 border-b border-slate-50 flex justify-between items-center bg-slate-50/20">
                        <div>
                            <h2 className="text-[18px] font-heading font-black text-slate-900 tracking-tight flex items-center gap-2">
                                Daily Reporting Summary
                                <span className="bg-teal-50 text-teal-600 px-2 py-0.5 rounded-md text-[10px] uppercase font-black">{new Date().toDateString()}</span>
                            </h2>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="flex flex-col items-end">
                                <span className="text-[13px] font-black text-slate-700">{reportSummary?.summary?.totalSubmitted || 0}/{reportSummary?.summary?.totalEmployees || 0}</span>
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest uppercase">Submissions</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-7 overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    <th className="py-4">Employee</th>
                                    <th className="py-4">Task Update</th>
                                    <th className="py-4 text-center">Progress</th>
                                    <th className="py-4">Blockers</th>
                                    <th className="py-4 text-right">Review</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {reportSummary?.reports?.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="py-12 text-center text-slate-400 font-medium italic">No reports submitted today.</td>
                                    </tr>
                                ) : reportSummary?.reports?.map(report => {
                                    const status = report.reportStatus || (report.isReviewed ? (report.isApproved ? 'approved' : 'rejected') : 'pending_review');
                                    const isPending = status === 'pending_review';
                                    const isApprovedR = status === 'approved';
                                    const isRejectedR = status === 'rejected';
                                    const isSubmitting = reviewingId === report._id;
                                    return (
                                        <React.Fragment key={report._id}>
                                            <tr className="group hover:bg-slate-50/50 transition-colors">
                                                <td className="py-4">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center font-black text-[10px] uppercase">{report.employee?.fullName?.charAt(0)}</div>
                                                        <span className="font-bold text-slate-800 text-[13px]">{report.employee?.fullName}</span>
                                                    </div>
                                                </td>
                                                <td className="py-4">
                                                    <div className="max-w-[230px]">
                                                        <p className="font-bold text-slate-700 text-[13px] leading-tight mb-1 truncate" title={report.task?.title}>{report.task?.title}</p>
                                                        <p className="text-[11px] text-slate-500 line-clamp-1">{report.completedToday}</p>
                                                    </div>
                                                </td>
                                                <td className="py-4 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <div className="w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                            <div className="h-full rounded-full" style={{ width: `${report.progressPercentage}%`, backgroundColor: report.progressPercentage === 100 ? '#10b981' : '#14b8a6' }} />
                                                        </div>
                                                        <span className={`px-2 py-0.5 rounded-md font-black text-[10px] border ${report.progressPercentage === 100 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-teal-50 text-teal-700 border-teal-100'}`}>{report.progressPercentage}%</span>
                                                    </div>
                                                </td>
                                                <td className="py-4">
                                                    {report.blockers ? (
                                                        <div className="flex items-center gap-1.5 text-rose-600 font-bold text-[11px]">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                                                            <span className="max-w-[120px] truncate" title={report.blockers}>{report.blockers}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-300 text-[11px] font-medium">—</span>
                                                    )}
                                                </td>
                                                <td className="py-4">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {isPending && (
                                                            <>
                                                                <button
                                                                    disabled={isSubmitting}
                                                                    onClick={() => handleDashboardReview(report._id, true)}
                                                                    className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-black text-[11px] border border-emerald-100 transition-all flex items-center gap-1 disabled:opacity-40"
                                                                >
                                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                                                    Approve
                                                                </button>
                                                                <button
                                                                    disabled={isSubmitting}
                                                                    onClick={() => setShowCommentFor(showCommentFor === report._id ? null : report._id)}
                                                                    className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-black text-[11px] border border-rose-100 transition-all flex items-center gap-1 disabled:opacity-40"
                                                                >
                                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                                                    Reject
                                                                </button>
                                                                <button
                                                                    onClick={() => setShowCommentFor(showCommentFor === report._id ? null : report._id)}
                                                                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all"
                                                                    title="Add comment"
                                                                >
                                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                                                </button>
                                                            </>
                                                        )}
                                                        {isApprovedR && (
                                                            <div className="flex flex-col items-end">
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border bg-emerald-50 text-emerald-600 border-emerald-100">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Approved
                                                                </span>
                                                                {report.reviewedBy && <span className="text-[9px] text-slate-400 font-bold mt-0.5">{report.reviewedBy?.fullName} · {report.reviewedAt ? new Date(report.reviewedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>}
                                                            </div>
                                                        )}
                                                        {isRejectedR && (
                                                            <div className="flex flex-col items-end">
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border bg-rose-50 text-rose-600 border-rose-100">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>Rejected
                                                                </span>
                                                                {report.managerNote && <span className="text-[9px] text-slate-400 font-bold mt-0.5 max-w-[120px] truncate" title={report.managerNote}>{report.managerNote}</span>}
                                                            </div>
                                                        )}
                                                        {!isPending && (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border bg-amber-50 text-amber-600 border-amber-100 hidden" />
                                                        )}
                                                        {isPending && (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border bg-amber-50 text-amber-600 border-amber-100">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>Awaiting Review
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                            {/* Inline comment + reject row */}
                                            {showCommentFor === report._id && (
                                                <tr className="bg-rose-50/30">
                                                    <td colSpan="5" className="py-3 px-4">
                                                        <div className="flex items-center gap-3">
                                                            <input
                                                                autoFocus
                                                                value={reviewComment[report._id] || ''}
                                                                onChange={e => setReviewComment(prev => ({ ...prev, [report._id]: e.target.value }))}
                                                                placeholder="Add a comment for rejection (optional)..."
                                                                className="flex-1 px-4 h-9 border border-rose-200 rounded-xl text-[12px] font-medium bg-white focus:outline-none focus:ring-2 focus:ring-rose-100"
                                                            />
                                                            <button
                                                                onClick={() => handleDashboardReview(report._id, false)}
                                                                disabled={isSubmitting}
                                                                className="px-4 h-9 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-[11px] transition-all disabled:opacity-40"
                                                            >
                                                                {isSubmitting ? 'Rejecting…' : 'Confirm Reject'}
                                                            </button>
                                                            <button
                                                                onClick={() => { setShowCommentFor(null); handleDashboardReview(report._id, true); }}
                                                                disabled={isSubmitting}
                                                                className="px-4 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] transition-all disabled:opacity-40"
                                                            >
                                                                Approve with Note
                                                            </button>
                                                            <button onClick={() => setShowCommentFor(null)} className="p-2 text-slate-400 hover:text-slate-600 text-[12px]">✕</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-7 flex flex-col">
                    <h3 className="text-[14px] font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
                        Missing Updates
                        {reportSummary.missingUpdates?.length > 0 && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>}
                    </h3>
                    <div className="space-y-5 flex-1 overflow-y-auto hide-scrollbar max-h-[350px]">
                        {reportSummary?.missingUpdates?.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-emerald-500 font-black text-[11px] uppercase tracking-widest">All caught up! ✅</p>
                            </div>
                        ) : reportSummary?.missingUpdates?.map(emp => (
                            <div key={emp._id} className="flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center font-black text-[11px] text-slate-400">{emp.fullName?.charAt(0)}</div>
                                    <div>
                                        <p className="font-bold text-slate-800 text-[13px] leading-tight">{emp.fullName}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1">Pending Submission</p>
                                    </div>
                                </div>
                                <button className="opacity-0 group-hover:opacity-100 p-2 rounded-lg bg-teal-50 text-teal-600 transition-all hover:bg-teal-600 hover:text-white">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m-9-11a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                </button>
                            </div>
                        ))}
                    </div>
                    <div className="mt-8 pt-6 border-t border-slate-50 text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reminders sent automatically at 6 PM</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* 2. Left Column (Main Focus) */}
                <div className="lg:col-span-8 space-y-8">

                    {/* Project Health Grid */}
                    <div className="bg-slate-50/30 p-1 rounded-[32px] border border-slate-100">
                        <div className="bg-white rounded-[31px] shadow-sm p-7">
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-[20px] font-heading font-black text-slate-900 tracking-tight">Projects Status</h2>
                                <Link to="/projects" className="text-[12px] font-bold text-teal-600 hover:underline uppercase tracking-widest">See All &rarr;</Link>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {projects.length === 0 ? (
                                    <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                                        <p className="text-slate-400 font-medium">No projects currently tracked.</p>
                                    </div>
                                ) : projects.slice(0, 4).map(proj => {
                                    const projTasks = tasks.filter(t => t.project?._id === proj._id);
                                    const completedNum = projTasks.filter(t => t.status === 'Completed' || t.status === 'Done').length;
                                    const reviewNum = projTasks.filter(t => t.status === 'Review').length;
                                    const inProgressNum = projTasks.filter(t => t.status === 'In Progress').length;

                                    const progress = projTasks.length > 0
                                        ? Math.min(100, Math.round(((completedNum * 1) + (reviewNum * 0.7) + (inProgressNum * 0.3)) / projTasks.length * 100))
                                        : 0;

                                    const overdue = projTasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'Completed' && t.status !== 'Done').length;
                                    const healthColor = overdue > 4 ? 'bg-rose-500' : overdue > 1 ? 'bg-amber-500' : 'bg-emerald-500';

                                    return (
                                        <div key={proj._id} onClick={() => navigate(`/projects/${proj._id}`)} className="p-6 rounded-[24px] border border-slate-100 bg-white hover:border-teal-100 hover:shadow-xl hover:shadow-teal-500/5 transition-all duration-300 cursor-pointer group">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2.5 h-2.5 rounded-full ${healthColor} shadow-lg shadow-current/20`}></div>
                                                    <h3 className="font-bold text-slate-800 text-[16px] group-hover:text-teal-600 transition-colors leading-tight">{proj.name}</h3>
                                                </div>
                                                <div className="flex -space-x-1.5">
                                                    {proj.members?.slice(0, 3).map((m, i) => (
                                                        <div key={i} className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[8px] font-bold text-slate-600 ring-1 ring-slate-100">
                                                            {m.fullName?.charAt(0)}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 mb-5">
                                                <div className="flex-1 h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                                                    <div className={`h-full ${healthColor} rounded-full transition-all duration-1000`} style={{ width: `${progress}%` }}></div>
                                                </div>
                                                <span className="text-[11px] font-black text-slate-800">{progress}%</span>
                                            </div>

                                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                <div className="flex items-center gap-4">
                                                    <span className="flex items-center gap-1.5"><span className="text-slate-800">{completedNum}/{projTasks.length}</span> Done</span>
                                                    {overdue > 0 && <span className="text-rose-600 flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-rose-600"></span> {overdue} ALERT</span>}
                                                </div>
                                                <span>{proj.deadline ? new Date(proj.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'No Date'}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Team Workload Widget */}
                    <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-7">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-[20px] font-heading font-black text-slate-900 tracking-tight">Team Workload</h2>
                            <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black tracking-widest uppercase">{employees.length} Members</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-50">
                                        <th className="py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Employee</th>
                                        <th className="py-4 text-center text-[11px] font-black text-slate-400 uppercase tracking-widest">Active Tasks</th>
                                        <th className="py-4 text-center text-[11px] font-black text-slate-400 uppercase tracking-widest">Late</th>
                                        <th className="py-4 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {teamWorkload.slice(0, 5).map(member => (
                                        <tr key={member._id} className="group hover:bg-slate-50/50 transition-colors">
                                            <td className="py-4 px-1">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-[10px] font-bold text-teal-600 uppercase">
                                                        {member.fullName?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-800 text-[14px] leading-none">{member.fullName}</p>
                                                        <p className="text-[11px] text-slate-400 font-medium mt-1">{member.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 text-center font-black text-slate-700">{member.active}</td>
                                            <td className="py-4 text-center font-black text-rose-500">{member.overdue}</td>
                                            <td className="py-4 text-right">
                                                <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${member.indicator === 'High' ? 'bg-rose-50 text-rose-600' : member.indicator === 'Medium' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                    {member.indicator}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* 3. Right Column (Analytics & Summary) */}
                <div className="lg:col-span-4 space-y-8">

                    {/* Charts Card */}
                    <div className="bg-white p-7 rounded-[32px] border border-slate-100 shadow-sm space-y-8">
                        {/* Status Chart */}
                        <div>
                            <h3 className="text-[15px] font-black text-slate-800 uppercase tracking-widest mb-6">Task Summary</h3>
                            <div className="flex items-center gap-6">
                                <div className="relative w-28 h-28 shrink-0">
                                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                        <circle cx="18" cy="18" r="15.5" fill="none" stroke="#f8fafc" strokeWidth="3"></circle>
                                        <circle cx="18" cy="18" r="15.5" fill="none" stroke="#10b981" strokeWidth="4" strokeDasharray={`${Math.round((statusCounts.Completed || 0) / tasks.length * 100) || 0} 100`} strokeLinecap="round"></circle>
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-[18px] font-black text-slate-800 leading-none">{statusCounts.Completed || 0}</span>
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Done</span>
                                    </div>
                                </div>
                                <div className="flex-1 space-y-2.5">
                                    {['Todo', 'In Progress', 'Review', 'Completed'].map(s => (
                                        <div key={s} className="flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-1.5 h-1.5 rounded-full ${s === 'Completed' ? 'bg-emerald-500' : s === 'Review' ? 'bg-amber-500' : s === 'In Progress' ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
                                                <span className="text-[11px] font-bold text-slate-500 uppercase">{s}</span>
                                            </div>
                                            <span className="text-[12px] font-black text-slate-800">{statusCounts[s] || 0}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Priority Chart (Mini Horizontal Bars) */}
                        <div className="pt-8 border-t border-slate-50">
                            <h3 className="text-[15px] font-black text-slate-800 uppercase tracking-widest mb-6">Priority Distribution</h3>
                            <div className="space-y-4">
                                {['High', 'Medium', 'Low'].map(p => {
                                    const count = priorityCounts[p] || 0;
                                    const pct = tasks.length > 0 ? (count / tasks.length) * 100 : 0;
                                    const barColor = p === 'High' ? 'bg-rose-500' : p === 'Medium' ? 'bg-amber-500' : 'bg-blue-500';
                                    return (
                                        <div key={p}>
                                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-1.5">
                                                <span className="text-slate-500">{p} priority</span>
                                                <span className="text-slate-800">{count} tasks</span>
                                            </div>
                                            <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden">
                                                <div className={`h-full ${barColor} transition-all duration-1000`} style={{ width: `${pct}%` }}></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Activity Widget */}
                    <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden flex flex-col p-7 min-h-[420px]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-[15px] font-heading font-black text-slate-800 tracking-tight uppercase tracking-widest">Recent Activity</h3>
                            <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></div>
                        </div>

                        <div className="space-y-4 flex-1">
                            {(() => {
                                const today = new Date().toDateString();
                                const yesterday = new Date(Date.now() - 86400000).toDateString();
                                const todayActs = activities.filter(a => new Date(a.createdAt).toDateString() === today);
                                const targetActs = todayActs.length > 0 ? todayActs : activities.filter(a => new Date(a.createdAt).toDateString() === yesterday);
                                const periodLabel = todayActs.length > 0 ? "today" : "yesterday";

                                const highlights = [];
                                const statusUpdates = targetActs.filter(a => a.action.toLowerCase().includes('status'));
                                if (statusUpdates.length > 0) highlights.push({ title: `${statusUpdates.length} tasks updated`, text: 'Progress in task pipeline.', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', color: 'bg-emerald-50 text-emerald-600' });
                                const newTasks = targetActs.filter(a => a.action.toLowerCase().includes('created task'));
                                if (newTasks.length > 0) highlights.push({ title: `${newTasks.length} new tasks`, text: 'New tasks were added.', icon: 'M12 4v16m8-8H4', color: 'bg-blue-50 text-blue-600' });
                                const comments = targetActs.filter(a => a.action.toLowerCase().includes('comment'));
                                if (comments.length > 0) highlights.push({ title: `${comments.length} new comments`, text: 'Team is chatting on tasks.', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z', color: 'bg-indigo-50 text-indigo-600' });

                                if (highlights.length === 0) return <div className="text-center py-16 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200"><p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest italic">{activities.length > 0 ? `Stable activity ${periodLabel}` : 'No recent logs'}</p></div>;

                                return highlights.map((h, i) => (
                                    <div key={i} className="flex items-center gap-4 p-4 rounded-[22px] bg-white border border-slate-100/60 shadow-sm hover:shadow-md hover:border-teal-200/50 transition-all duration-300 group">
                                        <div className={`w-10 h-10 rounded-[15px] ${h.color} flex items-center justify-center shrink-0`}>
                                            <svg className="w-5 h-5 focus:outline-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d={h.icon} /></svg>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[13px] font-black text-slate-800 leading-tight mb-0.5 group-hover:text-teal-700 transition-colors uppercase truncate">{h.title}</p>
                                            <p className="text-[10px] font-bold text-slate-400 group-hover:text-slate-500 transition-colors tracking-tight uppercase">{h.text}</p>
                                        </div>
                                    </div>
                                ));
                            })()}
                        </div>

                        <button onClick={() => navigate('/activity')} className="mt-8 pt-6 border-t border-slate-50 text-[12px] font-black text-teal-600 hover:text-teal-700 flex items-center justify-center gap-2 uppercase tracking-widest transition-all group">
                            View All Activity
                            <svg className="w-4 h-4 bg-teal-50 rounded-full p-0.5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
