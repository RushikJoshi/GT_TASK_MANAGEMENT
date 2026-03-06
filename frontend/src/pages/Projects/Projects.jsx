import React, { useEffect, useState } from 'react';
import axios from 'axios';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const DEFAULT_WORKFLOW = [
    { id: 'todo', name: 'To Do', color: '#64748b', type: 'active' },
    { id: 'in_progress', name: 'In Progress', color: '#3b82f6', type: 'active' },
    { id: 'review', name: 'Review', color: '#f59e0b', type: 'active' },
    { id: 'completed', name: 'Completed', color: '#10b981', type: 'done' }
];

const PRESET_COLORS = ['#64748b', '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b', '#10b981', '#14b8a6', '#06b6d4'];

export default function Projects() {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    // ── Edit project state ────────────────────────────────────────────────
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingProject, setEditingProject] = useState(null);
    const [editForm, setEditForm] = useState({ name: '', description: '', deadline: '', status: '', members: [] });
    const [savingEdit, setSavingEdit] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        deadline: '',
        status: 'In Progress',
        members: [],
        workflow: JSON.parse(JSON.stringify(DEFAULT_WORKFLOW))
    });
    const [employees, setEmployees] = useState([]);
    const [isStatusOpen, setIsStatusOpen] = useState(false);
    const [draggedStageIdx, setDraggedStageIdx] = useState(null);
    const [activeDropdown, setActiveDropdown] = useState(null);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (isStatusOpen && !e.target.closest('.status-dropdown-container')) {
                setIsStatusOpen(false);
            }
            if (activeDropdown && !e.target.closest('.custom-dropdown-container')) {
                setActiveDropdown(null);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [isStatusOpen, activeDropdown]);

    useEffect(() => {
        if (showModal || showEditModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
    }, [showModal, showEditModal]);

    useEffect(() => {
        fetchProjects();
        fetchEmployees();
    }, [token]);

    const fetchProjects = async () => {
        try {
            const res = await axiosInstance.get('/projects');
            if (res.data.success) {
                setProjects(res.data.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchEmployees = async () => {
        try {
            const res = await axiosInstance.get('/users/employees');
            if (res.data.success) setEmployees(res.data.data);
        } catch (err) {
            console.error(err);
        }
    };

    // ── Edit project helpers ─────────────────────────────────────────────
    const openEditModal = (e, proj) => {
        e.stopPropagation(); // Don't navigate to project detail
        setEditingProject(proj);
        setEditForm({
            name: proj.name || '',
            description: proj.description || '',
            deadline: proj.deadline ? proj.deadline.slice(0, 10) : '',
            status: proj.status || 'In Progress',
            members: proj.members?.map(m => m._id || m) || []
        });
        setShowEditModal(true);
    };

    const handleUpdateProject = async (e) => {
        e.preventDefault();
        if (!editingProject) return;
        setSavingEdit(true);
        try {
            const res = await axiosInstance.put(
                `/projects/${editingProject._id}`,
                editForm
            );
            if (res.data.success) {
                setProjects(prev => prev.map(p => p._id === editingProject._id ? res.data.data : p));
                setShowEditModal(false);
                setEditingProject(null);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSavingEdit(false);
        }
    };

    const toggleEditMember = (id) => {
        setEditForm(prev => ({
            ...prev,
            members: prev.members.includes(id)
                ? prev.members.filter(m => m !== id)
                : [...prev.members, id]
        }));
    };

    const handleCreateProject = async (e) => {
        e.preventDefault();
        try {
            const res = await axiosInstance.post('/projects', formData);
            if (res.data.success) {
                setShowModal(false);
                setFormData({
                    name: '',
                    description: '',
                    deadline: '',
                    status: 'In Progress',
                    members: [],
                    workflow: JSON.parse(JSON.stringify(DEFAULT_WORKFLOW))
                });
                fetchProjects();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const toggleMember = (id) => {
        setFormData(prev => ({
            ...prev,
            members: prev.members.includes(id)
                ? prev.members.filter(m => m !== id)
                : [...prev.members, id]
        }));
    };

    // Workflow Handlers
    const addStage = () => {
        const newStage = {
            id: `custom_${Date.now()}`,
            name: 'New Stage',
            color: '#64748b',
            type: 'active'
        };
        setFormData(prev => ({
            ...prev,
            workflow: [...prev.workflow, newStage]
        }));
    };

    const updateStage = (index, updates) => {
        const newWorkflow = [...formData.workflow];
        newWorkflow[index] = { ...newWorkflow[index], ...updates };

        // If the renamed stage was the selected status, update status too
        let newStatus = formData.status;
        if (updates.name && formData.status === formData.workflow[index].name) {
            newStatus = updates.name;
        }

        setFormData(prev => ({
            ...prev,
            workflow: newWorkflow,
            status: newStatus
        }));
    };

    const deleteStage = (index) => {
        if (formData.workflow.length <= 1) return;
        const stageToDelete = formData.workflow[index];
        const newWorkflow = formData.workflow.filter((_, i) => i !== index);

        let newStatus = formData.status;
        if (formData.status === stageToDelete.name) {
            newStatus = newWorkflow[0].name;
        }

        setFormData(prev => ({
            ...prev,
            workflow: newWorkflow,
            status: newStatus
        }));
    };

    const onDragStart = (e, index) => {
        setDraggedStageIdx(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const onDragOver = (e, index) => {
        e.preventDefault();
        if (draggedStageIdx === null || draggedStageIdx === index) return;

        const newWorkflow = [...formData.workflow];
        const draggedStage = newWorkflow[draggedStageIdx];
        newWorkflow.splice(draggedStageIdx, 1);
        newWorkflow.splice(index, 0, draggedStage);

        setDraggedStageIdx(index);
        setFormData(prev => ({ ...prev, workflow: newWorkflow }));
    };

    return (
        <>
            <div className="max-w-7xl mx-auto pb-10 animate-fade-in font-sans">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
                    <div>
                        <h1 className="text-[26px] font-heading font-bold text-slate-800 tracking-tight">Projects</h1>
                        <p className="text-[14px] font-medium text-slate-500 mt-1">Manage and track your team's initiatives.</p>
                    </div>
                    <button onClick={() => setShowModal(true)} className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 focus:ring-4 focus:ring-teal-100 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                        Create Project
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-20 text-slate-500 font-medium">Loading projects...</div>
                ) : projects.length === 0 ? (
                    <div className="text-center py-24 bg-white rounded-[24px] border border-dashed border-slate-200">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                        </div>
                        <h3 className="text-lg font-heading font-bold text-slate-800">No projects yet</h3>
                        <p className="text-sm text-slate-500 mt-1 font-medium">Get started by creating your first project.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projects.map(proj => (
                            <div key={proj._id} onClick={() => navigate(`/projects/${proj._id}`)} className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6 hover:shadow-md hover:border-teal-200/50 hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col h-[230px] relative overflow-hidden">
                                {/* Decorative top gradient line */}
                                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-400 to-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-[17px] font-heading font-bold text-slate-800 group-hover:text-teal-600 transition-colors line-clamp-1 pr-3">{proj.name}</h3>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className={`px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider border ${proj.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/50' : proj.status === 'In Progress' ? 'bg-blue-50 text-blue-700 border-blue-200/50' : 'bg-amber-50 text-amber-700 border-amber-200/50'}`}>
                                            {proj.status}
                                        </span>
                                        {/* Edit button */}
                                        <button
                                            onClick={(e) => openEditModal(e, proj)}
                                            title="Edit Project"
                                            className="p-1.5 rounded-lg text-slate-300 hover:text-teal-600 hover:bg-teal-50 transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                        </button>
                                    </div>
                                </div>

                                <p className="text-[13px] text-slate-500 line-clamp-2 leading-relaxed flex-1 font-medium">{proj.description || 'No description provided.'}</p>

                                <div className="mt-4 pt-4 border-t border-slate-100/80 flex items-center justify-between">
                                    <div className="flex -space-x-2 relative z-10">
                                        {proj.members?.slice(0, 4).map((m, i) => (
                                            <div key={i} className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-slate-600 font-bold text-[11px] shadow-sm ring-1 ring-slate-200 group-hover:ring-teal-100 transition-all box-content" title={m.fullName}>
                                                {m.fullName?.charAt(0) || 'U'}
                                            </div>
                                        ))}
                                        {proj.members?.length > 4 && (
                                            <div className="w-8 h-8 rounded-full bg-slate-50 border-2 border-white flex items-center justify-center text-slate-500 font-bold text-[10px] shadow-sm ring-1 ring-slate-100 box-content">
                                                +{proj.members.length - 4}
                                            </div>
                                        )}
                                        {(!proj.members || proj.members.length === 0) && (
                                            <span className="text-xs font-semibold text-slate-400 px-1 py-1 bg-slate-50 rounded-md border border-slate-100">Unassigned</span>
                                        )}
                                    </div>
                                    <div className="text-right flex flex-col items-end">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                            Due Date
                                        </span>
                                        <span className="text-[13px] font-semibold text-slate-800">{proj.deadline ? new Date(proj.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Project Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
                    {/* Backdrop (Blur & Dim) */}
                    <div
                        className="fixed inset-0 bg-black/40 backdrop-blur-xl transition-opacity animate-in fade-in duration-300"
                        onClick={() => setShowModal(false)}
                    />

                    {/* Modal Window */}
                    <div
                        className="relative w-full max-w-[750px] bg-white rounded-[32px] shadow-[0_32px_64px_-15px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden max-h-[90vh] animate-in zoom-in duration-300 z-10"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header (Fixed) */}
                        <div className="px-10 py-7 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                            <div>
                                <h2 className="text-[22px] font-heading font-black text-slate-900 tracking-tight">Create Project</h2>
                                <p className="text-[12px] text-slate-400 font-bold uppercase tracking-[0.1em] mt-1.5 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></span>
                                    Enter details to get started
                                </p>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-slate-400 hover:text-rose-500 p-2.5 rounded-2xl hover:bg-rose-50 transition-all active:scale-90"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {/* Body (Scrollable) */}
                        <div className="p-10 overflow-y-auto flex-1 hide-scrollbar">
                            <form id="project-form" onSubmit={handleCreateProject} className="space-y-9">
                                <div>
                                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-[0.15em] mb-3">Project Name <span className="text-rose-500">*</span></label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full h-14 px-6 border border-slate-200 rounded-2xl text-[15px] font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all shadow-sm bg-white hover:border-teal-200"
                                        placeholder="e.g. Website Redesign"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-[0.15em] mb-3">Description</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full p-6 border border-slate-200 rounded-2xl text-[15px] font-medium text-slate-700 focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all shadow-sm min-h-[130px] bg-white hover:border-teal-200 leading-relaxed"
                                        placeholder="Briefly describe the project goals..."
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                    <div>
                                        <label className="block text-[11px] font-black text-slate-500 uppercase tracking-[0.15em] mb-3">Deadline <span className="text-rose-500">*</span></label>
                                        <input
                                            type="date"
                                            value={formData.deadline}
                                            onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                                            className="w-full h-14 px-6 border border-slate-200 rounded-2xl text-[15px] font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all shadow-sm bg-white hover:border-teal-200"
                                            required
                                        />
                                    </div>
                                    <div className="status-dropdown-container relative">
                                        <label className="block text-[11px] font-black text-slate-500 uppercase tracking-[0.15em] mb-3">Initial Status</label>
                                        <div
                                            onClick={() => setIsStatusOpen(!isStatusOpen)}
                                            className={`w-full h-14 px-6 border rounded-2xl text-[15px] font-bold text-slate-800 flex items-center justify-between cursor-pointer transition-all shadow-sm bg-white hover:border-teal-200 ${isStatusOpen ? 'ring-4 ring-teal-500/10 border-teal-500' : 'border-slate-200'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: formData.workflow.find(s => s.name === formData.status)?.color || '#94a3b8' }}></div>
                                                <span>{formData.status}</span>
                                            </div>
                                            <svg className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isStatusOpen ? 'rotate-180 text-teal-500' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>

                                        {isStatusOpen && (
                                            <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 py-2.5 z-[100] animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200">
                                                {formData.workflow.map((stage) => (
                                                    <div
                                                        key={stage.id}
                                                        onClick={() => {
                                                            setFormData({ ...formData, status: stage.name });
                                                            setIsStatusOpen(false);
                                                        }}
                                                        className={`px-5 py-3.5 mx-2 rounded-xl text-[14px] font-bold transition-all cursor-pointer flex items-center justify-between group ${formData.status === stage.name ? 'bg-teal-50 text-teal-600' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-semibold'}`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }}></div>
                                                            {stage.name}
                                                        </div>
                                                        {formData.status === stage.name && (
                                                            <div className="w-2 h-2 rounded-full bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.5)]"></div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Custom Workflow Builder */}
                                <div className="pt-2">
                                    <div className="flex justify-between items-end mb-6">
                                        <label className="block text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">Status Workflow</label>
                                        <span className="text-[10px] font-black text-teal-600 bg-teal-50 px-2 py-1 rounded-lg uppercase tracking-widest leading-none">Customizable</span>
                                    </div>

                                    <div className="space-y-3">
                                        {formData.workflow.map((stage, idx) => (
                                            <div
                                                key={stage.id}
                                                draggable
                                                onDragStart={(e) => onDragStart(e, idx)}
                                                onDragOver={(e) => onDragOver(e, idx)}
                                                className={`group flex items-center gap-4 bg-white border border-slate-200 p-4 rounded-[20px] transition-all hover:border-teal-200 active:scale-[0.98] active:bg-slate-50 ${draggedStageIdx === idx ? 'opacity-50 border-teal-500 border-dashed border-2' : ''}`}
                                            >
                                                <div className="cursor-grab active:cursor-grabbing text-slate-300 group-hover:text-slate-400">
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 8h16M4 16h16" /></svg>
                                                </div>

                                                <div className="relative custom-dropdown-container">
                                                    <button
                                                        type="button"
                                                        onClick={() => setActiveDropdown(activeDropdown === `color_${stage.id}` ? null : `color_${stage.id}`)}
                                                        className="w-5 h-5 rounded-full shadow-inner border border-white"
                                                        style={{ backgroundColor: stage.color }}
                                                    />
                                                    {activeDropdown === `color_${stage.id}` && (
                                                        <div className="absolute top-8 left-0 z-[101] bg-white p-3 rounded-2xl shadow-2xl border border-slate-100 grid grid-cols-3 gap-2 w-36 animate-in zoom-in duration-200">
                                                            {PRESET_COLORS.map(color => (
                                                                <button
                                                                    key={color}
                                                                    type="button"
                                                                    onClick={() => { updateStage(idx, { color }); setActiveDropdown(null); }}
                                                                    className={`w-7 h-7 rounded-lg transition-transform hover:scale-110 ${stage.color === color ? 'ring-2 ring-offset-2 ring-teal-500' : ''}`}
                                                                    style={{ backgroundColor: color }}
                                                                />
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                <input
                                                    type="text"
                                                    value={stage.name}
                                                    onChange={(e) => updateStage(idx, { name: e.target.value })}
                                                    className="flex-1 bg-transparent border-none focus:ring-0 text-[14px] font-bold text-slate-800 placeholder:text-slate-300 placeholder:font-medium"
                                                    placeholder="Stage Name"
                                                />

                                                <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        type="button"
                                                        onClick={() => updateStage(idx, { type: stage.type === 'done' ? 'active' : 'done' })}
                                                        title={stage.type === 'done' ? "Final/Completed Stage" : "Active Stage"}
                                                        className={`p-1.5 rounded-lg transition-all ${stage.type === 'done' ? 'text-teal-600 bg-teal-50 ring-1 ring-teal-200' : 'text-slate-400 hover:bg-slate-100'}`}
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => deleteStage(idx)}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={addStage}
                                        className="w-full mt-4 py-4 border-2 border-dashed border-slate-100 rounded-[20px] text-slate-400 font-bold text-[13px] hover:border-teal-200 hover:bg-teal-50/30 hover:text-teal-600 transition-all flex items-center justify-center gap-2 group"
                                    >
                                        <svg className="w-4 h-4 transition-transform group-hover:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                                        Add New Stage
                                    </button>
                                </div>

                                <div>
                                    <div className="flex justify-between items-end mb-4">
                                        <label className="block text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">Assign Team Members</label>
                                        <span className="text-[10px] font-black text-teal-600 bg-teal-50 px-2.5 py-1 rounded-lg uppercase tracking-wider">{formData.members.length} Selected</span>
                                    </div>
                                    <div className="bg-slate-50 rounded-[24px] p-6 border border-slate-200/50 max-h-[250px] overflow-y-auto hide-scrollbar space-y-3">
                                        {employees.length === 0 ? (
                                            <div className="text-center py-10 bg-white/50 rounded-2xl border border-dashed border-slate-200">
                                                <p className="text-[13px] text-slate-400 font-bold uppercase tracking-widest">No available personnel</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {employees.map(emp => (
                                                    <label key={emp._id} className={`group flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-300 cursor-pointer ${formData.members.includes(emp._id) ? 'bg-white border-teal-500 shadow-lg shadow-teal-500/5' : 'bg-white/40 border-transparent hover:border-slate-200'}`}>
                                                        <div className="relative">
                                                            <input
                                                                type="checkbox"
                                                                className="w-5 h-5 text-teal-600 border-slate-300 rounded-lg focus:ring-0 focus:ring-offset-0 cursor-pointer accent-teal-600"
                                                                checked={formData.members.includes(emp._id)}
                                                                onChange={() => toggleMember(emp._id)}
                                                            />
                                                        </div>
                                                        <div className="flex items-center gap-3.5">
                                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[13px] font-black tracking-tighter shrink-0 transition-all duration-300 ${formData.members.includes(emp._id) ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/20' : 'bg-slate-100 text-slate-500 group-hover:bg-teal-50 group-hover:text-teal-600'}`}>
                                                                {emp.fullName?.charAt(0)}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-[14px] font-bold text-slate-800 leading-none">{emp.fullName}</span>
                                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">{emp.role || 'Team Member'}</span>
                                                            </div>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </form>
                        </div>

                        {/* Footer (Fixed) */}
                        <div className="px-10 py-7 border-t border-slate-100 bg-white flex justify-end gap-5 shrink-0 rounded-b-[32px]">
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="px-8 py-3.5 rounded-2xl font-black text-[13px] text-slate-500 hover:bg-slate-50 transition-all uppercase tracking-widest active:scale-95"
                            >
                                Discard
                            </button>
                            <button
                                type="submit"
                                form="project-form"
                                className="bg-slate-900 hover:bg-black text-white px-10 py-3.5 rounded-2xl font-black text-[13px] transition-all duration-300 shadow-2xl shadow-slate-900/20 hover:shadow-slate-900/40 active:scale-[0.97] uppercase tracking-widest"
                            >
                                Launch Project
                            </button>
                        </div>
                    </div >
                </div >
            )
            }
            {/* ─── Edit Project Modal ─────────────────────────────────────── */}
            {showEditModal && editingProject && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-xl animate-in fade-in duration-300" onClick={() => setShowEditModal(false)} />

                    <div className="relative w-full max-w-[680px] bg-white rounded-[32px] shadow-[0_32px_64px_-15px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden max-h-[92vh] animate-in zoom-in duration-300 z-10" onClick={e => e.stopPropagation()}>

                        {/* Header */}
                        <div className="px-9 py-7 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                            <div>
                                <h2 className="text-[20px] font-heading font-black text-slate-900 tracking-tight">Edit Project</h2>
                                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.12em] mt-1.5 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></span>
                                    {editingProject.name}
                                </p>
                            </div>
                            <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-rose-500 p-2.5 rounded-2xl hover:bg-rose-50 transition-all active:scale-90">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-9 overflow-y-auto flex-1 hide-scrollbar space-y-7">
                            <form id="edit-project-form" onSubmit={handleUpdateProject}>
                                {/* Project Name */}
                                <div className="mb-6">
                                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-[0.15em] mb-3">Project Name <span className="text-rose-500">*</span></label>
                                    <input
                                        type="text"
                                        value={editForm.name}
                                        onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                                        className="w-full h-13 px-5 border border-slate-200 rounded-2xl text-[15px] font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all shadow-sm bg-white hover:border-teal-200"
                                        placeholder="Project name"
                                        required
                                    />
                                </div>

                                {/* Description */}
                                <div className="mb-6">
                                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-[0.15em] mb-3">Description</label>
                                    <textarea
                                        value={editForm.description}
                                        onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
                                        className="w-full p-5 border border-slate-200 rounded-2xl text-[14px] font-medium text-slate-700 focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all shadow-sm min-h-[100px] bg-white hover:border-teal-200 leading-relaxed"
                                        placeholder="Project description…"
                                    />
                                </div>

                                {/* Deadline + Status */}
                                <div className="grid grid-cols-2 gap-5 mb-6">
                                    <div>
                                        <label className="block text-[11px] font-black text-slate-500 uppercase tracking-[0.15em] mb-3">Deadline</label>
                                        <input
                                            type="date"
                                            value={editForm.deadline}
                                            onChange={e => setEditForm(p => ({ ...p, deadline: e.target.value }))}
                                            className="w-full h-12 px-5 border border-slate-200 rounded-2xl text-[14px] font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all shadow-sm bg-white hover:border-teal-200"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-black text-slate-500 uppercase tracking-[0.15em] mb-3">Status</label>
                                        <select
                                            value={editForm.status}
                                            onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}
                                            className="w-full h-12 px-5 border border-slate-200 rounded-2xl text-[14px] font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all shadow-sm bg-white hover:border-teal-200 appearance-none cursor-pointer"
                                        >
                                            {['To Do', 'In Progress', 'Review', 'Completed', 'On Hold'].map(s => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Team Members */}
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <label className="block text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">Team Members</label>
                                        <span className="text-[10px] font-black text-teal-600 bg-teal-50 px-2.5 py-1 rounded-lg uppercase tracking-wider border border-teal-100">
                                            {editForm.members.length} selected
                                        </span>
                                    </div>
                                    <div className="bg-slate-50 rounded-[22px] p-5 border border-slate-200/50 max-h-[260px] overflow-y-auto hide-scrollbar">
                                        {employees.length === 0 ? (
                                            <p className="text-center py-8 text-[13px] text-slate-400 font-bold uppercase tracking-widest">No employees found</p>
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {employees.map(emp => {
                                                    const selected = editForm.members.includes(emp._id);
                                                    return (
                                                        <label key={emp._id}
                                                            className={`flex items-center gap-3.5 p-3.5 rounded-2xl border-2 transition-all duration-200 cursor-pointer ${selected ? 'bg-white border-teal-400 shadow-md shadow-teal-50' : 'bg-white/50 border-transparent hover:border-slate-200'
                                                                }`}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                className="w-4.5 h-4.5 text-teal-600 border-slate-300 rounded-lg focus:ring-0 cursor-pointer accent-teal-600"
                                                                checked={selected}
                                                                onChange={() => toggleEditMember(emp._id)}
                                                            />
                                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-[12px] font-black shrink-0 transition-all ${selected ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/20' : 'bg-slate-100 text-slate-500'
                                                                }`}>
                                                                {emp.fullName?.charAt(0)}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-[13px] font-bold text-slate-800 leading-tight truncate">{emp.fullName}</p>
                                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{emp.role || 'Employee'}</p>
                                                            </div>
                                                            {selected && (
                                                                <svg className="w-4 h-4 text-teal-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                                            )}
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </form>
                        </div>

                        {/* Footer */}
                        <div className="px-9 py-6 border-t border-slate-100 bg-white flex justify-end gap-4 shrink-0 rounded-b-[32px]">
                            <button
                                type="button"
                                onClick={() => setShowEditModal(false)}
                                className="px-7 py-3 rounded-2xl font-black text-[12px] text-slate-500 hover:bg-slate-50 transition-all uppercase tracking-widest"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="edit-project-form"
                                disabled={savingEdit}
                                className="bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white px-9 py-3 rounded-2xl font-black text-[12px] transition-all duration-300 shadow-xl shadow-teal-500/20 active:scale-[0.97] uppercase tracking-widest flex items-center gap-2"
                            >
                                {savingEdit ? (
                                    <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Saving…</>
                                ) : (
                                    <>Save Changes</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
