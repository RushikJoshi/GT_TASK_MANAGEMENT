import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { quickTaskApi } from '../../api/quickTask.api';

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
const isOverdue = (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'DONE';

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
    const [filters, setFilters] = useState({ status: '', priority: '', category: '' });
    const [search, setSearch] = useState('');

    // ── modal state ───────────────────────────────────────────────────────
    const [showForm, setShowForm] = useState(false);
    const [editTask, setEditTask] = useState(null);     // task being edited
    const [detailTask, setDetailTask] = useState(null);   // task detail drawer
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [formData, setFormData] = useState(emptyForm());
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // ── checklist new item ────────────────────────────────────────────────
    const [newCheckItem, setNewCheckItem] = useState('');

    // ── comment ───────────────────────────────────────────────────────────
    const [commentText, setCommentText] = useState('');
    const [commentSaving, setCommentSaving] = useState(false);

    // ── users for assign dropdown ─────────────────────────────────────────
    const [users, setUsers] = useState([]);

    // ── fetch users list (admin/manager only — employees can only self-assign) ─
    useEffect(() => {
        if (user?.role !== 'employee') {
            fetch('http://localhost:5000/api/admin/users', {
                headers: { Authorization: `Bearer ${token}` }
            }).then(r => r.json()).then(d => {
                if (d.success) setUsers(d.data);
            }).catch(() => { });
        }
    }, [token, user]);

    // ─── Fetch tasks ─────────────────────────────────────────────────────
    const fetchTasks = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const params = { page, limit: 15 };
            if (view !== 'all') params.view = view;
            if (filters.status) params.status = filters.status;
            if (filters.priority) params.priority = filters.priority;
            if (filters.category) params.category = filters.category;

            const data = await quickTaskApi.getAll(token, params);
            if (data.success) {
                let list = data.data;
                // Client-side search filter
                if (search.trim()) {
                    const q = search.toLowerCase();
                    list = list.filter(t =>
                        t.title.toLowerCase().includes(q) ||
                        (t.description || '').toLowerCase().includes(q)
                    );
                }
                setTasks(list);
                setPagination(data.pagination || { total: list.length, page: 1, pages: 1 });
            }
        } catch (_) { }
        finally { setLoading(false); }
    }, [token, view, filters, search]);

    // ─── Fetch stats ─────────────────────────────────────────────────────
    const fetchStats = useCallback(async () => {
        const data = await quickTaskApi.getStats(token);
        if (data.success) setStats(data.data);
    }, [token]);

    useEffect(() => { fetchTasks(1); fetchStats(); }, [fetchTasks, fetchStats]);

    // ─── Refresh detail task if open ─────────────────────────────────────
    const refreshDetail = async (id) => {
        const data = await quickTaskApi.getById(token, id);
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
                res = await quickTaskApi.update(token, editTask._id, payload);
            } else {
                res = await quickTaskApi.create(token, payload);
            }

            if (res.success) {
                closeForm();
                fetchTasks(1);
                fetchStats();
            } else {
                alert(res.message || 'Failed to save task');
            }
        } catch (_) { alert('Something went wrong'); }
        finally { setSaving(false); }
    };

    // ─── Delete task ──────────────────────────────────────────────────────
    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            const res = await quickTaskApi.delete(token, deleteTarget._id);
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
        const res = await quickTaskApi.update(token, task._id, { status: next });
        if (res.success) {
            setTasks(p => p.map(t => t._id === task._id ? { ...t, status: next } : t));
            if (detailTask?._id === task._id) setDetailTask(d => ({ ...d, status: next }));
            fetchStats();
        }
    };

    // ─── Checklist toggle (in detail drawer) ─────────────────────────────
    const toggleChecklist = async (taskId, itemId, completed) => {
        const res = await quickTaskApi.toggleChecklist(token, taskId, itemId, completed);
        if (res.success) {
            setDetailTask(d => ({ ...d, checklist: res.data }));
            setTasks(p => p.map(t => t._id === taskId ? { ...t, checklist: res.data } : t));
        }
    };

    // ─── Add comment ──────────────────────────────────────────────────────
    const handleAddComment = async () => {
        if (!commentText.trim() || !detailTask) return;
        setCommentSaving(true);
        const res = await quickTaskApi.addComment(token, detailTask._id, commentText);
        if (res.success) {
            setDetailTask(d => ({ ...d, comments: res.data }));
            setCommentText('');
        }
        setCommentSaving(false);
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
                        placeholder="Search tasks..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                {/* Priority */}
                <select
                    value={filters.priority}
                    onChange={e => setFilters(p => ({ ...p, priority: e.target.value }))}
                    className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-400 text-slate-600"
                >
                    <option value="">All Priorities</option>
                    {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>

                {/* Status */}
                <select
                    value={filters.status}
                    onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}
                    className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-400 text-slate-600"
                >
                    <option value="">All Statuses</option>
                    {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>

                {/* Category */}
                <select
                    value={filters.category}
                    onChange={e => setFilters(p => ({ ...p, category: e.target.value }))}
                    className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-400 text-slate-600"
                >
                    <option value="">All Categories</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                {/* Clear */}
                {(filters.priority || filters.status || filters.category || search) && (
                    <button
                        onClick={() => { setFilters({ status: '', priority: '', category: '' }); setSearch(''); }}
                        className="text-xs font-semibold text-red-500 hover:text-red-700 px-2"
                    >
                        Clear
                    </button>
                )}
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
                <div className="space-y-3">
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
                                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Title *</label>
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
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Assign To</label>
                                    {user?.role === 'employee' ? (
                                        <input type="text" disabled value={user.fullName || user.name || '(Only you)'} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-100 text-slate-500" />
                                    ) : (
                                        <select name="assignedTo" value={formData.assignedTo} onChange={handleFormChange}
                                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50">
                                            <option value="">Unassigned</option>
                                            {users.map(u => <option key={u._id} value={u._id}>{u.fullName}</option>)}
                                        </select>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Due Date</label>
                                    <input type="date" name="dueDate" value={formData.dueDate} onChange={handleFormChange}
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50" />
                                </div>
                            </div>

                            {/* Row: Reminder + Repeat */}
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Reminder Time</label>
                                    <input type="datetime-local" name="reminderTime" value={formData.reminderTime} onChange={handleFormChange}
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
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setDetailTask(null)}>
                    <div
                        className="bg-white w-full sm:w-[500px] max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Detail Header */}
                        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">{CATEGORY_ICON[detailTask.category] || '📋'}</span>
                                <div>
                                    <h2 className="font-bold text-slate-800 leading-tight">{detailTask.title}</h2>
                                    <p className="text-xs text-slate-500 mt-0.5">{detailTask.category}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => openEdit(detailTask)} className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg font-semibold hover:bg-blue-100 transition">Edit</button>
                                <button onClick={() => { setDeleteTarget(detailTask); setDetailTask(null); }} className="text-xs px-3 py-1.5 bg-red-50 text-red-500 rounded-lg font-semibold hover:bg-red-100 transition">Delete</button>
                                <button onClick={() => setDetailTask(null)} className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-200 text-slate-500 hover:bg-slate-300 text-sm transition">✕</button>
                            </div>
                        </div>

                        {/* Detail Body */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-5">
                            {/* Badges row */}
                            <div className="flex flex-wrap gap-2">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${PRIORITY_STYLE[detailTask.priority]}`}>{detailTask.priority}</span>
                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_STYLE[detailTask.status]}`}>{detailTask.status?.replace('_', ' ')}</span>
                                {isOverdue(detailTask) && <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">⚠ OVERDUE</span>}
                                {detailTask.repeatType && detailTask.repeatType !== 'NONE' && (
                                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-violet-100 text-violet-700">🔁 {detailTask.repeatType}</span>
                                )}
                                {detailTask.reminderTime && detailTask.reminderType !== 'None' && (
                                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">🔔 Reminder Set</span>
                                )}
                            </div>

                            {/* Quick status change */}
                            <button
                                onClick={() => cycleStatus(detailTask)}
                                className="w-full py-2 text-sm font-semibold bg-teal-50 border border-teal-200 text-teal-700 rounded-xl hover:bg-teal-100 transition"
                            >
                                Cycle Status ▶ {['TODO', 'IN_PROGRESS', 'DONE'][(['TODO', 'IN_PROGRESS', 'DONE'].indexOf(detailTask.status) + 1) % 3].replace('_', ' ')}
                            </button>

                            {/* Meta info */}
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="bg-slate-50 rounded-xl p-3">
                                    <div className="text-xs text-slate-400 font-medium mb-0.5">Due Date</div>
                                    <div className={`font-semibold ${isOverdue(detailTask) ? 'text-red-600' : 'text-slate-700'}`}>{fmt(detailTask.dueDate)}</div>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-3">
                                    <div className="text-xs text-slate-400 font-medium mb-0.5">Assigned To</div>
                                    <div className="font-semibold text-slate-700">{detailTask.assignedTo?.fullName || 'Unassigned'}</div>
                                </div>
                                {detailTask.reminderTime && (
                                    <div className="bg-amber-50 rounded-xl p-3">
                                        <div className="text-xs text-amber-500 font-medium mb-0.5">🔔 Reminder</div>
                                        <div className="font-semibold text-slate-700 text-xs">{fmt(detailTask.reminderTime)} — {detailTask.reminderType}</div>
                                    </div>
                                )}
                                <div className="bg-slate-50 rounded-xl p-3">
                                    <div className="text-xs text-slate-400 font-medium mb-0.5">Created By</div>
                                    <div className="font-semibold text-slate-700">{detailTask.createdBy?.fullName || '—'}</div>
                                </div>
                            </div>

                            {/* Description */}
                            {detailTask.description && (
                                <div>
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Description</h4>
                                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{detailTask.description}</p>
                                </div>
                            )}

                            {/* Checklist */}
                            {detailTask.checklist?.length > 0 && (
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Checklist</h4>
                                        <span className="text-xs font-semibold text-teal-600">{checklistProgress(detailTask.checklist)}%</span>
                                    </div>
                                    {/* Progress bar */}
                                    <div className="h-1.5 bg-slate-100 rounded-full mb-3">
                                        <div className="h-1.5 bg-teal-500 rounded-full transition-all" style={{ width: `${checklistProgress(detailTask.checklist)}%` }} />
                                    </div>
                                    <div className="space-y-2">
                                        {detailTask.checklist.map(item => (
                                            <label key={item._id} className="flex items-center gap-3 bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-teal-50 transition">
                                                <input
                                                    type="checkbox"
                                                    checked={item.completed}
                                                    onChange={e => toggleChecklist(detailTask._id, item._id, e.target.checked)}
                                                    className="accent-teal-600 w-4 h-4"
                                                />
                                                <span className={`text-sm flex-1 ${item.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>{item.text}</span>
                                                {item.completed && <span className="text-emerald-500 text-xs font-bold">✓</span>}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Comments */}
                            <div>
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Comments ({detailTask.comments?.length || 0})</h4>
                                <div className="space-y-3 mb-3">
                                    {(detailTask.comments || []).map((c, i) => (
                                        <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="w-6 h-6 rounded-full bg-teal-500 flex items-center justify-center text-white text-xs font-bold">
                                                    {c.user?.fullName?.[0] || '?'}
                                                </div>
                                                <span className="text-xs font-semibold text-slate-700">{c.user?.fullName || 'User'}</span>
                                                <span className="text-xs text-slate-400 ml-auto">{new Date(c.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <p className="text-sm text-slate-600 pl-8">{c.text}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        value={commentText}
                                        onChange={e => setCommentText(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                                        placeholder="Write a comment..."
                                        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50"
                                    />
                                    <button onClick={handleAddComment} disabled={commentSaving || !commentText.trim()} className="px-4 py-2 bg-teal-600 text-white text-sm rounded-lg font-semibold hover:bg-teal-700 disabled:opacity-50 transition">
                                        {commentSaving ? '...' : 'Post'}
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
function TaskCard({ task, onOpen, onEdit, onDelete, onCycleStatus, checklistProgress }) {
    const overdue = isOverdue(task);

    return (
        <div
            className={`group bg-white border rounded-2xl px-5 py-4 cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 ${overdue ? 'border-red-200 bg-red-50/30' : 'border-slate-200 hover:border-teal-200'}`}
            onClick={onOpen}
        >
            <div className="flex items-start gap-4">
                {/* Category Icon */}
                <div className="text-xl mt-0.5 shrink-0">{CATEGORY_ICON[task.category] || '📋'}</div>

                {/* Main Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h3 className={`font-semibold text-slate-800 truncate text-sm ${task.status === 'DONE' ? 'line-through text-slate-400' : ''}`}>
                                {task.title}
                            </h3>
                            {task.description && (
                                <p className="text-xs text-slate-400 mt-0.5 truncate">{task.description}</p>
                            )}
                        </div>
                        {/* Actions */}
                        <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                            <button onClick={onCycleStatus} className="p-1.5 rounded-lg bg-teal-50 text-teal-600 hover:bg-teal-100 transition" title="Cycle Status">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            </button>
                            <button onClick={onEdit} className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition" title="Edit">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button onClick={onDelete} className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition" title="Delete">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        </div>
                    </div>

                    {/* Badges Row */}
                    <div className="flex flex-wrap items-center gap-2 mt-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${PRIORITY_STYLE[task.priority]}`}>{task.priority}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_STYLE[task.status]}`}>{task.status?.replace('_', ' ')}</span>
                        {overdue && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">⚠ Overdue</span>}
                        {task.repeatType && task.repeatType !== 'NONE' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-700">🔁 {task.repeatType}</span>
                        )}
                        {task.reminderTime && task.reminderType !== 'None' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">🔔 Reminder</span>
                        )}

                        {/* Spacer */}
                        <div className="flex-1" />

                        {/* Due date */}
                        {task.dueDate && (
                            <span className={`text-[11px] font-semibold ${overdue ? 'text-red-500' : 'text-slate-400'}`}>
                                📅 {fmt(task.dueDate)}
                            </span>
                        )}

                        {/* Assigned avatar */}
                        {task.assignedTo && (
                            <div className="flex items-center gap-1">
                                <div className="w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center text-white text-[10px] font-bold">
                                    {task.assignedTo.fullName?.[0] || '?'}
                                </div>
                                <span className="text-[11px] text-slate-400">{task.assignedTo.fullName}</span>
                            </div>
                        )}

                        {/* Comment count */}
                        {task.comments?.length > 0 && (
                            <span className="text-[11px] text-slate-400">💬 {task.comments.length}</span>
                        )}
                    </div>

                    {/* Checklist progress bar */}
                    {task.checklist?.length > 0 && (
                        <div className="mt-3">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] text-slate-400 font-medium">Checklist</span>
                                <span className="text-[10px] font-semibold text-teal-600">{checklistProgress}%</span>
                            </div>
                            <div className="h-1 bg-slate-100 rounded-full">
                                <div className="h-1 bg-teal-500 rounded-full transition-all" style={{ width: `${checklistProgress}%` }} />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
