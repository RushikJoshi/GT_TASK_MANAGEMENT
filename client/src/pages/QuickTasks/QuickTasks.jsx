import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { quickTaskApi } from '../../api/quickTask.api';
import { notificationApi } from '../../api/notification.api';

// ─── Constants ────────────────────────────────────────────────────────────────
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'];
const CATEGORIES = ['Meeting', 'Follow Up', 'Client Work', 'Internal Task', 'Reminder'];
const REPEAT_TYPES = ['NONE', 'DAILY', 'WEEKLY', 'MONTHLY'];
const REMINDER_TYPES = ['None', 'Dashboard Notification', 'Email Notification'];

const PRIORITY_STYLE = {
    LOW: 'bg-slate-100 text-slate-600',
    MEDIUM: 'bg-blue-100 text-blue-700',
    HIGH: 'bg-orange-100 text-orange-700',
    URGENT: 'bg-red-100 text-red-700',
};
const STATUS_STYLE = {
    TODO: 'bg-slate-100 text-slate-600',
    IN_PROGRESS: 'bg-indigo-100 text-indigo-700',
    DONE: 'bg-emerald-100 text-emerald-700',
};
const CATEGORY_ICON = {
    'Meeting': '🤝',
    'Follow Up': '↩️',
    'Client Work': '💼',
    'Internal Task': '⚙️',
    'Reminder': '🔔',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const isOverdue = (t) => {
    if (!t.dueDate || (t.status === 'DONE' || t.status === 'Done' || t.status === 'Completed')) return false;
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const due = new Date(t.dueDate);
    const dueStr = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-${String(due.getDate()).padStart(2, '0')}`;
    return dueStr < todayStr;
};

// ─── Empty form ─────────────────────────────────────────────────────────────
const emptyForm = () => ({
    title: '', description: '', priority: 'MEDIUM', status: 'TODO',
    category: 'Internal Task', assignedTo: '', dueDate: '',
    reminderTime: '', reminderType: 'None', repeatType: 'NONE', checklist: []
});

// ═══════════════════════════════════════════════════════════════════════════════
//  QUICK TASKS PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function QuickTasks() {
    const { token, user } = useAuth();

    // ── data state ────────────────────────────────────────────────────────
    const [tasks, setTasks] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ total: 0, pages: 1, page: 1 });

    // ── view / filter state ───────────────────────────────────────────────
    const [view, setView] = useState('all');  // all | my | assigned | upcoming | overdue
    const [filters, setFilters] = useState({ status: '', priority: '', category: '', assignedTo: '', dueDate: '' });
    const [search, setSearch] = useState('');

    const location = useLocation();
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        setSearch(params.get('search') || '');
    }, [location.search]);

    // ── dropdowns + panel state ───────────────────────────────────────────
    const [showFiltersPanel, setShowFiltersPanel] = useState(false);
    const filterPanelRef = useRef(null);

    // ── sorting (client-side) ─────────────────────────────────────────────
    const [sortBy, setSortBy] = useState('newest'); // newest | oldest | dueSoon | priority | assignee

    const PRIORITY_ORDER = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    const sortTasks = (list) => {
        const items = [...list];
        if (sortBy === 'newest') {
            items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        } else if (sortBy === 'oldest') {
            items.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        } else if (sortBy === 'dueSoon') {
            items.sort((a, b) => {
                const aDate = a.dueDate ? new Date(a.dueDate) : new Date(8640000000000000);
                const bDate = b.dueDate ? new Date(b.dueDate) : new Date(8640000000000000);
                return aDate - bDate;
            });
        } else if (sortBy === 'priority') {
            items.sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 4) - (PRIORITY_ORDER[b.priority] ?? 4));
        } else if (sortBy === 'assignee') {
            items.sort((a, b) => {
                const aName = a.assignedTo?.fullName?.toLowerCase() || '';
                const bName = b.assignedTo?.fullName?.toLowerCase() || '';
                return aName.localeCompare(bName);
            });
        }
        return items;
    };

    // ── modal state ───────────────────────────────────────────────────────
    const [showForm, setShowForm] = useState(false);
    const [editTask, setEditTask] = useState(null);     // task being edited
    const [detailTask, setDetailTask] = useState(null);   // task detail drawer
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [formData, setFormData] = useState(emptyForm());
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [showAllComments, setShowAllComments] = useState(false);

    // ── checklist new item ────────────────────────────────────────────────
    const [newCheckItem, setNewCheckItem] = useState('');

    // ── comment ───────────────────────────────────────────────────────────
    const [commentText, setCommentText] = useState('');
    const [commentSaving, setCommentSaving] = useState(false);

    // ── error state ───────────────────────────────────────────────────────
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // ── reassignment state ────────────────────────────────────────────────
    const [showReassignDropdown, setShowReassignDropdown] = useState(false);
    const [reassigning, setReassigning] = useState(false);
    const [users, setUsers] = useState([]);
    const [reassignReason, setReassignReason] = useState('');

    // ── fetch assignable users ──
    useEffect(() => {
        axiosInstance.get('/users/assignable')
            .then(r => {
                if (r.data.success) setUsers(r.data.data);
            })
            .catch(() => { });
    }, []);

    // ─── Fetch tasks ─────────────────────────────────────────────────────
    const fetchTasks = useCallback(async (page = 1) => {
        setLoading(true);
        setError('');
        try {
            const params = { page, limit: 15 };
            if (view !== 'all') params.view = view;
            if (filters.status) params.status = filters.status;
            if (filters.priority) params.priority = filters.priority;
            if (filters.category) params.category = filters.category;
            if (filters.assignedTo) params.assignedTo = filters.assignedTo;
            if (filters.dueDate) params.dueDate = filters.dueDate;
            if (search.trim()) params.search = search.trim();

            const data = await quickTaskApi.getAll(params);
            if (data.success) {
                let list = data.data;

                // Client-side sorting (search is now handled server-side)
                list = sortTasks(list);

                setTasks(list);
                setPagination(data.pagination || { total: list.length, page: 1, pages: 1 });
            } else {
                setError(data.message || 'Failed to load tasks');
            }
        } catch (err) {
            setError(err?.response?.data?.message || 'Failed to connect to server. Please try again.');
        }
        finally { setLoading(false); }
    }, [view, filters, search, sortBy]);

    // ─── Fetch stats ─────────────────────────────────────────────────────
    const fetchStats = useCallback(async () => {
        try {
            const data = await quickTaskApi.getStats();
            if (data.success) setStats(data.data);
        } catch (_) { }
    }, []);

    useEffect(() => { fetchTasks(1); fetchStats(); }, [fetchTasks, fetchStats]);

    // Close filter panel when clicking outside
    useEffect(() => {
        const onClick = (event) => {
            if (showFiltersPanel && filterPanelRef.current && !filterPanelRef.current.contains(event.target)) {
                setShowFiltersPanel(false);
            }
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, [showFiltersPanel]);

    // ─── Refresh detail task if open ─────────────────────────────────────
    const refreshDetail = async (id) => {
        const data = await quickTaskApi.getById(id);
        if (data.success) setDetailTask(data.data);
    };

    // ─── Form helpers ─────────────────────────────────────────────────────
    const openCreate = () => {
        setFormData(emptyForm());
        setEditTask(null);
        setShowForm(true);
        setNewCheckItem('');
    };

    const openEdit = (task) => {
        setFormData({
            title: task.title || '',
            description: task.description || '',
            priority: task.priority || 'MEDIUM',
            status: task.status || 'TODO',
            category: task.category || 'Internal Task',
            assignedTo: task.assignedTo?._id || task.assignedTo || '',
            dueDate: task.dueDate ? task.dueDate.substring(0, 10) : '',
            reminderTime: task.reminderTime ? task.reminderTime.substring(0, 16) : '',
            reminderType: task.reminderType || 'None',
            repeatType: task.repeatType || 'NONE',
            checklist: task.checklist ? task.checklist.map(c => ({ ...c })) : []
        });
        setEditTask(task);
        setShowForm(true);
        setDetailTask(null);
        setNewCheckItem('');
    };

    const closeForm = () => { setShowForm(false); setEditTask(null); };

    const handleFormChange = (e) => {
        setFormData(p => ({ ...p, [e.target.name]: e.target.value }));
    };

    // ─── Checklist management in form ────────────────────────────────────
    const addCheckItem = () => {
        if (!newCheckItem.trim()) return;
        setFormData(p => ({ ...p, checklist: [...p.checklist, { text: newCheckItem.trim(), completed: false }] }));
        setNewCheckItem('');
    };

    const removeCheckItem = (idx) => {
        setFormData(p => ({ ...p, checklist: p.checklist.filter((_, i) => i !== idx) }));
    };

    // ─── Save task ────────────────────────────────────────────────────────
    const handleSave = async (e) => {
        e.preventDefault();
        if (!formData.title.trim()) return;

        // Date Validation
        if (formData.dueDate) {
            const date = new Date(formData.dueDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (date < today) {
                alert('Tasks cannot be created with past dates.');
                return;
            }
        }
        setSaving(true);
        try {
            const payload = {
                ...formData,
                assignedTo: formData.assignedTo || null,
                dueDate: formData.dueDate || null,
                reminderTime: formData.reminderTime || null,
            };

            let res;
            if (editTask) {
                res = await quickTaskApi.update(editTask._id, payload);
            } else {
                res = await quickTaskApi.create(payload);
            }

            if (res.success) {
                setSuccessMessage(editTask ? 'Task updated successfully!' : 'Task created successfully!');

                // Notify assignee when task is assigned (and not assigned to self)
                const assignedId = payload.assignedTo;
                const assignedChanged = editTask ? assignedId && assignedId !== (editTask.assignedTo?._id || editTask.assignedTo) : true;
                if (assignedId && assignedId !== user._id && assignedChanged) {
                    try {
                        await notificationApi.create({
                            user: assignedId,
                            title: editTask ? 'Task Assignment Updated' : 'New Task Assigned',
                            message: `${user.fullName} assigned you a task: "${payload.title}"`,
                            type: 'task'
                        });
                    } catch (_e) {
                        // ignore notification failures
                    }
                }

                setTimeout(() => setSuccessMessage(''), 3000);
                closeForm();
                fetchTasks(1);
                fetchStats();
            } else {
                // API responded with a 200/201 but success=false
                alert(res.message || 'Failed to save task');
            }
        } catch (err) {
            // axios throws for 4xx/5xx; show server message if present
            console.error('Quick task save error', err);
            const msg = err.response?.data?.message || 'Something went wrong';
            alert(msg);
        } finally {
            setSaving(false);
        }
    };

    // ─── Delete task ──────────────────────────────────────────────────────
    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            const res = await quickTaskApi.delete(deleteTarget._id);
            if (res.success) {
                setTasks(p => p.filter(t => t._id !== deleteTarget._id));
                setDeleteTarget(null);
                if (detailTask?._id === deleteTarget._id) setDetailTask(null);
                fetchStats();
            }
        } catch (_) { }
        finally { setDeleting(false); }
    };

    // ─── Quick status change ──────────────────────────────────────────────
    const cycleStatus = async (task) => {
        const order = ['TODO', 'IN_PROGRESS', 'DONE'];
        const next = order[(order.indexOf(task.status) + 1) % order.length];
        const res = await quickTaskApi.update(task._id, { status: next });
        if (res.success) {
            setTasks(p => p.map(t => t._id === task._id ? { ...t, status: next } : t));
            if (detailTask?._id === task._id) setDetailTask(d => ({ ...d, status: next }));
            fetchStats();
        }
    };

    // ─── Checklist toggle (in detail drawer) ─────────────────────────────
    const toggleChecklist = async (taskId, itemId, completed) => {
        const res = await quickTaskApi.toggleChecklist(taskId, itemId, completed);
        if (res.success) {
            setDetailTask(d => ({ ...d, checklist: res.data }));
            setTasks(p => p.map(t => t._id === taskId ? { ...t, checklist: res.data } : t));
        }
    };

    // ─── Add comment ──────────────────────────────────────────────────────
    const handleAddComment = async () => {
        if (!commentText.trim() || !detailTask) return;
        setCommentSaving(true);
        const res = await quickTaskApi.addComment(detailTask._id, commentText);
        if (res.success) {
            setDetailTask(d => ({ ...d, comments: res.data }));
            setCommentText('');

            // Notify assignee (if not the commenter)
            if (detailTask.assignedTo && detailTask.assignedTo._id !== user._id) {
                try {
                    await notificationApi.create({
                        user: detailTask.assignedTo._id,
                        title: 'New Comment on Your Task',
                        message: `${user.fullName} commented on the task: "${detailTask.title}"`,
                        type: 'task'
                    });
                } catch (_e) {
                    // swallow - notifications are best-effort
                }
            }
        }
        setCommentSaving(false);
    };

    // ─── Reassign task ────────────────────────────────────────────────────
    const handleReassign = async (newAssigneeId) => {
        if (!detailTask) return;
        if (!reassignReason.trim()) {
            alert('Please provide a reason for reassignment');
            return;
        }
        setReassigning(true);
        try {
            const res = await quickTaskApi.reassign(detailTask._id, newAssigneeId, reassignReason);
            if (res.success) {
                setDetailTask(res.data);
                setTasks(p => p.map(t => t._id === detailTask._id ? res.data : t));
                setSuccessMessage('Task successfully reassigned.');
                setShowReassignDropdown(false);
                setReassignReason('');
                setTimeout(() => setSuccessMessage(''), 3000);
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to reassign task');
        } finally {
            setReassigning(false);
        }
    };

    // ─── checklist progress ───────────────────────────────────────────────
    const checklistProgress = (checklist) => {
        if (!checklist?.length) return 0;
        return Math.round((checklist.filter(c => c.completed).length / checklist.length) * 100);
    };

    // ═══════════ VIEW TAB CONFIG ════════════════════════════════════════════
    const viewTabs = [
        { key: 'all', label: 'All Tasks', count: stats?.total },
        { key: 'my', label: 'My Tasks', count: stats?.myTasks },
        { key: 'assigned', label: 'Assigned to Me', count: stats?.assigned },
        { key: 'upcoming', label: 'Upcoming', count: stats?.upcoming },
        { key: 'overdue', label: 'Overdue', count: stats?.overdue },
    ];

    // ═══════════════════════════════════════════════════════════════════════
    //  RENDER
    // ═══════════════════════════════════════════════════════════════════════
    return (
        <div className="min-h-full">

            {/* ── ERROR BANNER ─────────────────────────────────────────── */}
            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium flex items-center gap-3">
                    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                    <button onClick={() => fetchTasks(1)} className="ml-auto text-xs font-bold text-red-600 underline hover:text-red-800">Retry</button>
                </div>
            )}

            {/* ── SUCCESS TOAST ─────────────────────────────────────────── */}
            {successMessage && (
                <div className="fixed top-24 right-8 z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-xl shadow-emerald-500/20 flex items-center gap-3">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm font-bold tracking-tight">{successMessage}</span>
                    </div>
                </div>
            )}

            {/* ── PAGE HEADER ─────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">⚡ Quick Tasks</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage meetings, reminders, follow-ups &amp; personal tasks</p>
                </div>
                <button
                    onClick={openCreate}
                    className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-md shadow-teal-500/20 transition-all hover:-translate-y-0.5"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Quick Task
                </button>
            </div>

            {/* ── STAT CARDS ──────────────────────────────────────────── */}
            {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
                    {[
                        { label: 'Total', val: stats.total, color: 'bg-slate-50  border-slate-200', text: 'text-slate-700' },
                        { label: 'To Do', val: stats.todo, color: 'bg-blue-50   border-blue-200', text: 'text-blue-700' },
                        { label: 'In Progress', val: stats.inProgress, color: 'bg-indigo-50 border-indigo-200', text: 'text-indigo-700' },
                        { label: 'Done', val: stats.done, color: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
                        { label: 'Overdue', val: stats.overdue, color: 'bg-red-50    border-red-200', text: 'text-red-700' },
                    ].map(s => (
                        <div key={s.label} className={`rounded-xl border p-4 ${s.color}`}>
                            <div className={`text-2xl font-extrabold ${s.text}`}>{s.val}</div>
                            <div className="text-xs font-medium text-slate-500 mt-0.5">{s.label}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── VIEW TABS ────────────────────────────────────────────── */}
            <div className="flex flex-wrap gap-2 mb-5">
                {viewTabs.map(t => (
                    <button
                        key={t.key}
                        onClick={() => { setView(t.key); }}
                        className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${view === t.key ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-500/20' : 'bg-white text-slate-600 border-slate-200 hover:border-teal-400 hover:text-teal-700'}`}
                    >
                        {t.label}
                        {t.count != null && (
                            <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${view === t.key ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                {t.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* ── FILTERS BAR ──────────────────────────────────────────── */}
            <div className="flex flex-wrap gap-3 mb-6 bg-white border border-slate-100 rounded-xl px-4 py-3 shadow-sm">
                {/* Search */}
                <div className="relative flex-1 min-w-[180px]">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50"
                        placeholder="Search tasks, assignee, creator..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                {/* Filters dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setShowFiltersPanel(prev => !prev)}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl border transition ${showFiltersPanel ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-500/20' : 'bg-white text-slate-600 border-slate-200 hover:border-teal-400 hover:text-teal-700'}`}
                    >
                        Filters
                        <span className={`inline-block transition-transform ${showFiltersPanel ? 'rotate-180' : ''}`}>
                            ▼
                        </span>
                    </button>

                    {showFiltersPanel && (
                        <div ref={filterPanelRef} className="absolute right-0 mt-2 w-[320px] sm:w-[380px] bg-white border border-slate-200 rounded-2xl shadow-xl p-4 z-50">
                            <div className="grid grid-cols-1 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Priority</label>
                                    <select
                                        value={filters.priority}
                                        onChange={e => setFilters(p => ({ ...p, priority: e.target.value }))}
                                        className="mt-1 w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-400 text-slate-600"
                                    >
                                        <option value="">All Priorities</option>
                                        {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</label>
                                    <select
                                        value={filters.status}
                                        onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}
                                        className="mt-1 w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-400 text-slate-600"
                                    >
                                        <option value="">All Statuses</option>
                                        {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Category</label>
                                    <select
                                        value={filters.category}
                                        onChange={e => setFilters(p => ({ ...p, category: e.target.value }))}
                                        className="mt-1 w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-400 text-slate-600"
                                    >
                                        <option value="">All Categories</option>
                                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assignee</label>
                                    <select
                                        value={filters.assignedTo}
                                        onChange={e => setFilters(p => ({ ...p, assignedTo: e.target.value }))}
                                        className="mt-1 w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-400 text-slate-600"
                                    >
                                        <option value="">All Assignees</option>
                                        {users.map(u => (
                                            <option key={u._id} value={u._id}>{u.fullName} ({u.role})</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Due Date</label>
                                        <input
                                            type="date"
                                            value={filters.dueDate}
                                            onChange={e => setFilters(p => ({ ...p, dueDate: e.target.value }))}
                                            className="mt-1 w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-400 text-slate-600"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sort</label>
                                        <select
                                            value={sortBy}
                                            onChange={e => setSortBy(e.target.value)}
                                            className="mt-1 w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-400 text-slate-600"
                                        >
                                            <option value="newest">Newest</option>
                                            <option value="oldest">Oldest</option>
                                            <option value="dueSoon">Due Soon</option>
                                            <option value="priority">Priority</option>
                                            <option value="assignee">Assignee</option>
                                        </select>
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        setFilters({ status: '', priority: '', category: '', assignedTo: '', dueDate: '' });
                                        setSearch('');
                                    }}
                                    className="mt-2 w-full py-2 text-sm font-semibold text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition"
                                >
                                    Clear filters
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── TASK LIST ────────────────────────────────────────────── */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="text-5xl mb-4">📋</div>
                    <h3 className="text-lg font-semibold text-slate-700">No quick tasks found</h3>
                    <p className="text-sm text-slate-400 mt-1">Create your first quick task to get started</p>
                    <button onClick={openCreate} className="mt-5 px-5 py-2 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 transition">
                        + Add Quick Task
                    </button>
                </div>
            ) : (
                <div className="bg-white border border-slate-100 rounded-2xl divide-y divide-slate-100 padding-30">
                    {tasks.map(task => (
                        <TaskCard
                            key={task._id}
                            task={task}
                            onOpen={() => { setDetailTask(task); refreshDetail(task._id); }}
                            onEdit={() => openEdit(task)}
                            onDelete={() => setDeleteTarget(task)}
                            onCycleStatus={() => cycleStatus(task)}
                            checklistProgress={checklistProgress(task.checklist)}
                        />
                    ))}
                </div>
            )}

            {/* ── PAGINATION ───────────────────────────────────────────── */}
            {pagination.pages > 1 && (
                <div className="flex justify-center gap-2 mt-8">
                    {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
                        <button
                            key={p}
                            onClick={() => fetchTasks(p)}
                            className={`w-9 h-9 rounded-lg text-sm font-semibold transition ${p === pagination.page ? 'bg-teal-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-teal-400'}`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            )}

            {/* ══ TASK FORM MODAL ════════════════════════════════════════ */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-slate-100">
                            <h2 className="text-lg font-bold text-slate-800">
                                {editTask ? '✏️ Edit Quick Task' : '⚡ New Quick Task'}
                            </h2>
                            <button onClick={closeForm} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition text-slate-500">✕</button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-5">
                            {/* Title */}
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Title*</label>
                                <input
                                    name="title" value={formData.title} onChange={handleFormChange} required
                                    placeholder="What needs to be done?"
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Description</label>
                                <textarea
                                    name="description" value={formData.description} onChange={handleFormChange}
                                    rows={3} placeholder="Add details..."
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50 resize-none"
                                />
                            </div>

                            {/* Row: Priority + Status + Category */}
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Priority</label>
                                    <select name="priority" value={formData.priority} onChange={handleFormChange}
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50">
                                        {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Status</label>
                                    <select name="status" value={formData.status} onChange={handleFormChange}
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50">
                                        {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Category</label>
                                    <select name="category" value={formData.category} onChange={handleFormChange}
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50">
                                        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Row: Assign + Due Date */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Assign To*</label>
                                    <select name="assignedTo" value={formData.assignedTo} onChange={handleFormChange}
                                        required className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50">
                                        <option value="">Unassigned</option>
                                        {users.filter(u => u.role?.toLowerCase() !== 'admin').map(u => <option key={u._id} value={u._id}>{u.fullName} ({u.role})</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Due Date*</label>
                                    <input type="date" name="dueDate" value={formData.dueDate} required onChange={handleFormChange}
                                        min={new Date().toLocaleDateString('en-CA')}
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50" />
                                </div>
                            </div>

                            {/* Row: Reminder + Repeat */}
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Reminder Time</label>
                                    <input type="datetime-local" name="reminderTime" value={formData.reminderTime} onChange={handleFormChange}
                                        min={new Date().toLocaleString('sv-SE', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(' ', 'T')}
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Reminder Type</label>
                                    <select name="reminderType" value={formData.reminderType} onChange={handleFormChange}
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50">
                                        {REMINDER_TYPES.map(rt => <option key={rt}>{rt}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Repeat</label>
                                    <select name="repeatType" value={formData.repeatType} onChange={handleFormChange}
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50">
                                        {REPEAT_TYPES.map(r => <option key={r}>{r}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Checklist */}
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Checklist</label>
                                <div className="space-y-2 mb-3">
                                    {formData.checklist.map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                                            <input type="checkbox" checked={item.completed} readOnly className="accent-teal-600" />
                                            <span className={`flex-1 text-sm ${item.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>{item.text}</span>
                                            <button type="button" onClick={() => removeCheckItem(idx)} className="text-red-400 hover:text-red-600 text-xs font-bold">✕</button>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        value={newCheckItem} onChange={e => setNewCheckItem(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCheckItem())}
                                        placeholder="Add checklist item (press Enter)"
                                        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50"
                                    />
                                    <button type="button" onClick={addCheckItem} className="px-3 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 transition font-semibold">+ Add</button>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                                <button type="button" onClick={closeForm} className="px-5 py-2.5 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold transition">Cancel</button>
                                <button type="submit" disabled={saving} className="px-6 py-2.5 text-sm bg-teal-600 text-white hover:bg-teal-700 rounded-xl font-semibold transition disabled:opacity-60">
                                    {saving ? 'Saving...' : editTask ? 'Save Changes' : 'Create Task'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ══ DETAIL MODAL ══════════════════════════════════════════ */}
            {detailTask && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 z-50"
                    onClick={() => {
                        setDetailTask(null)
                        setShowReassignDropdown(false)
                    }}
                >

                    <div
                        className="bg-white w-full max-w-xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden relative border border-slate-200 animate-in fade-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >

                        {/* HEADER */}
                        <div className="flex flex-wrap items-start justify-between gap-3 p-6 border-b border-slate-100 bg-slate-50">

                            <div className="flex items-start gap-3">
                                <span className="text-3xl">
                                    {CATEGORY_ICON[detailTask.category] || "📋"}
                                </span>

                                <div>
                                    <h2 className="font-bold text-slate-900 text-lg leading-tight">
                                        {detailTask.title}
                                    </h2>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {detailTask.category}
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 relative">

                                <div className="relative">
                                    <button
                                        onClick={() => setShowReassignDropdown(!showReassignDropdown)}
                                        className="text-xs px-4 py-2 bg-teal-50 text-teal-600 rounded-xl font-semibold hover:bg-teal-100 transition flex items-center gap-2"
                                    >
                                        🔄 Reassign
                                    </button>

                                    {showReassignDropdown && (
                                        <div
                                            className="absolute right-0 top-full mt-2 z-50 w-72 bg-white border border-slate-100 rounded-2xl shadow-2xl p-4 animate-in fade-in zoom-in-95 duration-200"
                                            onClick={e => e.stopPropagation()}
                                        >

                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                                                Reassign Reason
                                            </h4>

                                            <textarea
                                                value={reassignReason}
                                                onChange={e => setReassignReason(e.target.value)}
                                                placeholder="Reason for reassignment..."
                                                rows={2}
                                                className="w-full p-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-100 bg-slate-50 resize-none mb-4"
                                            />

                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                                                Select New Assignee
                                            </h4>

                                            <div className="max-h-48 overflow-y-auto space-y-1">

                                                {users
                                                    .filter(u => u._id !== detailTask.assignedTo?._id)
                                                    .map(u => (
                                                        <button
                                                            key={u._id}
                                                            disabled={reassigning}
                                                            onClick={() => handleReassign(u._id)}
                                                            className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-teal-50 text-left"
                                                        >

                                                            <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-[10px] font-bold uppercase">
                                                                {u.fullName?.[0]}
                                                            </div>

                                                            <div>
                                                                <div className="text-xs font-bold text-slate-700">
                                                                    {u.fullName}
                                                                </div>
                                                                <div className="text-[10px] text-slate-400 capitalize">
                                                                    {u.role}
                                                                </div>
                                                            </div>

                                                        </button>
                                                    ))}

                                                {users.length === 0 && (
                                                    <p className="text-xs text-slate-400 text-center py-2 italic">
                                                        No other users found
                                                    </p>
                                                )}

                                            </div>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={() => openEdit(detailTask)}
                                    className="text-xs px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-semibold hover:bg-blue-100 transition"
                                >
                                    Edit
                                </button>

                                <button
                                    onClick={() => {
                                        setDeleteTarget(detailTask)
                                        setDetailTask(null)
                                    }}
                                    className="text-xs px-4 py-2 bg-red-50 text-red-500 rounded-xl font-semibold hover:bg-red-100 transition"
                                >
                                    Delete
                                </button>

                                <button
                                    onClick={() => setDetailTask(null)}
                                    className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-200 text-slate-500 hover:bg-slate-300 text-sm transition"
                                >
                                    ✕
                                </button>

                            </div>
                        </div>

                        {/* SCROLL BODY */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">

                            {/* BADGES */}
                            <div className="flex flex-wrap gap-2">

                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${PRIORITY_STYLE[detailTask.priority]}`}>
                                    {detailTask.priority}
                                </span>

                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_STYLE[detailTask.status]}`}>
                                    {detailTask.status?.replace("_", " ")}
                                </span>

                                {isOverdue(detailTask) && (
                                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                                        ⚠ OVERDUE
                                    </span>
                                )}

                            </div>

                            {/* STATUS BUTTON */}
                            <button
                                onClick={() => cycleStatus(detailTask)}
                                className="w-full py-2.5 text-sm font-semibold bg-teal-50 border border-teal-200 text-teal-700 rounded-2xl hover:bg-teal-100 transition"
                            >
                                Cycle Status ▶
                            </button>

                            {/* META */}
                            <div className="grid grid-cols-2 gap-3 text-sm">

                                <div className="bg-slate-50 rounded-xl p-3">
                                    <div className="text-xs text-slate-400 mb-1">Due Date</div>
                                    <div className={`${isOverdue(detailTask) ? "text-red-600" : "text-slate-700"} font-semibold`}>
                                        {fmt(detailTask.dueDate)}
                                    </div>
                                </div>

                                <div className="bg-slate-50 rounded-xl p-3">
                                    <div className="text-xs text-slate-400 mb-1">Assigned To</div>
                                    <div className="font-semibold text-slate-700">
                                        {detailTask.assignedTo?.fullName || "Unassigned"}
                                    </div>
                                </div>

                            </div>

                            {/* DESCRIPTION */}
                            {detailTask.description && (
                                <div>
                                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">
                                        Description
                                    </h4>

                                    <p className="text-sm text-slate-600 whitespace-pre-line">
                                        {detailTask.description}
                                    </p>
                                </div>
                            )}

                            {/* CHECKLIST */}
                            {detailTask.checklist?.length > 0 && (() => {

                                const progress = checklistProgress(detailTask.checklist)

                                return (
                                    <div>

                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="text-xs font-bold text-slate-500 uppercase">
                                                Checklist
                                            </h4>
                                            <span className="text-xs font-semibold text-teal-600">
                                                {progress}%
                                            </span>
                                        </div>

                                        <div className="h-1.5 bg-slate-100 rounded-full mb-3">
                                            <div
                                                className="h-1.5 bg-teal-500 rounded-full transition-all"
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>

                                        <div className="space-y-2">

                                            {detailTask.checklist.map(item => (

                                                <label
                                                    key={item._id}
                                                    className="flex items-center gap-3 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 cursor-pointer hover:bg-teal-50"
                                                >

                                                    <input
                                                        type="checkbox"
                                                        checked={item.completed}
                                                        onChange={e =>
                                                            toggleChecklist(
                                                                detailTask._id,
                                                                item._id,
                                                                e.target.checked
                                                            )
                                                        }
                                                        className="accent-teal-600 w-4 h-4"
                                                    />

                                                    <span
                                                        className={`text-sm flex-1 ${item.completed
                                                                ? "line-through text-slate-400"
                                                                : "text-slate-700"
                                                            }`}
                                                    >
                                                        {item.text}
                                                    </span>

                                                </label>

                                            ))}

                                        </div>
                                    </div>
                                )
                            })()}

                            {/* COMMENTS */}
                            <div className="pt-4 border-t border-slate-100">

                                <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">
                                    Comments ({detailTask.comments?.length || 0})
                                </h4>

                                <div className="space-y-3 mb-3">

                                    {(detailTask.comments || []).map((c, i) => (

                                        <div key={c._id || i}>

                                            <div className="flex items-center gap-2 mb-1">

                                                <div className="w-6 h-6 rounded-full bg-teal-500 flex items-center justify-center text-white text-xs font-bold">
                                                    {c.user?.fullName?.[0] || "?"}
                                                </div>

                                                <span className="text-xs font-semibold text-slate-700">
                                                    {c.user?.fullName || "User"}
                                                </span>

                                                <span className="text-xs text-slate-400 ml-auto">
                                                    {new Date(c.createdAt).toLocaleDateString()}
                                                </span>

                                            </div>

                                            <p className="text-sm text-slate-600 pl-8 break-words">
                                                {c.text}
                                            </p>

                                        </div>

                                    ))}

                                </div>

                                <div className="flex gap-2">

                                    <input
                                        value={commentText}
                                        onChange={e => setCommentText(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === "Enter" && !e.shiftKey) {
                                                e.preventDefault()
                                                handleAddComment()
                                            }
                                        }}
                                        placeholder="Write a comment..."
                                        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50"
                                    />

                                    <button
                                        onClick={handleAddComment}
                                        disabled={commentSaving || !commentText.trim()}
                                        className="px-4 py-2 bg-teal-600 text-white text-sm rounded-lg font-semibold hover:bg-teal-700 disabled:opacity-50"
                                    >
                                        {commentSaving ? "..." : "Post"}
                                    </button>

                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}



            {/* ══ DELETE CONFIRMATION MODAL ══════════════════════════════ */}
            {deleteTarget && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
                            <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 text-center mb-2">Delete Task</h3>
                        <p className="text-sm text-slate-500 text-center mb-1">Are you sure you want to delete</p>
                        <p className="text-sm font-semibold text-slate-800 text-center mb-5 truncate px-4">"{deleteTarget.title}"?</p>
                        <p className="text-xs text-center text-amber-600 bg-amber-50 border border-amber-100 rounded-lg p-2 mb-5">This action <strong>cannot be undone</strong>.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteTarget(null)} disabled={deleting} className="flex-1 py-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-semibold transition disabled:opacity-50">Cancel</button>
                            <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2.5 bg-red-600 text-white hover:bg-red-700 rounded-xl text-sm font-semibold transition disabled:opacity-50">
                                {deleting ? 'Deleting...' : 'Yes, Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TASK CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
// function TaskCard({ task, onOpen, onEdit, onDelete, onCycleStatus, checklistProgress }) {
//     const overdue = isOverdue(task);

//     return (
//         <div
//             className={`group flex items-center gap-4 px-4 py-3 cursor-pointer transition-colors duration-150 ${overdue ? 'bg-red-50/40 border-l-4 border-red-300' : 'hover:bg-slate-50'}
//                 ${task.status === 'DONE' ? 'opacity-90' : ''}`}
//             onClick={onOpen}
//         >
//             {/* Icon */}
//             <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-50 text-xl text-slate-500">
//                 {CATEGORY_ICON[task.category] || '📋'}
//             </div>

//             <div className="min-w-0 flex-1">
//                 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
//                     <div className="min-w-0">
//                         <h3 className={`text-sm font-semibold truncate ${task.status === 'DONE' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
//                             {task.title}
//                         </h3>
//                         <p className="text-xs text-slate-500 truncate">{task.description || 'No description'}</p>
//                     </div>

//                     <div className="flex items-center gap-2">
//                         <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${PRIORITY_STYLE[task.priority]}`}>{task.priority}</span>
//                         <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${STATUS_STYLE[task.status]}`}>{task.status?.replace('_', ' ')}</span>
//                     </div>
//                 </div>

//                 <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-500">
//                     <div className="flex items-center gap-2">
//                         <span>📅</span>
//                         <span className={`${overdue ? 'text-red-500' : ''}`}>{task.dueDate ? fmt(task.dueDate) : 'No due date'}</span>
//                     </div>
//                     <div className="flex items-center gap-2">
//                         <span>👤</span>
//                         <span className="truncate">{task.assignedTo?.fullName || 'Unassigned'}</span>
//                     </div>
//                     <div className="flex items-center gap-2">
//                         <span>💬</span>
//                         <span>{task.comments?.length || 0} comments</span>
//                     </div>
//                 </div>
//             </div>

//             <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
//                 <button onClick={onCycleStatus} className="p-2 rounded-lg bg-teal-50 text-teal-600 hover:bg-teal-100 transition" title="Cycle Status">
//                     <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
//                 </button>
//                 <button onClick={onEdit} className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition" title="Edit">
//                     <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
//                 </button>
//                 <button onClick={onDelete} className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition" title="Delete">
//                     <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
//                 </button>
//             </div>
//         </div>
//     );
// }
function TaskCard({ task, onOpen, onEdit, onDelete, onCycleStatus, checklistProgress }) {
    const overdue = isOverdue(task);

    return (
        <div
            className={`group flex items-start gap-4 px-4 py-3 border-b cursor-pointer transition
            ${overdue ? 'bg-red-50/40 border-l-4 border-red-300' : 'hover:bg-slate-50'}
            ${task.status === 'DONE' ? 'opacity-80' : ''}`}
            onClick={onOpen}
        >

            {/* Icon */}
            <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-slate-100 text-xl text-slate-600">
                {CATEGORY_ICON[task.category] || '📋'}
            </div>


            {/* Main Content */}
            <div className="flex-1 min-w-0">

                {/* Title Row */}
                <div className="flex items-start justify-between gap-3">

                    <div className="min-w-0">
                        <h3
                            className={`text-sm font-semibold truncate
                            ${task.status === 'DONE'
                                    ? 'line-through text-slate-400'
                                    : 'text-slate-800'}`}
                        >
                            {task.title}
                        </h3>

                        <p className="text-xs text-slate-500 truncate">
                            {task.description || 'No description'}
                        </p>
                    </div>

                    {/* Status + Priority */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${PRIORITY_STYLE[task.priority]}`}>
                            {task.priority}
                        </span>

                        <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${STATUS_STYLE[task.status]}`}>
                            {task.status?.replace('_', ' ')}
                        </span>
                    </div>

                </div>


                {/* Meta Info */}
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">

                    <div className="flex items-center gap-1">
                        <span>📅</span>
                        <span className={overdue ? 'text-red-500 font-medium' : ''}>
                            {task.dueDate ? fmt(task.dueDate) : 'No due date'}
                        </span>
                    </div>

                    <div className="flex items-center gap-1 min-w-0">
                        <span>👤</span>
                        <span className="truncate">
                            {task.assignedTo?.fullName || 'Unassigned'}
                        </span>
                    </div>

                    <div className="flex items-center gap-1">
                        <span>💬</span>
                        <span>{task.comments?.length || 0}</span>
                    </div>

                </div>

            </div>


            {/* Actions */}
            <div
                className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                onClick={e => e.stopPropagation()}
            >

                <button
                    onClick={onCycleStatus}
                    className="p-2 rounded-lg bg-teal-50 text-teal-600 hover:bg-teal-100 transition"
                    title="Cycle Status"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>

                <button
                    onClick={onEdit}
                    className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                    title="Edit"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5
                            m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828
                            l8.586-8.586z" />
                    </svg>
                </button>

                <button
                    onClick={onDelete}
                    className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition"
                    title="Delete"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862
                            a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6
                            m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>

            </div>
        </div>
    );
}