import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';

export default function TaskDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { token, user } = useAuth();

    const [task, setTask] = useState(null);
    const [loading, setLoading] = useState(true);

    const isEmployee = user?.role === 'employee';
    const isManagerOrAdmin = user?.role === 'manager' || user?.role === 'admin';


    // Comments
    const [commentText, setCommentText] = useState('');
    const [updatingStatus, setUpdatingStatus] = useState(false);

    // Daily Report State
    const [activeTab, setActiveTab] = useState('comments'); // comments | daily-report | subtasks | history
    const [reports, setReports] = useState([]);
    const [isSubmittingReport, setIsSubmittingReport] = useState(false);
    const [reportData, setReportData] = useState({
        progressPercentage: 0,
        completedToday: '',
        pending: '',
        blockers: '',
        expectedCompletion: '',
        date: new Date().toISOString().split('T')[0]
    });

    // Subtask System State
    const [subtasks, setSubtasks] = useState([]);
    const [customStages, setCustomStages] = useState([]);
    const [isManagingStages, setIsManagingStages] = useState(false);
    const [isAddingSubtask, setIsAddingSubtask] = useState(false);
    const [newSubtask, setNewSubtask] = useState({ title: '', description: '', stage: '', stageColor: '', stageType: '', customStageRef: null, priority: 'Medium', dueDate: '' });
    const [newStage, setNewStage] = useState({ name: '', color: '#14b8a6' });
    const [draggedStageId, setDraggedStageId] = useState(null);
    const [draggedSubtaskId, setDraggedSubtaskId] = useState(null);
    const [isStageDropdownOpen, setIsStageDropdownOpen] = useState(false);
    const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
    const [isPriorityDropdownOpen, setIsPriorityDropdownOpen] = useState(false);
    const [showReassignDropdown, setShowReassignDropdown] = useState(false);
    const [reassigning, setReassigning] = useState(false);
    const [users, setUsers] = useState([]);
    const [reassignReason, setReassignReason] = useState('');

    useEffect(() => {
        axiosInstance.get('/users/assignable')
            .then(res => {
                if (res.data.success) setUsers(res.data.data);
            })
            .catch(e => console.error('Error fetching assignable users:', e));
    }, []);

    const handleReassign = async (newUserId) => {
        if (reassigning) return;
        if (!reassignReason.trim()) {
            alert('Please provide a reason for reassignment');
            return;
        }
        setReassigning(true);
        try {
            const res = await axiosInstance.put(`/tasks/${id}/reassign`, {
                newAssigneeId: newUserId,
                reason: reassignReason
            });
            if (res.data.success) {
                setTask(res.data.data);
                setShowReassignDropdown(false);
                setReassignReason('');
                alert('Task reassigned successfully');
            }
        } catch (e) {
            alert(e.response?.data?.message || 'Reassignment failed');
        } finally {
            setReassigning(false);
        }
    };

    useEffect(() => {
        if (id && token) {
            fetchTask();
            fetchReports();
            fetchSubtasks();
            fetchCustomStages();
        }
    }, [id, token]);

    // Close all dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = () => {
            setIsStageDropdownOpen(false);
            setIsStatusDropdownOpen(false);
            setIsPriorityDropdownOpen(false);
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    useEffect(() => {
        if (task) {
            const status = task.status?.toLowerCase();
            let progress = 0;
            if (status === 'done' || status === 'completed') progress = 100;
            else if (status === 'review') progress = 80;
            else if (status === 'in progress' || status === 'active') {
                // If there are previous reports, use the last progress value
                if (reports && reports.length > 0) {
                    progress = reports[0].progressPercentage;
                } else {
                    progress = 30; // Default for active task
                }
            } else if (status === 'todo' || status === 'planning') {
                progress = 0;
            }

            setReportData(prev => ({ ...prev, progressPercentage: progress }));
        }
    }, [task?.status, reports?.length]);

    const fetchReports = async () => {
        try {
            const res = await axiosInstance.get(`/daily-reports/task/${id}`);
            if (res.data.success) {
                setReports(res.data.data || []);
            }
        } catch (err) {
            console.error("Error fetching reports:", err);
        }
    };

    const fetchTask = async () => {
        try {
            setLoading(true);
            const res = await axiosInstance.get(`/tasks/${id}`);
            if (res.data.success) {
                setTask(res.data.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchSubtasks = async () => {
        try {
            const res = await axiosInstance.get(`/subtasks/task/${id}`);
            if (res.data.success) {
                setSubtasks(res.data.data || []);
            }
        } catch (err) {
            console.error("Error fetching subtasks:", err);
        }
    };

    const fetchCustomStages = async () => {
        try {
            const res = await axiosInstance.get(`/custom-stages/task/${id}`);
            if (res.data.success) {
                setCustomStages(res.data.data || []);
            }
        } catch (err) {
            console.error("Error fetching custom stages:", err);
        }
    };

    const handleAddStage = async () => {
        if (!newStage.name.trim()) return;
        try {
            await axiosInstance.post('/custom-stages', {
                taskId: id,
                name: newStage.name,
                color: newStage.color,
                orderIndex: customStages.length
            });
            setNewStage({ name: '', color: '#14b8a6' });
            fetchCustomStages();
        } catch (err) {
            console.error("Error adding stage:", err);
        }
    };

    const handleDeleteStage = async (stageId) => {
        if (!window.confirm("Delete this stage? Subtasks in this stage will lose their stage reference.")) return;
        try {
            await axiosInstance.delete(`/custom-stages/${stageId}`);
            fetchCustomStages();
            fetchSubtasks();
        } catch (err) {
            console.error("Error deleting stage:", err);
        }
    };

    const handleAddSubtask = async (e) => {
        e.preventDefault();
        try {
            await axiosInstance.post('/subtasks', {
                parentTaskId: id,
                ...newSubtask,
                orderIndex: subtasks.length
            });
            setNewSubtask({ title: '', description: '', stage: '', stageColor: '', stageType: '', customStageRef: null, priority: 'Medium', dueDate: '' });
            setIsAddingSubtask(false);
            fetchSubtasks();
        } catch (err) {
            console.error("Error adding subtask:", err);
        }
    };

    const handleDeleteSubtask = async (subtaskId) => {
        if (!window.confirm("Delete this subtask?")) return;
        try {
            await axiosInstance.delete(`/subtasks/${subtaskId}`);
            fetchSubtasks();
        } catch (err) {
            console.error("Error deleting subtask:", err);
        }
    };

    const handleUpdateSubtask = async (subtaskId, data) => {
        try {
            await axiosInstance.put(`/subtasks/${subtaskId}`, data);
            fetchSubtasks();
        } catch (err) {
            console.error("Error updating subtask:", err);
        }
    };

    const handleDragStartStage = (id) => {
        setDraggedStageId(id);
    };

    const handleReorderStages = async (newStages) => {
        const reordered = newStages.map((s, idx) => ({ id: s._id, orderIndex: idx }));
        try {
            setCustomStages(newStages);
            await axiosInstance.post('/custom-stages/reorder', { stages: reordered });
        } catch (err) {
            console.error("Error reordering stages:", err);
            fetchCustomStages();
        }
    };

    const handleReorderSubtasks = async (newSubtasks) => {
        const reordered = newSubtasks.map((s, idx) => ({ id: s._id, orderIndex: idx }));
        try {
            setSubtasks(newSubtasks);
            await axiosInstance.post('/subtasks/reorder', { subtasks: reordered });
        } catch (err) {
            console.error("Error reordering subtasks:", err);
            fetchSubtasks();
        }
    };

    const handleUpdateStatus = async (newStatus) => {
        try {
            setUpdatingStatus(true);
            const res = await axiosInstance.put(`/tasks/${id}/status`, { status: newStatus });
            if (res.data.success) {
                fetchTask(); // Refresh task to get new activity feed or just trigger a re-render
            }
        } catch (err) {
            console.error(err);
        } finally {
            setUpdatingStatus(false);
        }
    };

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!commentText.trim()) return;

        try {
            const res = await axiosInstance.post(`/tasks/${id}/comments`, { text: commentText });
            if (res.data.success) {
                setCommentText('');
                fetchTask(); // Refresh comments list
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleSubmitReport = async (e) => {
        e.preventDefault();
        try {
            setIsSubmittingReport(true);
            const res = await axiosInstance.post('/daily-reports', {
                ...reportData,
                task: id
            });
            if (res.data.success) {
                setReportData({
                    progressPercentage: 0,
                    completedToday: '',
                    pending: '',
                    blockers: '',
                    expectedCompletion: '',
                    date: new Date().toISOString().split('T')[0]
                });
                fetchReports();
                fetchTask(); // Might update overall progress
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Error submitting report');
        } finally {
            setIsSubmittingReport(false);
        }
    };

    const handleReviewReport = async (reportId, isApproved, managerNote) => {
        try {
            const res = await axiosInstance.put(`/daily-reports/${reportId}/review`, {
                isApproved,
                managerNote
            });
            if (res.data.success) {
                fetchReports();
                fetchTask();
            }
        } catch (err) {
            console.error("Error reviewing report:", err);
        }
    };

    const handleDeleteTask = async () => {
        if (!window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) return;
        try {
            const res = await axiosInstance.delete(`/tasks/${task._id}`);
            if (res.data.success) {
                navigate(-1); // Go back after deletion
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Error deleting task');
        }
    };

    if (loading) return <div className="text-center py-20 text-gray-500 font-medium tracking-wide">Loading task details...</div>;
    if (!task) return <div className="text-center py-20 text-rose-500 font-bold bg-rose-50 rounded-2xl mx-10 mt-10">Task not found or access denied.</div>;

    // Check permissions
    const isAssignee = task?.assignedTo?._id === user?._id;
    const canUpdateStatus = isAssignee || isManagerOrAdmin;

    // Same-day duplicate guard
    const todayStr = new Date().toISOString().split('T')[0]; // e.g. "2026-03-03"
    const todayReportExists = reports.some(r => {
        if (!r.createdAt) return false;
        const reportDay = new Date(r.createdAt).toISOString().split('T')[0];
        const reportUserId = r.employee?._id || r.employee;
        return reportDay === todayStr && reportUserId === user?._id;
    });

    const allowedStatuses = ['Todo', 'In Progress', 'Review', 'Done'];

    return (
        <div className="max-w-[1200px] mx-auto pb-10 flex flex-col min-h-screen animate-fade-in font-sans">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8 mt-2">
                <div className="flex-1">
                    <button onClick={() => navigate(-1)} className="text-[11px] font-bold text-slate-400 hover:text-slate-800 mb-4 uppercase tracking-widest flex items-center gap-1.5 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Back to List
                    </button>
                    <div className="flex items-center gap-3 mb-3">
                        <span className={`px-2.5 py-1 rounded-[6px] text-[10px] font-bold tracking-wider uppercase border flex items-center gap-1.5 ${task.priority === 'High' ? 'text-rose-600 bg-rose-50 border-rose-100/50' : task.priority === 'Medium' ? 'text-amber-600 bg-amber-50 border-amber-100/50' : 'text-blue-600 bg-blue-50 border-blue-100/50'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${task.priority === 'High' ? 'bg-rose-500' : task.priority === 'Medium' ? 'bg-amber-500' : 'bg-blue-500'}`}></span>
                            {task.priority} Priority
                        </span>
                        {task.project && (
                            <span onClick={() => navigate(`/projects/${task.project._id}`)} className="text-[11px] font-bold text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100/80 px-2.5 py-1 rounded-[6px] transition-colors cursor-pointer border border-teal-100/50 flex items-center gap-1.5 shadow-sm">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                {task.project.name}
                            </span>
                        )}
                    </div>
                    <h1 className="text-[32px] font-heading font-extrabold text-slate-800 tracking-tight leading-tight">{task.title}</h1>
                </div>

                <div className="shrink-0 bg-white border border-slate-100 p-2.5 rounded-[22px] shadow-sm hover:shadow-md transition-all flex flex-col justify-center min-w-[210px] sm:min-w-[240px]">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-2">Task Status</label>
                    <div className="relative">
                        <button
                            disabled={!canUpdateStatus || updatingStatus}
                            onClick={e => { e.stopPropagation(); setIsStatusDropdownOpen(!isStatusDropdownOpen); }}
                            className={`w-full h-11 px-4 rounded-xl text-[12px] font-black uppercase tracking-widest transition-all flex items-center justify-between border cursor-pointer ${task.status === 'Done' ? 'bg-emerald-50/80 text-emerald-700 border-emerald-200/50 hover:bg-emerald-100/50' :
                                task.status === 'Review' ? 'bg-purple-50/80 text-purple-700 border-purple-200/50 hover:bg-purple-100/50' :
                                    task.status === 'In Progress' ? 'bg-indigo-50/80 text-indigo-700 border-indigo-200/50 hover:bg-indigo-100/50' :
                                        'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                }`}
                        >
                            <div className="flex items-center gap-2.5">
                                <span className={`w-2 h-2 rounded-full ${task.status === 'Done' ? 'bg-emerald-500' :
                                    task.status === 'Review' ? 'bg-purple-500' :
                                        task.status === 'In Progress' ? 'bg-indigo-500' :
                                            'bg-slate-400'
                                    } shadow-sm`}></span>
                                {task.status === 'Done' ? 'Completed' : task.status}
                            </div>
                            <svg className={`h-4 w-4 transition-transform duration-300 ${isStatusDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                        </button>

                        {isStatusDropdownOpen && (
                            <div className="absolute z-[100] top-full mt-2 w-full bg-white border border-slate-100 rounded-[22px] shadow-2xl p-2 animate-in fade-in slide-in-from-top-2 duration-300 border-slate-100 font-sans">
                                {allowedStatuses.map(s => (
                                    <button
                                        key={s}
                                        onClick={() => {
                                            handleUpdateStatus(s);
                                            setIsStatusDropdownOpen(false);
                                        }}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-all text-[12px] font-bold group ${task.status === s ? 'bg-slate-50/50' : ''}`}
                                    >
                                        <div className={`w-2.5 h-2.5 rounded-full ${s === 'Done' ? 'bg-emerald-500' :
                                            s === 'Review' ? 'bg-purple-500' :
                                                s === 'In Progress' ? 'bg-indigo-500' :
                                                    'bg-slate-400'
                                            }`} />
                                        <span className={`${task.status === s ? 'text-slate-900 border-b border-slate-200' : 'text-slate-600'}`}>
                                            {s === 'Done' ? 'Completed' : s}
                                        </span>
                                        {task.status === s && (
                                            <svg className="w-3.5 h-3.5 ml-auto text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}

                        {task && (
                            <div className="mt-2.5 pt-2.5 border-t border-slate-50 relative">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setShowReassignDropdown(!showReassignDropdown); }}
                                    className="w-full h-10 px-4 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-between border border-slate-100 bg-slate-50/50 hover:bg-slate-100 text-slate-500 hover:text-indigo-600 group"
                                >
                                    <div className="flex items-center gap-2">
                                        <svg className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m4-4l-4-4" /></svg>
                                        Reassign Task
                                    </div>
                                    <svg className={`h-3 w-3 transition-transform duration-300 ${showReassignDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                                </button>

                                {showReassignDropdown && (
                                    <div className="absolute z-[110] top-full mt-2 w-72 right-0 bg-white border border-slate-100 rounded-[22px] shadow-2xl p-4 animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1 mb-3">Reassign Reason</h4>
                                        <textarea
                                            value={reassignReason}
                                            onChange={(e) => setReassignReason(e.target.value)}
                                            placeholder="Why are you reassigning this task?"
                                            className="w-full p-3 text-[12px] border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 bg-slate-50 resize-none mb-4"
                                            rows={2}
                                        />

                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1 mb-2">Select New Assignee</h4>
                                        <div className="max-h-60 overflow-y-auto space-y-1 custom-scrollbar pr-1">
                                            {users.length > 0 ? (
                                                users
                                                    .filter(u => u._id !== (task.assignedTo?._id || task.assignedTo))
                                                    .map(u => (
                                                        <button
                                                            key={u._id}
                                                            onClick={() => handleReassign(u._id)}
                                                            disabled={reassigning}
                                                            className="w-full flex items-center gap-3 p-2.5 rounded-xl transition-all group/user text-left hover:bg-indigo-50/50"
                                                        >
                                                            <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 group-hover/user:bg-indigo-600 group-hover/user:text-white flex items-center justify-center text-[11px] font-black uppercase transition-colors shrink-0">
                                                                {u.fullName?.[0]}
                                                            </div>
                                                            <div className="overflow-hidden">
                                                                <div className="text-[13px] font-bold text-slate-700 truncate">{u.fullName}</div>
                                                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{u.role}</div>
                                                            </div>
                                                        </button>
                                                    ))
                                            ) : (
                                                <p className="text-[11px] text-slate-400 text-center py-4 italic font-medium">No users found</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

                {/* Left Column - Details & Description */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6 md:p-8">
                        <h2 className="text-[15px] font-heading font-bold text-slate-800 mb-5 border-b border-slate-100 pb-3">Description</h2>
                        <div className="prose prose-sm prose-slate max-w-none text-slate-600 leading-relaxed font-medium">
                            {task.description ? (
                                <p className="whitespace-pre-wrap">{task.description}</p>
                            ) : (
                                <p className="italic text-slate-400">No description provided for this task.</p>
                            )}
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-6">
                            <div>
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Assignee</h4>
                                <div className="flex items-center gap-2.5">
                                    <div className="w-[26px] h-[26px] rounded-full bg-slate-100 text-slate-600 font-extrabold flex items-center justify-center text-[10px] uppercase border border-slate-200 shadow-sm shrink-0 box-content">{task.assignedTo?.fullName?.charAt(0) || '?'}</div>
                                    <div className="flex flex-col">
                                        <span className="text-[13px] font-bold text-slate-700">{task.assignedTo?.fullName || 'Unassigned'}</span>
                                        {task.reassignmentHistory?.length > 0 && (
                                            <div className="mt-0.5 flex items-center gap-1">
                                                <span className="text-[8px] font-black text-amber-600 bg-amber-50 px-1 py-0.5 rounded uppercase tracking-tighter">Reassigned</span>
                                                <span className="text-[8px] font-bold text-slate-400 truncate max-w-[80px]">by {task.reassignmentHistory[task.reassignmentHistory.length - 1].reassignedBy?.fullName || 'System'}</span>
                                            </div>
                                        )}
                                        {task.reassignmentHistory?.length > 0 && (
                                            <p className="text-[10px] text-slate-500 italic mt-1 bg-slate-50/80 p-1.5 rounded border border-slate-100/50 line-clamp-1">
                                                "{task.reassignmentHistory[task.reassignmentHistory.length - 1].reason}"
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Created By</h4>
                                <div className="flex items-center gap-2.5 mt-1">
                                    <span className="text-[13px] font-bold text-slate-600">{task.createdBy?.fullName || 'System'}</span>
                                </div>
                            </div>
                            <div>
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Due Date</h4>
                                <span className="text-[12px] font-bold text-slate-700 bg-slate-50 border border-slate-200/60 px-2.5 py-1 rounded-[6px] mt-1 inline-block">
                                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'No date'}
                                </span>
                            </div>
                            <div>
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Created On</h4>
                                <span className="text-[13px] font-bold text-slate-500 mt-1 inline-block">
                                    {new Date(task.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Tabs / Content Section */}
                    <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm flex flex-col overflow-hidden">
                        <div className="px-7 pt-5 border-b border-slate-100 bg-slate-50/50">
                            <div className="flex items-center gap-8 mb-[-1px]">
                                <button
                                    onClick={() => setActiveTab('comments')}
                                    className={`pb-4 px-1 text-[13px] font-bold tracking-tight flex items-center gap-2 transition-all relative ${activeTab === 'comments' ? 'text-teal-600' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>
                                    Discussion
                                    {activeTab === 'comments' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-500 rounded-full"></div>}
                                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${activeTab === 'comments' ? 'bg-teal-100 text-teal-700' : 'bg-slate-200 text-slate-500'}`}>{task.comments?.length || 0}</span>
                                </button>
                                <button
                                    onClick={() => setActiveTab('daily-report')}
                                    className={`pb-4 px-1 text-[13px] font-bold tracking-tight flex items-center gap-2 transition-all relative ${activeTab === 'daily-report' ? 'text-teal-600' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" /></svg>
                                    Daily Progress
                                    {activeTab === 'daily-report' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-500 rounded-full"></div>}
                                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${activeTab === 'daily-report' ? 'bg-teal-100 text-teal-700' : 'bg-slate-200 text-slate-500'}`}>{reports.length || 0}</span>
                                </button>
                                <button
                                    onClick={() => setActiveTab('subtasks')}
                                    className={`pb-4 px-1 text-[13px] font-bold tracking-tight flex items-center gap-2 transition-all relative ${activeTab === 'subtasks' ? 'text-teal-600' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                                    Subtasks
                                    {activeTab === 'subtasks' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-500 rounded-full"></div>}
                                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${activeTab === 'subtasks' ? 'bg-teal-100 text-teal-700' : 'bg-slate-200 text-slate-500'}`}>{subtasks.length || 0}</span>
                                </button>
                                <button
                                    onClick={() => setActiveTab('history')}
                                    className={`pb-4 px-1 text-[13px] font-bold tracking-tight flex items-center gap-2 transition-all relative ${activeTab === 'history' ? 'text-teal-600' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    History
                                    {activeTab === 'history' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-500 rounded-full"></div>}
                                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${activeTab === 'history' ? 'bg-teal-100 text-teal-700' : 'bg-slate-200 text-slate-500'}`}>{task.reassignmentHistory?.length || 0}</span>
                                </button>
                            </div>
                        </div>

                        {activeTab === 'history' && (
                            <div className="p-7 overflow-y-auto max-h-[500px] flex-1 hide-scrollbar bg-slate-50/10">
                                {(!task.reassignmentHistory || task.reassignmentHistory.length === 0) ? (
                                    <div className="text-center py-12 bg-white/50 rounded-2xl border border-dashed border-slate-200">
                                        <p className="text-[14px] text-slate-400 font-medium">No reassignment history yet.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-6 relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-[1.5px] before:bg-slate-100">
                                        {[...task.reassignmentHistory].reverse().map((h, i) => (
                                            <div key={h._id || i} className="relative flex gap-6 pl-1.5">
                                                <div className="w-[30px] h-[30px] rounded-full bg-white border-2 border-slate-50 flex items-center justify-center shrink-0 z-10 text-teal-500 shadow-sm ring-4 ring-slate-50">
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m4-4l-4-4" /></svg>
                                                </div>
                                                <div className="flex-1 bg-white p-4.5 rounded-[20px] border border-slate-100 shadow-sm hover:border-teal-100 transition-colors">
                                                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-50">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[12px] font-black text-slate-800 uppercase tracking-tight">{h.reassignedBy?.fullName || 'Someone'}</span>
                                                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded-md">Reassigned</span>
                                                        </div>
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{new Date(h.timestamp || h.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                                                    </div>

                                                    <div className="flex flex-col gap-4">
                                                        <div className="flex items-center gap-4 bg-slate-50/50 p-3 rounded-xl border border-slate-100/50">
                                                            <div className="flex-1 text-center">
                                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Previous</div>
                                                                <div className="text-[13px] font-bold text-slate-600 bg-white py-2 rounded-lg border border-slate-100 truncate px-2">{h.previousAssignee?.fullName || 'Unassigned'}</div>
                                                            </div>
                                                            <div className="shrink-0 text-teal-400">
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                                            </div>
                                                            <div className="flex-1 text-center">
                                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">New Assignee</div>
                                                                <div className="text-[13px] font-black text-teal-600 bg-teal-50/50 py-2 rounded-lg border border-teal-100/50 truncate px-2">{h.newAssignee?.fullName || 'Unknown'}</div>
                                                            </div>
                                                        </div>

                                                        <div className="px-1 text-center sm:text-left">
                                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Reason for Change</div>
                                                            <div className="text-[13px] font-medium text-slate-600 italic bg-amber-50/30 p-4 rounded-xl border border-amber-100/30 leading-relaxed strike-none">
                                                                "{h.reason || 'No reason provided'}"
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'comments' ? (
                            <>
                                <div className="p-7 overflow-y-auto max-h-[450px] flex-1 hide-scrollbar">
                                    {(!task.comments || task.comments.length === 0) ? (
                                        <div className="text-center py-12 bg-slate-50/50 rounded-[16px] border border-dashed border-slate-200/60">
                                            <p className="text-[14px] text-slate-500 font-medium">No comments yet. Start the conversation!</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {task.comments.map(c => (
                                                <div key={c._id} className="flex gap-4">
                                                    <div className="w-[34px] h-[34px] rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 z-10 text-slate-600 font-extrabold text-[12px] uppercase shadow-sm">
                                                        {c.user?.fullName?.charAt(0) || '?'}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-baseline gap-2.5 mb-2">
                                                            <span className="font-bold text-slate-800 text-[14px]">{c.user?.fullName || 'User'}</span>
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                                                {new Date(c.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                                                            </span>
                                                        </div>
                                                        <div className="bg-slate-50/80 p-4.5 rounded-[16px] rounded-tl-sm border border-slate-100 text-[14px] text-slate-700 font-medium leading-relaxed">
                                                            {c.text}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="p-5 border-t border-slate-100 bg-white">
                                    <form onSubmit={handleAddComment} className="flex gap-3">
                                        <div className="w-[34px] h-[34px] rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0 z-10 text-teal-700 font-extrabold text-[12px] uppercase mt-1 hidden sm:flex shadow-sm">
                                            {user?.fullName?.charAt(0) || '?'}
                                        </div>
                                        <div className="flex-1 relative">
                                            <textarea
                                                value={commentText}
                                                onChange={e => setCommentText(e.target.value)}
                                                placeholder="Add a comment or update..."
                                                className="w-full h-[52px] min-h-[52px] max-h-[150px] p-3 pl-4 pr-24 border border-slate-200 rounded-[16px] text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all bg-slate-50 focus:bg-white resize-y shadow-sm"
                                                required
                                            />
                                            <button
                                                type="submit"
                                                disabled={!commentText.trim()}
                                                className="absolute right-2 top-2 bottom-2 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-5 rounded-xl font-bold text-[13px] transition-all shadow-sm focus:ring-4 focus:ring-teal-100"
                                            >
                                                Post
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </>
                        ) : activeTab === 'daily-report' ? (
                            <div className="flex flex-col flex-1 overflow-hidden min-h-[500px]">
                                <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-slate-100 flex-1 h-full">
                                    {/* Report Feed */}
                                    <div className="flex-1 p-7 overflow-y-auto max-h-[600px] hide-scrollbar scroll-smooth">
                                        <h3 className="text-[13px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                            Historical Logs
                                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                        </h3>
                                        {reports.length === 0 ? (
                                            <div className="text-center py-20 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200/60">
                                                <p className="text-slate-500 font-bold uppercase tracking-widest text-[11px] italic">No progress logs found yet.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-8">
                                                {reports.map((report, idx) => (
                                                    <div key={report._id} className="relative pl-8 before:absolute before:left-0 before:top-2 before:bottom-0 before:w-[2px] before:bg-slate-100 last:before:hidden">
                                                        <div className="absolute left-[-5px] top-2 w-[12px] h-[12px] rounded-full bg-white border-2 border-teal-500 shadow-sm z-10"></div>
                                                        <div className="bg-white border border-slate-100 rounded-[20px] p-5 shadow-sm hover:shadow-md hover:border-teal-100/60 transition-all">
                                                            {/* Log header */}
                                                            <div className="flex justify-between items-start mb-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center font-black text-[10px] text-teal-700">
                                                                        {report.employee?.fullName?.charAt(0)}
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-[13px] font-bold text-slate-800 leading-none">{report.employee?.fullName}</p>
                                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{new Date(report.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex flex-col items-end gap-1.5">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                                            <div className="h-full rounded-full" style={{ width: `${report.progressPercentage}%`, backgroundColor: report.progressPercentage === 100 ? '#10b981' : '#14b8a6' }} />
                                                                        </div>
                                                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${report.progressPercentage === 100 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-teal-50 text-teal-600 border-teal-100'}`}>
                                                                            {report.progressPercentage}%
                                                                        </span>
                                                                    </div>
                                                                    {report.isReviewed && (
                                                                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${report.isApproved ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                                                            {report.isApproved ? '✓ Approved' : '✗ Rejected'}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Smart conditional log fields */}
                                                            <div className="space-y-2.5">
                                                                {report.completedToday && (
                                                                    <div className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-100/60">
                                                                        <h4 className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                                                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                                                            {report.progressPercentage === 100 ? 'Completed Today' : 'Completed Today'}
                                                                        </h4>
                                                                        <p className="text-[12px] font-medium text-slate-700 leading-relaxed">{report.completedToday}</p>
                                                                    </div>
                                                                )}
                                                                {report.progressPercentage < 100 && report.pending && (
                                                                    <div className="bg-amber-50/40 rounded-xl p-3 border border-amber-100/60">
                                                                        <h4 className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                                                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                                            Pending Work
                                                                        </h4>
                                                                        <p className="text-[12px] font-medium text-slate-700 leading-relaxed">{report.pending}</p>
                                                                    </div>
                                                                )}
                                                                {report.blockers && (
                                                                    <div className="bg-rose-50/40 rounded-xl p-3 border border-rose-100/60">
                                                                        <h4 className="text-[9px] font-black text-rose-600 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                                                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                                                            Blocker
                                                                        </h4>
                                                                        <p className="text-[12px] font-bold text-rose-700 leading-relaxed">{report.blockers}</p>
                                                                    </div>
                                                                )}
                                                                {report.progressPercentage < 100 && report.expectedCompletion && (
                                                                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 px-1">
                                                                        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                                        Expected: <span className="text-slate-700 font-black">{new Date(report.expectedCompletion).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                                                    </div>
                                                                )}
                                                                {report.progressPercentage === 100 && report.pending && (
                                                                    <div className="bg-indigo-50/40 rounded-xl p-3 border border-indigo-100/60">
                                                                        <h4 className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                                                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                                            Final Notes
                                                                        </h4>
                                                                        <p className="text-[12px] font-medium text-slate-700 leading-relaxed">{report.pending}</p>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* ── Full Approval Panel ── */}
                                                            {(() => {
                                                                const rStatus = report.reportStatus || (report.isReviewed ? (report.isApproved ? 'approved' : 'rejected') : 'pending_review');
                                                                return (
                                                                    <div className="mt-4">
                                                                        {/* Approved */}
                                                                        {rStatus === 'approved' && (
                                                                            <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                                                                                <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0">
                                                                                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                                                                </div>
                                                                                <div className="flex-1">
                                                                                    <p className="text-[11px] font-black text-emerald-800">Approved</p>
                                                                                    {report.reviewedBy && <p className="text-[10px] text-emerald-600 font-medium">{report.reviewedBy?.fullName} &middot; {report.reviewedAt ? new Date(report.reviewedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</p>}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                        {/* Rejected */}
                                                                        {rStatus === 'rejected' && (
                                                                            <div className="flex flex-col gap-2 p-3 bg-rose-50 rounded-xl border border-rose-100">
                                                                                <div className="flex items-center gap-2">
                                                                                    <div className="w-7 h-7 rounded-lg bg-rose-500 flex items-center justify-center shrink-0">
                                                                                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                                                                    </div>
                                                                                    <p className="text-[11px] font-black text-rose-800">Rejected — Employee must resubmit</p>
                                                                                </div>
                                                                                {report.managerNote && <p className="text-[11px] font-medium text-rose-700 ml-9">Note: {report.managerNote}</p>}
                                                                            </div>
                                                                        )}
                                                                        {/* Pending Manager Review */}
                                                                        {rStatus === 'pending_review' && isManagerOrAdmin && (
                                                                            <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
                                                                                <div className="flex items-center gap-2 text-[10px] font-black text-amber-600 uppercase tracking-widest">
                                                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                                                                                    Awaiting your review
                                                                                </div>
                                                                                <textarea
                                                                                    placeholder="Optional: Add review note..."
                                                                                    className="w-full p-3 text-[12px] border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-100 bg-slate-50 resize-none"
                                                                                    id={`note-td-${report._id}`}
                                                                                />
                                                                                <div className="flex gap-2">
                                                                                    <button
                                                                                        onClick={() => handleReviewReport(report._id, true, document.getElementById(`note-td-${report._id}`).value)}
                                                                                        className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-bold text-[12px] transition-all"
                                                                                    >
                                                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                                                                        Approve
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => handleReviewReport(report._id, false, document.getElementById(`note-td-${report._id}`).value)}
                                                                                        className="flex-1 flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-xl font-bold text-[12px] transition-all"
                                                                                    >
                                                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                                                                        Reject
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                        {/* Pending for employee — awaiting review message */}
                                                                        {rStatus === 'pending_review' && !isManagerOrAdmin && (
                                                                            <div className="flex items-center gap-2 mt-3 px-1">
                                                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                                                                                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Awaiting Manager Review</p>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })()}

                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* ─── Smart Submission Form (Assignee only) ─── */}
                                    {isAssignee && (() => {
                                        const pct = reportData.progressPercentage;
                                        const isComplete = pct === 100;

                                        // ── Already submitted today — but allow resubmit if REJECTED ──
                                        if (todayReportExists) {
                                            // Find today's report to check its status
                                            const todayStr2 = new Date().toISOString().split('T')[0];
                                            const todayReport = reports.find(r => {
                                                const d = new Date(r.createdAt).toISOString().split('T')[0];
                                                return d === todayStr2 && (r.employee?._id === user?._id || r.employee === user?._id);
                                            });
                                            const todayStatus = todayReport?.reportStatus || (todayReport?.isReviewed ? (todayReport?.isApproved ? 'approved' : 'rejected') : 'pending_review');
                                            const isRejectedToday = todayStatus === 'rejected';

                                            if (!isRejectedToday) {
                                                // Normal lock — already submitted and not rejected
                                                const tomorrowDate = new Date();
                                                tomorrowDate.setDate(tomorrowDate.getDate() + 1);
                                                const tomorrowStr = tomorrowDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
                                                return (
                                                    <div className="w-full lg:w-[340px] bg-white p-6 border-t lg:border-t-0 flex flex-col items-center justify-center gap-5 text-center">
                                                        {/* Icon */}
                                                        <div className="w-16 h-16 rounded-[20px] bg-teal-50 border border-teal-100 flex items-center justify-center shadow-sm">
                                                            <svg className="w-8 h-8 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                        </div>

                                                        {/* Main message */}
                                                        <div>
                                                            <p className="text-[15px] font-black text-slate-800 mb-1">Report Submitted!</p>
                                                            <p className="text-[12px] font-medium text-slate-500 leading-relaxed">
                                                                You've already submitted your daily update for today.
                                                            </p>
                                                        </div>

                                                        {/* Next available time chip */}
                                                        <div className="bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 w-full">
                                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Next update available</p>
                                                            <div className="flex items-center justify-center gap-2">
                                                                <svg className="w-4 h-4 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                                <span className="text-[13px] font-black text-slate-700">{tomorrowStr}</span>
                                                            </div>
                                                        </div>

                                                        {/* Friendly tip */}
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                            Come back tomorrow to log your next update
                                                        </p>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div className="w-full lg:w-[340px] bg-white p-6 border-t lg:border-t-0 flex flex-col overflow-y-auto max-h-[620px] hide-scrollbar">
                                                    {/* Rejection banner */}
                                                    <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex gap-3 items-start">
                                                        <div className="w-7 h-7 rounded-lg bg-rose-500 flex items-center justify-center shrink-0 mt-0.5">
                                                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                                        </div>
                                                        <div>
                                                            <p className="text-[12px] font-black text-rose-800">Report Rejected</p>
                                                            <p className="text-[11px] font-medium text-rose-600 mt-0.5">Please resubmit your daily update.</p>
                                                            {todayReport?.managerNote && <p className="text-[11px] text-rose-700 font-bold mt-1 italic">"{todayReport.managerNote}"</p>}
                                                        </div>
                                                    </div>
                                                    {/* Header */}
                                                    <div className="mb-5 pb-4 border-b border-slate-100">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <h3 className="text-[13px] font-black text-slate-800 flex items-center gap-2">
                                                                <svg className="w-4 h-4 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" /></svg>
                                                                Submit Daily Update
                                                            </h3>
                                                            <span className="text-[9px] font-black text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded uppercase tracking-widest">{reportData.date}</span>
                                                        </div>
                                                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">Fields adapt based on your progress.</p>
                                                    </div>

                                                    <form onSubmit={handleSubmitReport} className="space-y-4">
                                                        {/* Progress bar display */}
                                                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                                                    Progress
                                                                </span>
                                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${isComplete ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-teal-50 text-teal-600 border-teal-100'}`}>{pct}% {isComplete ? '✓' : ''}</span>
                                                            </div>
                                                            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                                                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: isComplete ? '#10b981' : '#14b8a6' }} />
                                                            </div>
                                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">Auto-calculated from task status</p>
                                                        </div>

                                                        {/* Fields for IN-PROGRESS (pct < 100) */}
                                                        {!isComplete && (
                                                            <>
                                                                <div className="rounded-2xl border border-slate-100 p-4 bg-white hover:border-teal-100/80 transition-all">
                                                                    <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                                                                        <svg className="w-3 h-3 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h7" /></svg>
                                                                        Completed Today <span className="text-rose-400">*</span>
                                                                    </label>
                                                                    <textarea value={reportData.completedToday} onChange={e => setReportData({ ...reportData, completedToday: e.target.value })} placeholder="Summarize the work you completed today." className="w-full p-3 border border-slate-100 rounded-xl text-[13px] font-medium bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-300 transition-all min-h-[75px] resize-none" required />
                                                                </div>

                                                                <div className="rounded-2xl border border-amber-100/70 p-4 bg-amber-50/20 hover:border-amber-200 transition-all">
                                                                    <label className="flex items-center gap-1.5 text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2">
                                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                                        Pending Work <span className="text-rose-400">*</span>
                                                                    </label>
                                                                    <textarea value={reportData.pending} onChange={e => setReportData({ ...reportData, pending: e.target.value })} placeholder="What remains for tomorrow?" className="w-full p-3 border border-amber-100 rounded-xl text-[13px] font-medium bg-white focus:outline-none focus:ring-2 focus:ring-amber-100 focus:border-amber-200 transition-all min-h-[65px] resize-none" required />
                                                                </div>

                                                                <div className="rounded-2xl border border-rose-100/60 p-4 bg-rose-50/20 hover:border-rose-200 transition-all">
                                                                    <label className="flex items-center gap-1.5 text-[10px] font-black text-rose-500 uppercase tracking-widest mb-2">
                                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                                                        Blockers / Risks
                                                                        <span className="text-[8px] font-black text-slate-400 normal-case tracking-normal ml-auto">Optional</span>
                                                                    </label>
                                                                    <input value={reportData.blockers} onChange={e => setReportData({ ...reportData, blockers: e.target.value })} placeholder="e.g. Waiting on API, Missing designs, Approval pending" className="w-full px-3 h-10 border border-rose-100 rounded-xl text-[13px] font-medium bg-white focus:outline-none focus:ring-2 focus:ring-rose-100 focus:border-rose-200 transition-all" />
                                                                </div>

                                                                <div className="rounded-2xl border border-slate-100 p-4 bg-white hover:border-teal-100/80 transition-all">
                                                                    <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                                                                        <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                                        Expected Completion
                                                                    </label>
                                                                    <input type="date" value={reportData.expectedCompletion} min={new Date().toISOString().split('T')[0]} onChange={e => setReportData({ ...reportData, expectedCompletion: e.target.value })} className="w-full px-3 h-10 border border-slate-100 rounded-xl text-[13px] font-bold text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-300 transition-all cursor-pointer" />
                                                                </div>
                                                            </>
                                                        )}

                                                        {/* Fields for COMPLETED (pct = 100) */}
                                                        {isComplete && (
                                                            <>
                                                                <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                                                                    <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0 shadow-md shadow-emerald-200">
                                                                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-[13px] font-black text-emerald-800">Task Complete!</p>
                                                                        <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Describe the final outcome below.</p>
                                                                    </div>
                                                                </div>

                                                                <div className="rounded-2xl border border-emerald-100 p-4 bg-emerald-50/20 hover:border-emerald-200 transition-all">
                                                                    <label className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">
                                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                                                        Completed Today <span className="text-rose-400">*</span>
                                                                    </label>
                                                                    <textarea value={reportData.completedToday} onChange={e => setReportData({ ...reportData, completedToday: e.target.value })} placeholder="Describe the final work you completed." className="w-full p-3 border border-emerald-100 rounded-xl text-[13px] font-medium bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-200 transition-all min-h-[75px] resize-none" required />
                                                                </div>

                                                                <div className="rounded-2xl border border-indigo-100/60 p-4 bg-indigo-50/20 hover:border-indigo-200 transition-all">
                                                                    <label className="flex items-center gap-1.5 text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2">
                                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                                        Final Completion Notes
                                                                        <span className="text-[8px] font-black text-slate-400 normal-case tracking-normal ml-auto">Optional</span>
                                                                    </label>
                                                                    <textarea value={reportData.pending} onChange={e => setReportData({ ...reportData, pending: e.target.value })} placeholder="Describe the final outcome, handoff notes, or any last comments." className="w-full p-3 border border-indigo-100 rounded-xl text-[13px] font-medium bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-200 transition-all min-h-[65px] resize-none" />
                                                                </div>
                                                            </>
                                                        )}

                                                        {/* Submit */}
                                                        <button type="submit" disabled={isSubmittingReport} className={`w-full py-3.5 rounded-2xl font-black text-[13px] uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 ${isComplete ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200' : 'bg-slate-900 hover:bg-black text-white shadow-slate-900/10'} disabled:opacity-50`}>
                                                            {isSubmittingReport ? (
                                                                <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Submitting…</>
                                                            ) : isComplete ? (
                                                                <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg> Mark as Complete</>
                                                            ) : (
                                                                <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg> Post Daily Update</>
                                                            )}
                                                        </button>
                                                    </form>
                                                </div>
                                            );
                                        } // end if(todayReportExists)

                                        // Normal fresh form
                                        return (
                                            <div className="w-full lg:w-[340px] bg-white p-6 border-t lg:border-t-0 flex flex-col overflow-y-auto max-h-[620px] hide-scrollbar">
                                                {/* Header */}
                                                <div className="mb-5 pb-4 border-b border-slate-100">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <h3 className="text-[13px] font-black text-slate-800 flex items-center gap-2">
                                                            <svg className="w-4 h-4 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" /></svg>
                                                            Submit Daily Update
                                                        </h3>
                                                        <span className="text-[9px] font-black text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded uppercase tracking-widest">{reportData.date}</span>
                                                    </div>
                                                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">Fields adapt based on your progress.</p>
                                                </div>
                                                <form onSubmit={handleSubmitReport} className="space-y-4">
                                                    {/* Progress bar display */}
                                                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                                                Progress
                                                            </span>
                                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${isComplete ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-teal-50 text-teal-600 border-teal-100'}`}>{pct}% {isComplete ? '✓' : ''}</span>
                                                        </div>
                                                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: isComplete ? '#10b981' : '#14b8a6' }} />
                                                        </div>
                                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">Auto-calculated from task status</p>
                                                    </div>
                                                    {/* Fields for IN-PROGRESS */}
                                                    {!isComplete && (<>
                                                        <div className="rounded-2xl border border-slate-100 p-4 bg-white hover:border-teal-100/80 transition-all">
                                                            <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2"><svg className="w-3 h-3 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h7" /></svg>Completed Today <span className="text-rose-400">*</span></label>
                                                            <textarea value={reportData.completedToday} onChange={e => setReportData({ ...reportData, completedToday: e.target.value })} placeholder="Summarize the work you completed today." className="w-full p-3 border border-slate-100 rounded-xl text-[13px] font-medium bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-300 transition-all min-h-[75px] resize-none" required />
                                                        </div>
                                                        <div className="rounded-2xl border border-amber-100/70 p-4 bg-amber-50/20 hover:border-amber-200 transition-all">
                                                            <label className="flex items-center gap-1.5 text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Pending Work <span className="text-rose-400">*</span></label>
                                                            <textarea value={reportData.pending} onChange={e => setReportData({ ...reportData, pending: e.target.value })} placeholder="What remains for tomorrow?" className="w-full p-3 border border-amber-100 rounded-xl text-[13px] font-medium bg-white focus:outline-none focus:ring-2 focus:ring-amber-100 focus:border-amber-200 transition-all min-h-[65px] resize-none" required />
                                                        </div>
                                                        <div className="rounded-2xl border border-rose-100/60 p-4 bg-rose-50/20 hover:border-rose-200 transition-all">
                                                            <label className="flex items-center gap-1.5 text-[10px] font-black text-rose-500 uppercase tracking-widest mb-2"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>Blockers / Risks<span className="text-[8px] font-black text-slate-400 normal-case tracking-normal ml-auto">Optional</span></label>
                                                            <input value={reportData.blockers} onChange={e => setReportData({ ...reportData, blockers: e.target.value })} placeholder="e.g. Waiting on API, Missing designs, Approval pending" className="w-full px-3 h-10 border border-rose-100 rounded-xl text-[13px] font-medium bg-white focus:outline-none focus:ring-2 focus:ring-rose-100 focus:border-rose-200 transition-all" />
                                                        </div>
                                                        <div className="rounded-2xl border border-slate-100 p-4 bg-white hover:border-teal-100/80 transition-all">
                                                            <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2"><svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>Expected Completion</label>
                                                            <input type="date" value={reportData.expectedCompletion} min={new Date().toISOString().split('T')[0]} onChange={e => setReportData({ ...reportData, expectedCompletion: e.target.value })} className="w-full px-3 h-10 border border-slate-100 rounded-xl text-[13px] font-bold text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-300 transition-all cursor-pointer" />
                                                        </div>
                                                    </>)}
                                                    {/* Fields for COMPLETED */}
                                                    {isComplete && (<>
                                                        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                                                            <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0 shadow-md shadow-emerald-200"><svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg></div>
                                                            <div><p className="text-[13px] font-black text-emerald-800">Task Complete!</p><p className="text-[10px] text-emerald-600 font-medium mt-0.5">Describe the final outcome below.</p></div>
                                                        </div>
                                                        <div className="rounded-2xl border border-emerald-100 p-4 bg-emerald-50/20 hover:border-emerald-200 transition-all">
                                                            <label className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>Completed Today <span className="text-rose-400">*</span></label>
                                                            <textarea value={reportData.completedToday} onChange={e => setReportData({ ...reportData, completedToday: e.target.value })} placeholder="Describe the final work you completed." className="w-full p-3 border border-emerald-100 rounded-xl text-[13px] font-medium bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-200 transition-all min-h-[75px] resize-none" required />
                                                        </div>
                                                        <div className="rounded-2xl border border-indigo-100/60 p-4 bg-indigo-50/20 hover:border-indigo-200 transition-all">
                                                            <label className="flex items-center gap-1.5 text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>Final Completion Notes<span className="text-[8px] font-black text-slate-400 normal-case tracking-normal ml-auto">Optional</span></label>
                                                            <textarea value={reportData.pending} onChange={e => setReportData({ ...reportData, pending: e.target.value })} placeholder="Describe the final outcome, handoff notes, or any last comments." className="w-full p-3 border border-indigo-100 rounded-xl text-[13px] font-medium bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-200 transition-all min-h-[65px] resize-none" />
                                                        </div>
                                                    </>)}
                                                    <button type="submit" disabled={isSubmittingReport} className={`w-full py-3.5 rounded-2xl font-black text-[13px] uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 ${isComplete ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200' : 'bg-slate-900 hover:bg-black text-white shadow-slate-900/10'} disabled:opacity-50`}>
                                                        {isSubmittingReport ? (<><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Submitting…</>
                                                        ) : isComplete ? (<><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg> Mark as Complete</>
                                                        ) : (<><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg> Post Daily Update</>)}
                                                    </button>
                                                </form>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        ) : (
                            <div className="p-7 flex-1 flex flex-col gap-8 bg-slate-50/20 max-h-[700px] overflow-y-auto">
                                {/* ── Custom Workflow Stages ── */}
                                <div id="manage-stages-section" className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-[12px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16m-7 6h7" /></svg>
                                            Custom Workflow Stages
                                        </h3>
                                        {isAssignee && (
                                            <button
                                                onClick={() => setIsManagingStages(!isManagingStages)}
                                                className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border transition-all ${isManagingStages ? 'bg-teal-600 text-white border-teal-600 shadow-sm' : 'text-teal-600 bg-teal-50 border-teal-100 hover:bg-teal-100'}`}
                                            >
                                                {isManagingStages ? '✓ Done' : 'Manage Stages'}
                                            </button>
                                        )}
                                    </div>

                                    {/* Add-stage form — shown when managing */}
                                    {isManagingStages && isAssignee && (
                                        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex gap-3 items-center animate-in fade-in slide-in-from-top-2 duration-200">
                                            <input
                                                type="text"
                                                placeholder="Stage name (e.g. Testing, Review…)"
                                                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[12px] font-bold outline-none focus:border-teal-400 transition-all placeholder-slate-300"
                                                value={newStage.name}
                                                onChange={e => setNewStage({ ...newStage, name: e.target.value })}
                                                onKeyDown={e => e.key === 'Enter' && handleAddStage()}
                                            />
                                            <div className="relative flex items-center">
                                                <input
                                                    type="color"
                                                    className="w-10 h-10 p-1 bg-white border border-slate-200 rounded-xl cursor-pointer"
                                                    value={newStage.color}
                                                    onChange={e => setNewStage({ ...newStage, color: e.target.value })}
                                                />
                                            </div>
                                            <button
                                                onClick={handleAddStage}
                                                disabled={!newStage.name.trim()}
                                                className="bg-teal-600 text-white px-5 h-10 rounded-xl text-[11px] font-black uppercase tracking-widest shadow-sm hover:bg-teal-700 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                Add
                                            </button>
                                        </div>
                                    )}

                                    {/* Stage chips */}
                                    <div className="flex flex-wrap gap-2">
                                        {/* Locked project stages */}
                                        {(task?.project?.workflow || []).map((s, i) => (
                                            <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-100 bg-slate-50/80">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }}></div>
                                                <span className="text-[11px] font-bold text-slate-500">{s.name}</span>
                                                <svg className="w-3 h-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                            </div>
                                        ))}
                                        {/* Employee custom stages — draggable */}
                                        {customStages.map(stage => (
                                            <div
                                                key={stage._id}
                                                draggable={isAssignee}
                                                onDragStart={() => handleDragStartStage(stage._id)}
                                                onDragOver={e => e.preventDefault()}
                                                onDrop={() => {
                                                    const newStages = [...customStages];
                                                    const draggedIdx = newStages.findIndex(s => s._id === draggedStageId);
                                                    const targetIdx = newStages.findIndex(s => s._id === stage._id);
                                                    const [moved] = newStages.splice(draggedIdx, 1);
                                                    newStages.splice(targetIdx, 0, moved);
                                                    handleReorderStages(newStages);
                                                }}
                                                className={`group flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all hover:shadow-sm ${isAssignee ? 'cursor-move' : ''}`}
                                                style={{ borderColor: `${stage.color}30`, backgroundColor: `${stage.color}08` }}
                                            >
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }}></div>
                                                <span className="text-[11px] font-bold" style={{ color: stage.color }}>{stage.name}</span>
                                                {isAssignee && (
                                                    <button
                                                        onClick={() => handleDeleteStage(stage._id)}
                                                        className="text-slate-200 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all ml-0.5"
                                                    >
                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        {customStages.length === 0 && (task?.project?.workflow || []).length === 0 && (
                                            <span className="text-[11px] text-slate-300 font-bold italic">No stages yet. Use "Manage Stages" to add one.</span>
                                        )}
                                    </div>
                                </div>
                                {/* Subtasks List Section */}
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-[14px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 text-indigo-600">
                                            <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                                            Subtasks
                                        </h3>
                                        {isAssignee && (
                                            <button
                                                onClick={() => setIsAddingSubtask(!isAddingSubtask)}
                                                className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-2"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                                                Add Subtask
                                            </button>
                                        )}
                                    </div>

                                    {isAddingSubtask && isAssignee && (
                                        <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-xl space-y-5 animate-in fade-in zoom-in-95 duration-300">
                                            <input
                                                type="text"
                                                placeholder="What needs to be done?"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 text-[14px] font-bold outline-none focus:border-indigo-400 transition-all placeholder-slate-300"
                                                value={newSubtask.title}
                                                onChange={e => setNewSubtask({ ...newSubtask, title: e.target.value })}
                                            />
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                {/* Modern Custom Dropdown */}
                                                <div className="relative">
                                                    <button
                                                        type="button"
                                                        onClick={e => { e.stopPropagation(); setIsStageDropdownOpen(!isStageDropdownOpen); }}
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[12px] font-bold flex items-center justify-between hover:bg-slate-100/50 transition-all outline-none"
                                                    >
                                                        <div className="flex items-center gap-2 overflow-hidden">
                                                            {newSubtask.stage ? (
                                                                <>
                                                                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: newSubtask.stageColor }}></div>
                                                                    <span className="truncate">{newSubtask.stage}</span>
                                                                </>
                                                            ) : (
                                                                <span className="text-slate-400">Select Stage</span>
                                                            )}
                                                        </div>
                                                        <svg className={`w-4 h-4 transition-transform duration-300 ${isStageDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                                                    </button>

                                                    {isStageDropdownOpen && (
                                                        <div className="absolute z-[100] top-full mt-2 w-full bg-white border border-slate-100 rounded-[20px] shadow-2xl p-2.5 animate-in fade-in slide-in-from-top-2 duration-300 overflow-hidden">
                                                            <div className="max-h-[220px] overflow-y-auto custom-scrollbar space-y-1">
                                                                {/* Combined Project and Custom Stages */}
                                                                {[...(task?.project?.workflow || []).map(s => ({ ...s, sourceType: 'project' })), ...customStages.map(s => ({ ...s, sourceType: 'custom' }))].map((s, idx) => (
                                                                    <button
                                                                        key={s._id || s.id || idx}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setNewSubtask({
                                                                                ...newSubtask,
                                                                                stage: s.name,
                                                                                stageColor: s.color,
                                                                                stageType: s.sourceType,
                                                                                customStageRef: s.sourceType === 'custom' ? s._id : null
                                                                            });
                                                                            setIsStageDropdownOpen(false);
                                                                        }}
                                                                        className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl hover:bg-slate-50 text-[12px] font-bold group transition-all"
                                                                    >
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: s.color }}></div>
                                                                            <span className="text-slate-700">{s.name}</span>
                                                                        </div>
                                                                        {s.sourceType === 'project' && (
                                                                            <span className="text-[8px] font-black uppercase text-slate-300 bg-slate-50 px-1.5 py-0.5 rounded-md">Locked</span>
                                                                        )}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                            <div className="mt-2 pt-2 border-t border-slate-50">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setIsStageDropdownOpen(false);
                                                                        setIsManagingStages(true);
                                                                        setTimeout(() => {
                                                                            document.getElementById('manage-stages-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                                        }, 100);
                                                                    }}
                                                                    className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-black uppercase tracking-widest text-teal-600 hover:text-teal-700 transition-colors"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                                                                    Add New Stage
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Modern Custom Priority Dropdown */}
                                                <div className="relative">
                                                    <button
                                                        type="button"
                                                        onClick={e => { e.stopPropagation(); setIsPriorityDropdownOpen(!isPriorityDropdownOpen); }}
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[12px] font-bold flex items-center justify-between hover:bg-slate-100/50 transition-all outline-none"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <span className={`w-2 h-2 rounded-full ${newSubtask.priority === 'Urgent' ? 'bg-rose-500' :
                                                                newSubtask.priority === 'High' ? 'bg-orange-500' :
                                                                    newSubtask.priority === 'Medium' ? 'bg-indigo-500' : 'bg-slate-400'
                                                                }`} />
                                                            {newSubtask.priority} Priority
                                                        </div>
                                                        <svg className={`w-4 h-4 transition-transform duration-300 ${isPriorityDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                                                    </button>

                                                    {isPriorityDropdownOpen && (
                                                        <div className="absolute z-[100] top-full mt-2 w-full bg-white border border-slate-100 rounded-[20px] shadow-2xl p-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                                            {['Low', 'Medium', 'High', 'Urgent'].map(p => (
                                                                <button
                                                                    key={p}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setNewSubtask({ ...newSubtask, priority: p });
                                                                        setIsPriorityDropdownOpen(false);
                                                                    }}
                                                                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-slate-50 text-[12px] font-bold transition-all ${newSubtask.priority === p ? 'bg-slate-50 text-indigo-600' : 'text-slate-600'}`}
                                                                >
                                                                    <div className={`w-2.5 h-2.5 rounded-full ${p === 'Urgent' ? 'bg-rose-500' :
                                                                        p === 'High' ? 'bg-orange-500' :
                                                                            p === 'Medium' ? 'bg-indigo-500' : 'bg-slate-400'
                                                                        }`} />
                                                                    {p}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <input
                                                    type="date"
                                                    min={new Date().toISOString().split('T')[0]}
                                                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[12px] font-bold outline-none focus:border-indigo-400 cursor-pointer text-slate-500 transition-all"
                                                    value={newSubtask.dueDate}
                                                    onChange={e => setNewSubtask({ ...newSubtask, dueDate: e.target.value })}
                                                />
                                            </div>
                                            <div className="flex justify-end gap-3">
                                                <button
                                                    onClick={() => setIsAddingSubtask(false)}
                                                    className="px-5 py-2.5 text-[12px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={handleAddSubtask}
                                                    disabled={!newSubtask.title || !newSubtask.stage}
                                                    className="bg-indigo-600 text-white px-8 py-2.5 rounded-xl text-[12px] font-black uppercase tracking-widest shadow-md hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    Create Subtask
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-3">
                                        {subtasks.length === 0 && !isAddingSubtask && (
                                            <div className="text-center py-12 bg-white/50 rounded-2xl border border-dashed border-slate-200">
                                                <p className="text-[13px] font-bold text-slate-400">No subtasks found. Break down your work into manageable steps!</p>
                                            </div>
                                        )}
                                        {subtasks.map(sub => (
                                            <div
                                                key={sub._id}
                                                draggable={isAssignee}
                                                onDragStart={() => setDraggedSubtaskId(sub._id)}
                                                onDragOver={(e) => e.preventDefault()}
                                                onDrop={() => {
                                                    const newSubs = [...subtasks];
                                                    const draggedIdx = newSubs.findIndex(s => s._id === draggedSubtaskId);
                                                    const targetIdx = newSubs.findIndex(s => s._id === sub._id);
                                                    const [moved] = newSubs.splice(draggedIdx, 1);
                                                    newSubs.splice(targetIdx, 0, moved);
                                                    handleReorderSubtasks(newSubs);
                                                }}
                                                className={`group bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:border-indigo-200 transition-all flex items-center gap-4 ${isAssignee ? 'cursor-move' : ''}`}
                                            >
                                                <div className="flex-1 space-y-1">
                                                    <div className="flex items-center gap-3">
                                                        <h4 className="text-[14px] font-bold text-slate-800 tracking-tight">{sub.title}</h4>
                                                        {sub.stage && (
                                                            <span
                                                                className="px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all"
                                                                style={{
                                                                    backgroundColor: `${sub.stageColor || '#64748b'}10`,
                                                                    color: sub.stageColor || '#64748b',
                                                                    border: `1px solid ${sub.stageColor || '#64748b'}25`
                                                                }}
                                                            >
                                                                {sub.stage}
                                                            </span>
                                                        )}
                                                        <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${sub.priority === 'Urgent' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                                            sub.priority === 'High' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                                                                'bg-slate-50 text-slate-500 border border-slate-200/50'
                                                            }`}>
                                                            {sub.priority}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-5">
                                                    <div className="flex flex-col items-end gap-1">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progress</span>
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="range"
                                                                min="0" max="100"
                                                                className={`w-24 h-1.5 bg-slate-100 rounded-full appearance-none accent-teal-500 ${!isAssignee ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}
                                                                value={sub.progressPercentage}
                                                                onChange={e => isAssignee && handleUpdateSubtask(sub._id, { progressPercentage: e.target.value })}
                                                            />
                                                            <span className="text-[11px] font-black text-teal-600 min-w-[28px]">{sub.progressPercentage}%</span>
                                                        </div>
                                                    </div>

                                                    {isAssignee && (
                                                        <button
                                                            onClick={() => handleDeleteSubtask(sub._id)}
                                                            className="p-2 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all"
                                                        >
                                                            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column - Attributes & Activity */}
                <div className="space-y-6">
                    <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6 lg:p-7">
                        <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-5 border-b border-slate-100 pb-3">Quick Actions</h2>
                        <div className="flex flex-col gap-2">
                            <button className="flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl hover:bg-slate-50 transition-all text-[13px] font-bold text-slate-600 border border-transparent hover:border-slate-200 shadow-sm hover:shadow">
                                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                Attach Files
                            </button>
                            <button className="flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl hover:bg-slate-50 transition-all text-[13px] font-bold text-slate-600 border border-transparent hover:border-slate-200 shadow-sm hover:shadow" onClick={() => {
                                navigator.clipboard.writeText(window.location.href);
                                alert('Link copied to clipboard!');
                            }}>
                                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                Copy Task Link
                            </button>
                            {isManagerOrAdmin && (
                                <button
                                    onClick={handleDeleteTask}
                                    className="flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-all text-[13px] font-bold text-rose-500 border border-transparent mt-2"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    Delete Task
                                </button>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
