import React, { useEffect, useState, useCallback } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

// ─── Priority helpers ────────────────────────────────────────────────────────
const priorityConfig = {
    Urgent: { dot: 'bg-rose-500', pill: 'bg-rose-50 text-rose-600 border-rose-100' },
    High: { dot: 'bg-orange-500', pill: 'bg-orange-50 text-orange-600 border-orange-100' },
    Medium: { dot: 'bg-indigo-500', pill: 'bg-slate-50 text-indigo-600 border-indigo-100' },
    Low: { dot: 'bg-slate-400', pill: 'bg-slate-50 text-slate-500 border-slate-200' },
};
const getPriorityCfg = (p) => priorityConfig[p] || priorityConfig.Medium;

// ─── Status helpers ──────────────────────────────────────────────────────────
const statusColor = (s) => {
    if (!s) return 'bg-slate-100 text-slate-500 border-slate-200';
    const sl = s.toLowerCase();
    if (sl === 'done' || sl === 'completed') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (sl === 'review') return 'bg-purple-50  text-purple-700  border-purple-200';
    if (sl === 'in progress') return 'bg-indigo-50  text-indigo-700  border-indigo-200';
    return 'bg-slate-50 text-slate-600 border-slate-200';
};

const isOverdue = (dateStr, status) => {
    if (!dateStr) return false;
    const sl = (status || '').toLowerCase();
    if (sl === 'done' || sl === 'completed') return false;

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const due = new Date(dateStr);
    const dueStr = `${due.getUTCFullYear()}-${String(due.getUTCMonth() + 1).padStart(2, '0')}-${String(due.getUTCDate()).padStart(2, '0')}`;

    return dueStr < todayStr;
};

// ─── Subtask row (read-write for employee, read-only for manager/admin) ───────
function SubtaskRow({ sub, isEmployee, onUpdate, onDelete, token }) {
    const [editing, setEditing] = useState(false);
    const [title, setTitle] = useState(sub.title);
    const [progress, setProgress] = useState(sub.progressPercentage);
    const [dragging, setDragging] = useState(false);
    const overdue = isOverdue(sub.dueDate, sub.stage);

    const save = async () => {
        await onUpdate(sub._id, { title, progressPercentage: Number(progress) });
        setEditing(false);
    };

    return (
        <tr
            className={`group border-b border-slate-50 last:border-0 transaction-all duration-150 ${dragging ? 'opacity-40' : ''}`}
            draggable={isEmployee}
            onDragStart={() => setDragging(true)}
            onDragEnd={() => setDragging(false)}
        >
            {/* Indent + drag handle */}
            <td className="pl-14 pr-3 py-3 w-0">
                {isEmployee && (
                    <svg className="w-3.5 h-3.5 text-slate-200 group-hover:text-slate-400 transition-colors cursor-grab shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 8h16M4 16h16" />
                    </svg>
                )}
            </td>

            {/* Title */}
            <td className="py-3 pr-4 min-w-[180px]">
                <div className="flex items-center gap-2.5">
                    {/* Stage dot */}
                    <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: sub.stageColor || '#64748b' }} title={sub.stage || 'No stage'} />
                    {editing ? (
                        <input
                            className="flex-1 text-[13px] font-medium border-b border-indigo-300 outline-none bg-transparent py-0.5"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && save()}
                            autoFocus
                        />
                    ) : (
                        <span
                            className={`text-[13px] font-medium truncate max-w-xs ${isEmployee ? 'cursor-pointer hover:text-indigo-600' : ''} text-slate-700`}
                            onClick={() => isEmployee && setEditing(true)}
                        >
                            {sub.title}
                        </span>
                    )}
                    {overdue && (
                        <span className="text-[9px] font-black uppercase tracking-widest text-rose-500 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded-md shrink-0">Overdue</span>
                    )}
                </div>
                {sub.description && (
                    <p className="text-[11px] text-slate-400 pl-5 mt-0.5 truncate max-w-xs">{sub.description}</p>
                )}
            </td>

            {/* Stage badge */}
            <td className="py-3 pr-4 hidden md:table-cell">
                {sub.stage ? (
                    <span className="px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border"
                        style={{ backgroundColor: `${sub.stageColor || '#64748b'}12`, color: sub.stageColor || '#64748b', borderColor: `${sub.stageColor || '#64748b'}28` }}>
                        {sub.stage}
                    </span>
                ) : (
                    <span className="text-[11px] text-slate-300 font-bold italic">No stage</span>
                )}
            </td>

            {/* Priority */}
            <td className="py-3 pr-4 hidden sm:table-cell">
                <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border ${getPriorityCfg(sub.priority).pill}`}>
                    {sub.priority}
                </span>
            </td>

            {/* Due date */}
            <td className="py-3 pr-4 hidden md:table-cell whitespace-nowrap">
                <span className={`text-[12px] font-medium ${overdue ? 'text-rose-500 font-bold' : 'text-slate-500'}`}>
                    {sub.dueDate ? new Date(sub.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}
                </span>
            </td>

            {/* Progress */}
            <td className="py-3 pr-4">
                <div className="flex items-center gap-2.5 min-w-[100px]">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                                width: `${sub.progressPercentage}%`,
                                backgroundColor: sub.progressPercentage === 100 ? '#10b981' : sub.stageColor || '#6366f1'
                            }}
                        />
                    </div>
                    {editing ? (
                        <input
                            type="number"
                            min="0" max="100"
                            value={progress}
                            onChange={e => setProgress(e.target.value)}
                            className="w-12 text-[11px] font-bold text-center border border-indigo-200 rounded-lg outline-none py-0.5"
                        />
                    ) : (
                        <span
                            className={`text-[11px] font-black min-w-[30px] text-right ${isEmployee ? 'cursor-pointer hover:text-indigo-600' : ''} ${sub.progressPercentage === 100 ? 'text-emerald-600' : 'text-slate-500'}`}
                            onClick={() => isEmployee && setEditing(true)}
                        >
                            {sub.progressPercentage}%
                        </span>
                    )}
                </div>
            </td>

            {/* Blockers (manager sees) */}
            <td className="py-3 pr-4 hidden lg:table-cell">
                {sub.blockers ? (
                    <span className="text-[11px] text-rose-500 font-bold truncate max-w-[120px] block" title={sub.blockers}>
                        ⚠ {sub.blockers}
                    </span>
                ) : (
                    <span className="text-[11px] text-slate-200 font-bold">—</span>
                )}
            </td>

            {/* Created by (manager sees) / Edit-Save (employee) */}
            <td className="py-3 pr-6 text-right">
                {isEmployee ? (
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        {editing ? (
                            <>
                                <button onClick={save} className="text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 px-2 py-1 rounded-lg hover:bg-emerald-50 transition-all">Save</button>
                                <button onClick={() => { setEditing(false); setTitle(sub.title); setProgress(sub.progressPercentage); }} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-50 transition-all">Cancel</button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 transition-all">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                </button>
                                <button onClick={() => onDelete(sub._id)} className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center justify-end gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[8px] font-black text-slate-500 uppercase">
                            {sub.employee?.fullName?.charAt(0) || '?'}
                        </div>
                        <span className="text-[10px] font-medium text-slate-400 hidden lg:block truncate max-w-[80px]">{sub.employee?.fullName || 'Employee'}</span>
                    </div>
                )}
            </td>
        </tr>
    );
}

// ─── Parent task row (collapsible) ────────────────────────────────────────────
function TaskRow({ task, isEmployee, token, onNavigate }) {
    const [expanded, setExpanded] = useState(false);
    const [subtasks, setSubtasks] = useState([]);
    const [loadingSubs, setLoadingSubs] = useState(false);
    const [subtasksFetched, setSubtasksFetched] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [customStages, setCustomStages] = useState([]);

    // Inline add-subtask form state
    const [newSub, setNewSub] = useState({
        title: '', stage: '', stageColor: '', stageType: 'project',
        customStageRef: null, priority: 'Medium', dueDate: ''
    });
    const [stageDD, setStageDD] = useState(false);
    const [priDD, setPriDD] = useState(false);

    // Drag reorder
    const [draggedId, setDraggedId] = useState(null);

    const taskOverdue = isOverdue(task.dueDate, task.status);

    const fetchSubs = useCallback(async () => {
        if (subtasksFetched) return;
        setLoadingSubs(true);
        try {
            const res = await axiosInstance.get(`/subtasks/task/${task._id}`);
            if (res.data.success) {
                setSubtasks(res.data.data);
                setSubtasksFetched(true);
            }
        } catch (e) { console.error(e); }
        finally { setLoadingSubs(false); }
    }, [task._id, token, subtasksFetched]);

    const fetchStages = useCallback(async () => {
        try {
            const res = await axiosInstance.get(`/custom-stages/task/${task._id}`);
            if (res.data.success) setCustomStages(res.data.data);
        } catch (e) { /* ignore */ }
    }, [task._id, token]);

    const toggle = () => {
        if (!expanded) { fetchSubs(); fetchStages(); }
        setExpanded(p => !p);
    };

    const handleUpdate = async (id, data) => {
        try {
            await axiosInstance.put(`/subtasks/${id}`, data);
            setSubtasks(p => p.map(s => s._id === id ? { ...s, ...data } : s));
        } catch (e) { console.error(e); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this subtask?')) return;
        try {
            await axiosInstance.delete(`/subtasks/${id}`);
            setSubtasks(p => p.filter(s => s._id !== id));
        } catch (e) { console.error(e); }
    };

    const handleAdd = async () => {
        if (!newSub.title.trim()) return;
        try {
            const res = await axiosInstance.post('/subtasks', {
                parentTaskId: task._id,
                ...newSub,
                orderIndex: subtasks.length
            });
            if (res.data.success) {
                setSubtasks(p => [...p, res.data.data]);
                setNewSub({ title: '', stage: '', stageColor: '', stageType: 'project', customStageRef: null, priority: 'Medium', dueDate: '' });
                setShowAddForm(false);
            }
        } catch (e) { console.error(e); }
    };

    const handleReorder = async (newList) => {
        setSubtasks(newList);
        try {
            await axiosInstance.post('/subtasks/reorder', {
                subtasks: newList.map((s, i) => ({ id: s._id, orderIndex: i }))
            });
        } catch (e) { console.error(e); }
    };

    // All stages available for the dropdown
    const allStages = [
        ...(task.project?.workflow || []).map(s => ({ ...s, sourceType: 'project' })),
        ...customStages.map(s => ({ ...s, sourceType: 'custom' }))
    ];

    const subtaskCount = subtasks.length;

    return (
        <>
            {/* ── Parent task row ── */}
            <tr
                className="group border-b border-slate-100 hover:bg-slate-50/60 transition-colors duration-150 cursor-pointer"
                onClick={() => onNavigate(task._id)}
            >
                {/* Expand chevron */}
                <td className="pl-6 py-4 w-10" onClick={e => { e.stopPropagation(); toggle(); }}>
                    <button className="p-1 rounded-lg hover:bg-slate-100 transition-all">
                        <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </td>

                {/* Title */}
                <td className="pl-1 pr-4 py-4 min-w-[200px]">
                    <div className="flex items-center gap-2.5">
                        <svg className="w-4 h-4 text-indigo-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" />
                        </svg>
                        <span className="font-bold text-slate-800 text-[14px] group-hover:text-teal-600 transition-colors truncate max-w-xs">{task.title}</span>
                        {taskOverdue && (
                            <span className="text-[9px] font-black uppercase tracking-widest text-rose-500 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded-md shrink-0 hidden sm:inline">Overdue</span>
                        )}
                        {subtaskCount > 0 && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-400 border border-indigo-100 shrink-0">{subtaskCount}</span>
                        )}
                    </div>
                </td>

                {/* Project */}
                <td className="py-4 pr-4 hidden md:table-cell">
                    <span className="text-[12px] font-medium text-slate-500 truncate max-w-[140px] block">{task.project?.name || '—'}</span>
                </td>

                {/* Assignee */}
                <td className="py-4 pr-4 hidden sm:table-cell">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-teal-50 border border-teal-100 text-teal-700 font-bold flex items-center justify-center text-[10px] uppercase shrink-0">
                            {task.assignedTo?.fullName?.charAt(0) || '?'}
                        </div>
                        <span className="text-[12px] font-medium text-slate-600 truncate max-w-[110px]">{task.assignedTo?.fullName || 'Unassigned'}</span>
                    </div>
                </td>

                {/* Priority */}
                <td className="py-4 pr-4">
                    <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border flex items-center gap-1.5 w-max ${getPriorityCfg(task.priority).pill}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${getPriorityCfg(task.priority).dot}`} />
                        {task.priority}
                    </span>
                </td>

                {/* Due date */}
                <td className="py-4 pr-4 hidden md:table-cell whitespace-nowrap">
                    <span className={`text-[12px] font-medium ${taskOverdue ? 'text-rose-500 font-bold' : 'text-slate-500'}`}>
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </span>
                </td>

                {/* Status */}
                <td className="py-4 pr-6 text-right">
                    <span className={`inline-block px-2.5 py-1 rounded-lg text-[9px] font-black tracking-widest uppercase border ${statusColor(task.status)}`}>
                        {task.status === 'Done' ? 'Completed' : task.status}
                    </span>
                </td>
            </tr>

            {/* ── Subtasks section ── */}
            {expanded && (
                <>
                    {/* Sub-header */}
                    <tr className="bg-slate-50/40">
                        <td colSpan={8} className="pl-14 pr-6 py-2 border-b border-slate-100">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" /></svg>
                                    Subtasks · {subtaskCount}
                                </span>
                                {isEmployee && (
                                    <button
                                        onClick={() => setShowAddForm(p => !p)}
                                        className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-100 transition-all"
                                    >
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                                        Add Subtask
                                    </button>
                                )}
                            </div>
                        </td>
                    </tr>

                    {/* Sub-table header */}
                    <tr className="bg-slate-50/20 border-b border-slate-50">
                        <td className="pl-14 py-2 w-0" />
                        <td className="py-2 pr-4 text-[9px] font-black uppercase tracking-widest text-slate-300">Title</td>
                        <td className="py-2 pr-4 text-[9px] font-black uppercase tracking-widest text-slate-300 hidden md:table-cell">Stage</td>
                        <td className="py-2 pr-4 text-[9px] font-black uppercase tracking-widest text-slate-300 hidden sm:table-cell">Priority</td>
                        <td className="py-2 pr-4 text-[9px] font-black uppercase tracking-widest text-slate-300 hidden md:table-cell">Due</td>
                        <td className="py-2 pr-4 text-[9px] font-black uppercase tracking-widest text-slate-300">Progress</td>
                        <td className="py-2 pr-4 text-[9px] font-black uppercase tracking-widest text-slate-300 hidden lg:table-cell">Blockers</td>
                        <td className="py-2 pr-6 text-right text-[9px] font-black uppercase tracking-widest text-slate-300">{isEmployee ? 'Actions' : 'Created by'}</td>
                    </tr>

                    {/* Loading */}
                    {loadingSubs && (
                        <tr><td colSpan={8} className="pl-14 py-4 text-[12px] text-slate-400 font-medium">Loading subtasks…</td></tr>
                    )}

                    {/* Subtask rows */}
                    {!loadingSubs && subtasks.map(sub => (
                        <SubtaskRow
                            key={sub._id}
                            sub={sub}
                            isEmployee={isEmployee}
                            token={token}
                            onUpdate={handleUpdate}
                            onDelete={handleDelete}
                        />
                    ))}

                    {/* Empty state */}
                    {!loadingSubs && subtasks.length === 0 && !showAddForm && (
                        <tr><td colSpan={8} className="pl-14 py-5 text-[12px] text-slate-300 font-bold italic">No subtasks yet{isEmployee ? ' — click "+ Add Subtask" to create one' : ''}.</td></tr>
                    )}

                    {/* ── Inline add-subtask form ── */}
                    {showAddForm && isEmployee && (
                        <tr className="bg-indigo-50/30 border-b border-indigo-50">
                            <td colSpan={8} className="pl-14 pr-6 py-4">
                                <div className="flex flex-wrap gap-3 items-end">
                                    {/* Title */}
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder="Subtask title…"
                                        className="flex-1 min-w-[200px] bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-[13px] font-medium outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-all placeholder-slate-300"
                                        value={newSub.title}
                                        onChange={e => setNewSub(p => ({ ...p, title: e.target.value }))}
                                        onKeyDown={e => e.key === 'Enter' && handleAdd()}
                                    />

                                    {/* Stage dropdown */}
                                    <div className="relative" onClick={e => e.stopPropagation()}>
                                        <button
                                            type="button"
                                            onClick={() => { setStageDD(p => !p); setPriDD(false); }}
                                            className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-[12px] font-bold flex items-center gap-2 hover:border-indigo-300 transition-all min-w-[130px] justify-between"
                                        >
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                {newSub.stage ? (
                                                    <>
                                                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: newSub.stageColor }} />
                                                        <span className="truncate text-slate-700">{newSub.stage}</span>
                                                    </>
                                                ) : <span className="text-slate-400">Stage</span>}
                                            </div>
                                            <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform ${stageDD ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                                        </button>
                                        {stageDD && (
                                            <div className="absolute z-50 top-full mt-1.5 left-0 min-w-[180px] bg-white border border-slate-100 rounded-2xl shadow-2xl p-2 space-y-0.5">
                                                {allStages.length === 0 && <p className="text-[11px] text-slate-400 px-3 py-2">No stages found</p>}
                                                {allStages.map((s, i) => (
                                                    <button key={i} type="button"
                                                        onClick={() => {
                                                            setNewSub(p => ({ ...p, stage: s.name, stageColor: s.color, stageType: s.sourceType, customStageRef: s.sourceType === 'custom' ? s._id : null }));
                                                            setStageDD(false);
                                                        }}
                                                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-50 text-[12px] font-bold transition-all text-left"
                                                    >
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                                                            <span className="text-slate-700">{s.name}</span>
                                                        </div>
                                                        {s.sourceType === 'project' && <span className="text-[8px] font-black uppercase text-slate-300 bg-slate-50 px-1.5 py-0.5 rounded-md">Locked</span>}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Priority dropdown */}
                                    <div className="relative" onClick={e => e.stopPropagation()}>
                                        <button
                                            type="button"
                                            onClick={() => { setPriDD(p => !p); setStageDD(false); }}
                                            className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-[12px] font-bold flex items-center gap-2 hover:border-indigo-300 transition-all min-w-[130px] justify-between"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${getPriorityCfg(newSub.priority).dot}`} />
                                                <span className="text-slate-700">{newSub.priority}</span>
                                            </div>
                                            <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform ${priDD ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                                        </button>
                                        {priDD && (
                                            <div className="absolute z-50 top-full mt-1.5 left-0 min-w-[140px] bg-white border border-slate-100 rounded-2xl shadow-2xl p-2 space-y-0.5">
                                                {['Low', 'Medium', 'High', 'Urgent'].map(p => (
                                                    <button key={p} type="button"
                                                        onClick={() => { setNewSub(prev => ({ ...prev, priority: p })); setPriDD(false); }}
                                                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 text-[12px] font-bold transition-all ${newSub.priority === p ? 'text-indigo-600' : 'text-slate-600'}`}
                                                    >
                                                        <span className={`w-2.5 h-2.5 rounded-full ${getPriorityCfg(p).dot}`} />
                                                        {p}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Due date */}
                                    <input
                                        type="date"
                                        min={new Date().toLocaleDateString('en-CA')}
                                        className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-[12px] font-bold text-slate-600 outline-none focus:border-indigo-400 transition-all cursor-pointer"
                                        value={newSub.dueDate}
                                        onChange={e => setNewSub(p => ({ ...p, dueDate: e.target.value }))}
                                    />

                                    {/* Actions */}
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={handleAdd}
                                            disabled={!newSub.title.trim()}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-[12px] font-black uppercase tracking-widest transition-all shadow-md shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Create
                                        </button>
                                        <button
                                            onClick={() => setShowAddForm(false)}
                                            className="text-[12px] font-bold text-slate-400 hover:text-slate-600 px-3 py-2.5 rounded-xl hover:bg-slate-100 transition-all"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    )}

                    {/* Bottom border */}
                    <tr className="border-b-2 border-slate-50"><td colSpan={8} className="py-0.5" /></tr>
                </>
            )}
        </>
    );
}

// ─── Main Tasks page ──────────────────────────────────────────────────────────
export default function Tasks() {
    const { token, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterPriority, setFilterPriority] = useState('All');
    const [filterStatus, setFilterStatus] = useState('All');

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        setSearch(params.get('search') || '');
    }, [location.search]);

    const isEmployee = user?.role === 'employee';
    const isManagerAdmin = user?.role === 'manager' || user?.role === 'admin';

    useEffect(() => { fetchTasks(); }, [token]);

    const fetchTasks = async () => {
        try {
            const res = await axiosInstance.get('/tasks');
            if (res.data.success) setTasks(res.data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const filtered = tasks.filter(t => {
        const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.project?.name?.toLowerCase().includes(search.toLowerCase());
        const matchPriority = filterPriority === 'All' || t.priority === filterPriority;
        const matchStatus = filterStatus === 'All' || t.status === filterStatus;
        return matchSearch && matchPriority && matchStatus;
    });

    return (
        <div className="max-w-[1400px] mx-auto pb-10 font-sans">
            {/* ── Page header ── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-[26px] font-bold text-slate-900 tracking-tight">All Tasks</h1>
                    <p className="text-[14px] text-slate-500 mt-1">
                        {isEmployee ? 'Your assigned tasks with subtask breakdown.' : 'Cross-project task overview including employee subtasks.'}
                    </p>
                </div>
                {isManagerAdmin && (
                    <button
                        onClick={() => navigate('/projects')}
                        className="bg-slate-900 hover:bg-black text-white px-5 py-2.5 rounded-xl font-bold text-[13px] transition-all shadow-sm flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                        New Task
                    </button>
                )}
            </div>

            {/* ── Filters bar ── */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" /></svg>
                    <input
                        type="text"
                        placeholder="Search tasks or projects…"
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] font-medium outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                {/* Priority filter */}
                <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Priority:</span>
                    {['All', 'Low', 'Medium', 'High', 'Urgent'].map(p => (
                        <button key={p} onClick={() => setFilterPriority(p)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filterPriority === p ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                            {p}
                        </button>
                    ))}
                </div>

                {/* Status filter */}
                <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status:</span>
                    {['All', 'Todo', 'In Progress', 'Review', 'Done'].map(s => (
                        <button key={s} onClick={() => setFilterStatus(s)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filterStatus === s ? 'bg-teal-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                            {s === 'Done' ? 'Done' : s}
                        </button>
                    ))}
                </div>

                {/* Count badge */}
                <span className="text-[11px] font-bold text-slate-400 ml-auto">{filtered.length} task{filtered.length !== 1 ? 's' : ''}</span>
            </div>

            {/* ── Table ── */}
            <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="text-center py-24 text-slate-400 font-medium text-[14px]">Loading tasks…</div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-28 flex flex-col items-center gap-4">
                        <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 shadow-sm">
                            <svg className="w-7 h-7 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                        </div>
                        <div>
                            <h3 className="text-[16px] font-bold text-slate-700">No tasks found</h3>
                            <p className="text-[13px] text-slate-400 mt-1">Try adjusting your filters.</p>
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/60">
                                    <th className="pl-6 py-3.5 w-10" />
                                    <th className="py-3.5 pr-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Task</th>
                                    <th className="py-3.5 pr-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden md:table-cell">Project</th>
                                    <th className="py-3.5 pr-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden sm:table-cell">Assignee</th>
                                    <th className="py-3.5 pr-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Priority</th>
                                    <th className="py-3.5 pr-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden md:table-cell">Due Date</th>
                                    <th className="py-3.5 pr-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(task => (
                                    <TaskRow
                                        key={task._id}
                                        task={task}
                                        isEmployee={isEmployee}
                                        token={token}
                                        onNavigate={(id) => navigate(`/tasks/${id}`)}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
