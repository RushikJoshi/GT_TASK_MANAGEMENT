import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

export default function ProjectDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { token, user } = useAuth();

    const [project, setProject] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    // Subtask expansion state (manager view)
    const [expandedTasks, setExpandedTasks] = useState({});
    const [taskSubtasks, setTaskSubtasks] = useState({});
    const [viewMode, setViewMode] = useState('list'); // 'list' | 'kanban' | 'activity'

    // Create Task Modal
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'Medium', dueDate: '', assignedTo: '', status: 'Todo' });

    // Workflow Customization State
    const [showWorkflowModal, setShowWorkflowModal] = useState(false);
    const [localWorkflow, setLocalWorkflow] = useState([]);

    // Open Dropdown tracking
    const [activeDropdown, setActiveDropdown] = useState(null); // 'priority' | 'status' | 'assignee' | taskId

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (activeDropdown && !e.target.closest('.custom-dropdown-container')) {
                setActiveDropdown(null);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [activeDropdown]);

    useEffect(() => {
        if (showTaskModal || showWorkflowModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
    }, [showTaskModal, showWorkflowModal]);

    useEffect(() => {
        if (project?.workflow) {
            setLocalWorkflow(project.workflow);
        }
    }, [project]);

    const handleSaveWorkflow = async () => {
        try {
            const res = await axios.put(`http://localhost:5000/api/projects/${id}/workflow`, { workflow: localWorkflow }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setProject(res.data.data);
                setShowWorkflowModal(false);
            }
        } catch (err) {
            console.error("Save workflow failed", err);
        }
    };

    useEffect(() => {
        fetchData();
    }, [id, token]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const headers = { Authorization: `Bearer ${token}` };
            const [projRes, tasksRes] = await Promise.all([
                axios.get(`http://localhost:5000/api/projects/${id}`, { headers }),
                axios.get(`http://localhost:5000/api/tasks?projectId=${id}`, { headers })
            ]);

            if (projRes.data.success) setProject(projRes.data.data);
            if (tasksRes.data.success) setTasks(tasksRes.data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchSubtasksForTask = async (taskId) => {
        if (taskSubtasks[taskId]) return; // already fetched
        try {
            const res = await axios.get(`http://localhost:5000/api/subtasks/task/${taskId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setTaskSubtasks(prev => ({ ...prev, [taskId]: res.data.data }));
            }
        } catch (err) { console.error(err); }
    };

    const toggleTaskExpand = (taskId) => {
        const nowExpanded = !expandedTasks[taskId];
        setExpandedTasks(prev => ({ ...prev, [taskId]: nowExpanded }));
        if (nowExpanded) fetchSubtasksForTask(taskId);
    };

    const handleCreateTask = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post(`http://localhost:5000/api/projects/${id}/tasks`, taskForm, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                // To display full populated details, refetch tasks
                fetchData();
                setShowTaskModal(false);
                setTaskForm({ title: '', description: '', priority: 'Medium', dueDate: '', assignedTo: '', status: 'Todo' });
            }
        } catch (err) {
            console.error(err);
        }
    };

    const updateTaskStatus = async (taskId, newStatus) => {
        try {
            await axios.put(`http://localhost:5000/api/tasks/${taskId}/status`, { status: newStatus }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTasks(tasks.map(t => t._id === taskId ? { ...t, status: newStatus } : t));
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) return <div className="text-center py-20 text-gray-500 font-medium">Loading project details...</div>;
    if (!project) return <div className="text-center py-20 text-rose-500 font-bold">Project not found.</div>;

    const completedStages = project.workflow?.filter(s => s.type === 'done').map(s => s.name) || ['Completed', 'Done'];
    const activeStages = project.workflow?.filter(s => s.type === 'active').map(s => s.name) || ['In Progress', 'Review', 'Hold'];

    const completedTasksNum = tasks.filter(t => completedStages.includes(t.status)).length;
    const progressTasksNum = tasks.filter(t => activeStages.includes(t.status)).length;

    // Weighted progress
    const progress = tasks.length === 0 ? 0 : Math.min(100, Math.round(
        ((completedTasksNum * 1) + (progressTasksNum * 0.4)) / tasks.length * 100
    ));

    const getProjectStage = (p) => {
        if (tasks.length === 0) return 'Planning';
        if (p === 0) return 'Planning';
        if (p < 25) return 'Initiation';
        if (p < 75) return 'Development';
        if (p < 100) return 'Review';
        return 'Completed';
    };
    const stage = getProjectStage(progress);

    const KanbanColumn = ({ stage }) => {
        const columnTasks = tasks.filter(t => t.status === stage.name);

        return (
            <div className="flex-1 bg-slate-50/70 rounded-[20px] p-4 border border-slate-100 flex flex-col min-w-[300px] shadow-[inset_0_2px_10px_rgba(0,0,0,0.01)]">
                <div className="flex items-center justify-between mb-4 px-1">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }}></div>
                        <h3 className="font-heading font-bold text-[13px] uppercase tracking-widest text-slate-600">{stage.name}</h3>
                    </div>
                    <span className="bg-white border border-slate-200 shadow-sm px-2 py-0.5 rounded-md text-[11px] font-bold text-slate-500">{columnTasks.length}</span>
                </div>
                <div className="space-y-3 flex-1 overflow-y-auto hide-scrollbar pb-2">
                    {columnTasks.map(task => (
                        <div key={task._id} onClick={() => navigate(`/tasks/${task._id}`)} className="bg-white p-4 rounded-[16px] border border-slate-100 shadow-sm hover:shadow-md hover:border-teal-200/50 transition-all duration-300 cursor-pointer group hover:-translate-y-0.5 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: stage.color }} />
                            <h4 className="font-semibold text-slate-800 text-[14px] mb-2.5 group-hover:text-teal-600 line-clamp-2 leading-snug pr-2">{task.title}</h4>
                            <div className="flex items-center justify-between mb-4 text-[11px] font-bold tracking-wider">
                                <span className={`px-2 py-1 rounded text-[10px] border flex items-center gap-1.5 w-max ${task.priority === 'High' ? 'text-rose-600 bg-rose-50 border-rose-100/50' : task.priority === 'Medium' ? 'text-amber-600 bg-amber-50 border-amber-100/50' : 'text-blue-600 bg-blue-50 border-blue-100/50'}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${task.priority === 'High' ? 'bg-rose-500' : task.priority === 'Medium' ? 'bg-amber-500' : 'bg-blue-500'}`}></span>
                                    {task.priority}
                                </span>
                            </div>

                            <div className="border-t border-slate-100/80 pt-3 flex items-center justify-between mt-auto">
                                <div className="flex items-center gap-2">
                                    <div className="w-[26px] h-[26px] rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-bold border border-slate-200 shadow-sm shrink-0 box-content">
                                        {task.assignedTo?.fullName?.charAt(0) || '?'}
                                    </div>
                                    <span className="text-[11px] font-bold text-slate-500 truncate max-w-[80px] group-hover:text-slate-700 transition-colors">{task.assignedTo?.fullName?.split(' ')[0] || 'Unassigned'}</span>
                                </div>
                                <select
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => updateTaskStatus(task._id, e.target.value)}
                                    value={task.status}
                                    className="text-[10px] border border-slate-200/80 rounded-lg px-2 py-1.5 font-bold text-slate-500 hover:text-slate-800 bg-white shadow-sm hover:border-slate-300 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M5%207.5L10%2012.5L15%207.5%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:14px_14px] bg-[position:right_0.2rem_center] bg-no-repeat pr-6 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                                >
                                    {project.workflow?.map(s => (
                                        <option key={s.id} value={s.name}>Move to {s.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    ))}
                    {columnTasks.length === 0 && (
                        <div className="text-center py-8 border-2 border-dashed border-slate-200/60 rounded-[16px]">
                            <span className="text-[11px] font-semibold text-slate-400">Empty Stage</span>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <>
            <div className="max-w-[1600px] mx-auto pb-10 flex flex-col h-full min-h-[calc(100vh-140px)] animate-fade-in font-sans">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                    <div>
                        <button onClick={() => navigate(-1)} className="text-[11px] font-bold text-slate-400 hover:text-slate-800 mb-3 uppercase tracking-widest flex items-center gap-1.5 transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                            Back
                        </button>
                        <h1 className="text-3xl font-heading font-extrabold text-slate-800 tracking-tight">{project.name}</h1>
                    </div>

                    {(user?.role === 'admin' || user?.role === 'manager') && (
                        <div className="flex items-center gap-3">
                            <button onClick={() => setShowWorkflowModal(true)} className="bg-white border border-slate-200 text-slate-600 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 flex items-center justify-center gap-2">
                                <svg className="w-4 h-4 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                                Workflow
                            </button>
                            <button onClick={() => setShowTaskModal(true)} className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 flex items-center justify-center gap-2 focus:ring-4 focus:ring-teal-100">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                                Create Task
                            </button>
                        </div>
                    )}
                </div>

                {/* Overview Card */}
                <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6 lg:p-8 mb-8 flex flex-col lg:flex-row gap-8 lg:items-center justify-between">
                    <div className="flex-1">
                        <p className="text-[14px] font-medium text-slate-500 leading-relaxed max-w-3xl">{project.description || 'No detailed description available for this project. Keep items organized using Tasks.'}</p>
                    </div>
                    <div className="w-[1px] h-20 bg-slate-100 hidden lg:block"></div>

                    <div className="flex flex-col gap-5 shrink-0 min-w-[320px]">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
                                Progress ({progress}%)
                            </span>
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border uppercase tracking-wider ${stage === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>{stage}</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200/50">
                            <div className="h-full bg-gradient-to-r from-teal-400 to-teal-600 transition-all duration-1000 rounded-full" style={{ width: `${progress}%` }}></div>
                        </div>
                        <div className="flex justify-between items-center pt-2">
                            <div className="flex -space-x-1.5">
                                {project.members?.map((m, idx) => (
                                    <div key={m._id || idx} className="w-[30px] h-[30px] rounded-full bg-slate-100 text-slate-600 font-bold border-2 border-white box-content flex items-center justify-center shadow-sm text-[11px] z-10 hover:z-20 hover:-translate-y-1 transition-all duration-300 cursor-pointer" title={m.fullName}>
                                        {m.fullName?.charAt(0)}
                                    </div>
                                ))}
                                {(!project.members || project.members.length === 0) && (
                                    <span className="text-[11px] text-slate-400 font-semibold italic">No members assigned</span>
                                )}
                            </div>
                            <div className="text-right flex flex-col">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1 justify-end">
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    Deadline
                                </span>
                                <span className="text-[13px] font-bold text-slate-800">{project.deadline ? new Date(project.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'No date set'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* View Toggles */}
                <div className="flex border-b border-slate-200 mb-6 font-semibold text-[13px]">
                    <button onClick={() => setViewMode('list')} className={`px-8 py-3.5 border-b-2 transition-all duration-200 ${viewMode === 'list' ? 'border-teal-500 text-teal-700 bg-teal-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50/50'}`}>List View</button>
                    <button onClick={() => setViewMode('kanban')} className={`px-8 py-3.5 border-b-2 transition-all duration-200 ${viewMode === 'kanban' ? 'border-teal-500 text-teal-700 bg-teal-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50/50'}`}>Kanban Board</button>
                </div>

                {/* Views Content */}
                <div className="flex-1 w-full bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[400px]">

                    {viewMode === 'list' && (
                        <div className="overflow-x-auto w-full">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/50">
                                        <th className="pl-4 py-4 w-10" />
                                        <th className="py-4 pr-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Task Title</th>
                                        <th className="py-4 pr-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest border-r border-slate-100/50">Assignee</th>
                                        <th className="py-4 pr-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest border-r border-slate-100/50">Priority</th>
                                        <th className="py-4 pr-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest border-r border-slate-100/50">Due Date</th>
                                        <th className="py-4 pr-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tasks.map(task => {
                                        const subs = taskSubtasks[task._id] || [];
                                        const isExp = !!expandedTasks[task._id];
                                        const taskOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Done' && task.status !== 'Completed';
                                        return (
                                            <React.Fragment key={task._id}>
                                                {/* ── Parent task row ── */}
                                                <tr className="group border-b border-slate-100 hover:bg-slate-50/60 transition-colors duration-150">
                                                    {/* Expand toggle */}
                                                    <td className="pl-4 py-4 w-10">
                                                        <button onClick={() => toggleTaskExpand(task._id)} className="p-1 rounded-lg hover:bg-slate-100 transition-all">
                                                            <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isExp ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                                                        </button>
                                                    </td>
                                                    {/* Title */}
                                                    <td className="py-4 pr-4 cursor-pointer" onClick={() => navigate(`/tasks/${task._id}`)}>
                                                        <div className="flex items-center gap-2.5">
                                                            <svg className="w-4 h-4 text-teal-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" /></svg>
                                                            <p className="font-bold text-slate-800 text-[14px] group-hover:text-teal-600 transition-colors truncate max-w-xs">{task.title}</p>
                                                            {taskOverdue && <span className="text-[8px] font-black uppercase tracking-widest text-rose-500 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded-md shrink-0">Overdue</span>}
                                                            {subs.length > 0 && <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-400 border border-indigo-100 shrink-0">{subs.length} sub</span>}
                                                        </div>
                                                    </td>
                                                    {/* Assignee */}
                                                    <td className="py-4 pr-4">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-[26px] h-[26px] rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-[10px] uppercase border border-slate-200 shrink-0 shadow-sm">{task.assignedTo?.fullName?.charAt(0) || '?'}</div>
                                                            <span className="text-[13px] font-semibold text-slate-600 truncate max-w-[120px]">{task.assignedTo?.fullName || 'Unassigned'}</span>
                                                        </div>
                                                    </td>
                                                    {/* Priority */}
                                                    <td className="py-4 pr-4">
                                                        <span className={`px-2.5 py-1 rounded-[6px] text-[10px] font-bold tracking-wider uppercase border flex items-center gap-1.5 w-max ${task.priority === 'High' ? 'text-rose-600 bg-rose-50 border-rose-100/50' : task.priority === 'Medium' ? 'text-amber-600 bg-amber-50 border-amber-100/50' : 'text-blue-600 bg-blue-50 border-blue-100/50'}`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${task.priority === 'High' ? 'bg-rose-500' : task.priority === 'Medium' ? 'bg-amber-500' : 'bg-blue-500'}`}></span>
                                                            {task.priority}
                                                        </span>
                                                    </td>
                                                    {/* Due date */}
                                                    <td className={`py-4 pr-4 text-[13px] font-medium ${taskOverdue ? 'text-rose-500 font-bold' : 'text-slate-500'}`}>
                                                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                                                    </td>
                                                    {/* Status */}
                                                    <td className="py-4 pr-4 text-right w-40">
                                                        <div className="relative custom-dropdown-container">
                                                            <div
                                                                onClick={() => setActiveDropdown(activeDropdown === task._id ? null : task._id)}
                                                                className={`text-[10px] border rounded-[8px] px-3 py-2 font-bold transition-all cursor-pointer flex items-center justify-between gap-2 uppercase tracking-widest bg-white shadow-sm hover:border-teal-300 ${activeDropdown === task._id ? 'border-teal-500 ring-4 ring-teal-500/10' : 'border-slate-200 text-slate-600'}`}
                                                            >
                                                                <span className="truncate">{task.status}</span>
                                                                <svg className={`w-3.5 h-3.5 transition-transform ${activeDropdown === task._id ? 'rotate-180 text-teal-600' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                                                            </div>
                                                            {activeDropdown === task._id && (
                                                                <div className="absolute top-[calc(100%+6px)] right-0 w-48 bg-white rounded-xl shadow-[0_15px_35px_rgba(0,0,0,0.15)] border border-slate-100 py-1.5 z-[100] animate-in fade-in zoom-in-95 duration-200">
                                                                    {project.workflow?.map(s => (
                                                                        <div key={s.id} onClick={() => { updateTaskStatus(task._id, s.name); setActiveDropdown(null); }}
                                                                            className={`px-4 py-2.5 mx-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-between ${task.status === s.name ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                                                                            {s.name}
                                                                            {task.status === s.name && <div className="w-1.5 h-1.5 rounded-full bg-teal-500"></div>}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>

                                                {/* ── Expanded Subtasks (read-only manager view) ── */}
                                                {isExp && (
                                                    <>
                                                        <tr className="bg-slate-50/40 border-b border-slate-50">
                                                            <td colSpan={6} className="pl-12 pr-6 py-2">
                                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" /></svg>
                                                                    Employee Subtasks · {subs.length}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                        {subs.length === 0 && (
                                                            <tr className="border-b border-slate-50">
                                                                <td colSpan={6} className="pl-12 py-4 text-[12px] text-slate-300 font-bold italic">No subtasks created by employee yet.</td>
                                                            </tr>
                                                        )}
                                                        {subs.map(sub => {
                                                            const subOverdue = sub.dueDate && new Date(sub.dueDate) < new Date();
                                                            return (
                                                                <tr key={sub._id} className="border-b border-slate-50 bg-white hover:bg-slate-50/30 transition-colors">
                                                                    <td className="pl-12 py-3 w-10" />
                                                                    {/* Title + stage dot */}
                                                                    <td className="py-3 pr-4">
                                                                        <div className="flex items-center gap-2.5">
                                                                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: sub.stageColor || '#94a3b8' }} />
                                                                            <span className="text-[13px] font-medium text-slate-700 truncate max-w-xs">{sub.title}</span>
                                                                            {subOverdue && <span className="text-[8px] font-black uppercase tracking-widest text-rose-500 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded-md shrink-0">Overdue</span>}
                                                                        </div>
                                                                        {sub.blockers && <p className="text-[11px] text-rose-500 font-bold mt-0.5 pl-4.5 truncate max-w-xs">⚠ {sub.blockers}</p>}
                                                                    </td>
                                                                    {/* Stage badge */}
                                                                    <td className="py-3 pr-4">
                                                                        <div className="flex items-center gap-2">
                                                                            {sub.stage ? (
                                                                                <span className="px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border"
                                                                                    style={{ backgroundColor: `${sub.stageColor || '#64748b'}12`, color: sub.stageColor || '#64748b', borderColor: `${sub.stageColor || '#64748b'}28` }}>
                                                                                    {sub.stage}
                                                                                </span>
                                                                            ) : <span className="text-[11px] text-slate-300 italic">No stage</span>}
                                                                            {/* Created by */}
                                                                            <div className="flex items-center gap-1 ml-2">
                                                                                <div className="w-5 h-5 rounded-full bg-slate-100 border flex items-center justify-center text-[8px] font-black text-slate-500 uppercase">{sub.employee?.fullName?.charAt(0) || '?'}</div>
                                                                                <span className="text-[10px] font-medium text-slate-400 hidden lg:block">{sub.employee?.fullName}</span>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    {/* Priority */}
                                                                    <td className="py-3 pr-4">
                                                                        <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border ${sub.priority === 'Urgent' ? 'bg-rose-50 text-rose-600 border-rose-100' : sub.priority === 'High' ? 'bg-orange-50 text-orange-600 border-orange-100' : sub.priority === 'Medium' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>{sub.priority}</span>
                                                                    </td>
                                                                    {/* Due */}
                                                                    <td className={`py-3 pr-4 text-[12px] font-medium ${subOverdue ? 'text-rose-500 font-bold' : 'text-slate-500'}`}>
                                                                        {sub.dueDate ? new Date(sub.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}
                                                                    </td>
                                                                    {/* Progress */}
                                                                    <td className="py-3 pr-6">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden min-w-[60px]">
                                                                                <div className="h-full rounded-full" style={{ width: `${sub.progressPercentage}%`, backgroundColor: sub.progressPercentage === 100 ? '#10b981' : sub.stageColor || '#6366f1' }} />
                                                                            </div>
                                                                            <span className={`text-[10px] font-black ${sub.progressPercentage === 100 ? 'text-emerald-500' : 'text-slate-400'}`}>{sub.progressPercentage}%</span>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                        <tr><td colSpan={6} className="border-b-2 border-slate-50 py-0.5" /></tr>
                                                    </>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                    {tasks.length === 0 && (
                                        <tr><td colSpan="6" className="px-6 py-16 text-center text-slate-500 font-medium text-[14px]">No tasks added to this project yet.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {viewMode === 'kanban' && (
                        <div className="p-6 flex-1 bg-white overflow-x-auto hide-scrollbar">
                            <div className="flex gap-6 h-full min-h-[500px]">
                                {project.workflow?.map(stage => (
                                    <KanbanColumn key={stage.id} stage={stage} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Task Modal */}
            {showTaskModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <div
                        className="fixed inset-0 bg-black/40 backdrop-blur-xl animate-in fade-in duration-300"
                        onClick={() => setShowTaskModal(false)}
                    />
                    <div className="relative z-10 bg-white rounded-[28px] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in duration-300" onClick={(e) => e.stopPropagation()}>
                        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                            <div>
                                <h2 className="text-[20px] font-heading font-black text-slate-900 tracking-tight">Add Task</h2>
                                <p className="text-[12px] text-slate-400 font-bold uppercase tracking-widest mt-1">Delegation & Tracking</p>
                            </div>
                            <button onClick={() => setShowTaskModal(false)} className="text-slate-400 hover:text-rose-500 p-2 rounded-full hover:bg-rose-50 transition-all">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="p-8 overflow-y-auto flex-1 hide-scrollbar bg-slate-50/20">
                            <form id="task-form" onSubmit={handleCreateTask} className="space-y-7">
                                <div>
                                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2.5">Task Title <span className="text-rose-500">*</span></label>
                                    <input type="text" value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} className="w-full h-12 px-5 border border-slate-200 rounded-2xl text-[14px] font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all shadow-sm bg-white hover:border-teal-200" placeholder="What needs to be done?" required />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2.5">Description</label>
                                    <textarea value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} className="w-full p-5 border border-slate-200 rounded-2xl text-[14px] font-medium text-slate-700 focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all shadow-sm min-h-[120px] bg-white hover:border-teal-200" placeholder="Add more context..." />
                                </div>

                                <div className="grid grid-cols-2 gap-7">
                                    <div>
                                        <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2.5">Due Date</label>
                                        <input type="date" value={taskForm.dueDate} onChange={e => setTaskForm({ ...taskForm, dueDate: e.target.value })} className="w-full h-12 px-5 border border-slate-200 rounded-2xl text-[14px] font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all shadow-sm bg-white hover:border-teal-200" />
                                    </div>
                                    <div className="relative custom-dropdown-container">
                                        <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2.5">Priority</label>
                                        <div
                                            onClick={() => setActiveDropdown(activeDropdown === 'priority' ? null : 'priority')}
                                            className={`w-full h-12 px-5 border rounded-2xl text-[14px] font-bold text-slate-800 flex items-center justify-between cursor-pointer transition-all shadow-sm bg-white hover:border-teal-200 ${activeDropdown === 'priority' ? 'border-teal-500 ring-4 ring-teal-500/10' : 'border-slate-200'}`}
                                        >
                                            <span>{taskForm.priority}</span>
                                            <svg className={`w-4 h-4 text-slate-400 transition-transform ${activeDropdown === 'priority' ? 'rotate-180 text-teal-600' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                                        </div>
                                        {activeDropdown === 'priority' && (
                                            <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.15)] border border-slate-100 py-2 z-[100] animate-in fade-in zoom-in-95 duration-200">
                                                {['Low', 'Medium', 'High'].map(p => (
                                                    <div
                                                        key={p}
                                                        onClick={() => { setTaskForm({ ...taskForm, priority: p }); setActiveDropdown(null); }}
                                                        className={`px-5 py-3 mx-2 rounded-xl text-[13px] font-bold transition-all cursor-pointer flex items-center justify-between ${taskForm.priority === p ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-semibold'}`}
                                                    >
                                                        {p}
                                                        {taskForm.priority === p && <div className="w-1.5 h-1.5 rounded-full bg-teal-500"></div>}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="col-span-1 relative custom-dropdown-container">
                                        <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2.5">Initial Stage</label>
                                        <div
                                            onClick={() => setActiveDropdown(activeDropdown === 'status' ? null : 'status')}
                                            className={`w-full h-12 px-5 border rounded-2xl text-[14px] font-bold text-slate-800 flex items-center justify-between cursor-pointer transition-all shadow-sm bg-white hover:border-teal-200 ${activeDropdown === 'status' ? 'border-teal-500 ring-4 ring-teal-500/10' : 'border-slate-200'}`}
                                        >
                                            <span className="truncate">{taskForm.status}</span>
                                            <svg className={`w-4 h-4 text-slate-400 transition-transform ${activeDropdown === 'status' ? 'rotate-180 text-teal-600' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                                        </div>
                                        {activeDropdown === 'status' && (
                                            <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.15)] border border-slate-100 py-2 z-[100] animate-in fade-in zoom-in-95 duration-200">
                                                {project.workflow?.map(s => (
                                                    <div
                                                        key={s.id}
                                                        onClick={() => { setTaskForm({ ...taskForm, status: s.name }); setActiveDropdown(null); }}
                                                        className={`px-5 py-3 mx-2 rounded-xl text-[13px] font-bold transition-all cursor-pointer flex items-center justify-between ${taskForm.status === s.name ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-semibold'}`}
                                                    >
                                                        {s.name}
                                                        {taskForm.status === s.name && <div className="w-1.5 h-1.5 rounded-full bg-teal-500"></div>}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="col-span-1 relative custom-dropdown-container">
                                        <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2.5">Assignee <span className="text-rose-500">*</span></label>
                                        <div
                                            onClick={() => setActiveDropdown(activeDropdown === 'assignee' ? null : 'assignee')}
                                            className={`w-full h-12 px-5 border rounded-2xl text-[14px] font-bold text-slate-800 flex items-center justify-between cursor-pointer transition-all shadow-sm bg-white hover:border-teal-200 ${activeDropdown === 'assignee' ? 'border-teal-500 ring-4 ring-teal-500/10' : 'border-slate-200'}`}
                                        >
                                            <span className="truncate">{project?.members?.find(m => m._id === taskForm.assignedTo)?.fullName || 'Select User'}</span>
                                            <svg className={`w-4 h-4 text-slate-400 transition-transform ${activeDropdown === 'assignee' ? 'rotate-180 text-teal-600' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                                        </div>
                                        {activeDropdown === 'assignee' && (
                                            <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.15)] border border-slate-100 py-2 z-[100] animate-in fade-in zoom-in-95 duration-200">
                                                {project?.members?.map(m => (
                                                    <div
                                                        key={m._id}
                                                        onClick={() => { setTaskForm({ ...taskForm, assignedTo: m._id }); setActiveDropdown(null); }}
                                                        className={`px-5 py-3 mx-2 rounded-xl text-[13px] font-bold transition-all cursor-pointer flex items-center justify-between group ${taskForm.assignedTo === m._id ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-semibold'}`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${taskForm.assignedTo === m._id ? 'bg-teal-100' : 'bg-slate-100'}`}>{m.fullName.charAt(0)}</div>
                                                            {m.fullName}
                                                        </div>
                                                        {taskForm.assignedTo === m._id && <div className="w-1.5 h-1.5 rounded-full bg-teal-500"></div>}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </form>
                        </div>

                        <div className="px-8 py-6 border-t border-slate-100 bg-white flex justify-end gap-4 shrink-0 rounded-b-[28px]">
                            <button type="button" onClick={() => setShowTaskModal(false)} className="px-6 py-3 rounded-2xl font-bold text-[14px] text-slate-500 hover:bg-slate-50 transition-all uppercase tracking-widest">Cancel</button>
                            <button type="submit" form="task-form" className="bg-slate-900 hover:bg-slate-800 text-white px-9 py-3 rounded-2xl font-bold text-[14px] transition-all duration-300 shadow-xl shadow-slate-900/10 hover:shadow-slate-900/20 active:scale-95 uppercase tracking-widest">Create Task</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Workflow Customization Modal */}
            {showWorkflowModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <div
                        className="fixed inset-0 bg-black/40 backdrop-blur-xl animate-in fade-in duration-300"
                        onClick={() => setShowWorkflowModal(false)}
                    />
                    <div className="relative z-10 bg-white rounded-[28px] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in duration-300" onClick={(e) => e.stopPropagation()}>
                        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                            <div>
                                <h2 className="text-[20px] font-heading font-black text-slate-900 tracking-tight">Work Pipeline</h2>
                                <p className="text-[12px] text-slate-400 font-bold uppercase tracking-widest mt-1">Manage task stages & workflow</p>
                            </div>
                            <button onClick={() => setShowWorkflowModal(false)} className="text-slate-400 hover:text-rose-500 p-2 rounded-full hover:bg-rose-50 transition-all">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="p-8 overflow-y-auto flex-1 hide-scrollbar bg-slate-50/20">
                            <div className="space-y-4">
                                {localWorkflow.map((stage, idx) => (
                                    <div key={stage.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-5 group hover:border-teal-200 transition-all">
                                        <div className="flex flex-col gap-1.5 opacity-20 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => {
                                                if (idx === 0) return;
                                                const newW = [...localWorkflow];
                                                [newW[idx], newW[idx - 1]] = [newW[idx - 1], newW[idx]];
                                                setLocalWorkflow(newW);
                                            }} className="text-slate-400 hover:text-teal-600 transition-colors"><svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" /></svg></button>
                                            <button onClick={() => {
                                                if (idx === localWorkflow.length - 1) return;
                                                const newW = [...localWorkflow];
                                                [newW[idx], newW[idx + 1]] = [newW[idx + 1], newW[idx]];
                                                setLocalWorkflow(newW);
                                            }} className="text-slate-400 hover:text-teal-600 transition-colors"><svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button>
                                        </div>

                                        <div className="relative shrink-0">
                                            <div className="w-6 h-6 rounded-full cursor-pointer border-2 border-white shadow-md ring-1 ring-slate-100 transition-transform active:scale-90" style={{ backgroundColor: stage.color }}></div>
                                            <input type="color" value={stage.color} onChange={(e) => {
                                                const newW = [...localWorkflow];
                                                newW[idx].color = e.target.value;
                                                setLocalWorkflow(newW);
                                            }} className="absolute inset-0 opacity-0 cursor-pointer" />
                                        </div>

                                        <input
                                            type="text"
                                            value={stage.name}
                                            onChange={(e) => {
                                                const newW = [...localWorkflow];
                                                newW[idx].name = e.target.value;
                                                setLocalWorkflow(newW);
                                            }}
                                            className="flex-1 font-bold text-slate-800 text-[14px] bg-white border border-slate-100 rounded-xl px-4 py-2.5 focus:ring-4 focus:ring-teal-500/10 focus:border-teal-300 transition-all"
                                        />

                                        <select
                                            value={stage.type}
                                            onChange={(e) => {
                                                const newW = [...localWorkflow];
                                                newW[idx].type = e.target.value;
                                                setLocalWorkflow(newW);
                                            }}
                                            className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 lg:w-36 focus:ring-0 cursor-pointer hover:bg-white transition-colors"
                                        >
                                            <option value="todo">🏁 TO DO</option>
                                            <option value="active">🏃 ACTIVE</option>
                                            <option value="done">✅ DONE</option>
                                        </select>

                                        <button
                                            onClick={() => {
                                                const newW = localWorkflow.filter((_, i) => i !== idx);
                                                setLocalWorkflow(newW);
                                            }}
                                            className="text-slate-300 hover:text-rose-500 transition-all p-2.5 rounded-xl hover:bg-rose-50"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => {
                                    const newStage = { id: `custom_${Date.now()}`, name: 'New Stage', color: '#94a3b8', type: 'active' };
                                    setLocalWorkflow([...localWorkflow, newStage]);
                                }}
                                className="w-full mt-7 py-5 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-black text-[12px] uppercase tracking-[0.2em] hover:border-teal-300 hover:text-teal-600 hover:bg-teal-50 transition-all flex items-center justify-center gap-3 active:scale-[0.99]"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                                Add New Stage
                            </button>
                        </div>

                        <div className="px-8 py-6 border-t border-slate-100 bg-white flex justify-end gap-4 shrink-0 rounded-b-[28px]">
                            <button onClick={() => setShowWorkflowModal(false)} className="px-7 py-3 rounded-2xl font-bold text-[14px] text-slate-500 hover:bg-slate-50 transition-all uppercase tracking-widest">Cancel</button>
                            <button onClick={handleSaveWorkflow} className="bg-slate-900 hover:bg-slate-800 text-white px-9 py-3 rounded-2xl font-bold text-[14px] transition-all shadow-xl shadow-slate-900/10 hover:shadow-slate-900/20 active:scale-95 uppercase tracking-widest">Save Workflow</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
