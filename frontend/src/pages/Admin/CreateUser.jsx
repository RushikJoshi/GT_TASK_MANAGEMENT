import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import Input from '../../components/UI/Input';
import Button from '../../components/UI/Button';

export default function CreateUser() {
    const { token } = useAuth();
    const navigate = useNavigate();

    // Selectable Managers List
    const [managers, setManagers] = useState([]);
    const [loadingManagers, setLoadingManagers] = useState(false);

    // Skills Options
    const availableSkills = ["Frontend", "Backend", "UI/UX", "QA", "DevOps", "Project Management"];

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        employeeId: '',
        role: 'employee',
        department: '',
        jobTitle: '',
        status: 'ACTIVE',
        joiningDate: new Date().toISOString().split('T')[0],
        location: '',
        employmentType: 'Full-time',
        reportingManager: '',
        skills: [],
        password: ''
    });

    const [message, setMessage] = useState({ text: '', type: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchManagers = async () => {
            setLoadingManagers(true);
            try {
                const res = await axiosInstance.get('/admin/managers');
                if (res.data.success) {
                    setManagers(res.data.data);
                }
            } catch (err) {
                console.error("Failed to fetch managers", err);
                // If 403, perhaps redirect or show message
                if (err.response?.status === 403) {
                    setMessage({ text: 'You do not have permission to access this page.', type: 'error' });
                }
            } finally {
                setLoadingManagers(false);
            }
        };
        fetchManagers();
    }, [token]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSkillToggle = (skill) => {
        setFormData(prev => {
            const hasSkill = prev.skills.includes(skill);
            return {
                ...prev,
                skills: hasSkill ? prev.skills.filter(s => s !== skill) : [...prev.skills, skill]
            };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ text: '', type: '' });
        setIsSubmitting(true);
        try {
            const res = await axiosInstance.post('/admin/create-user', formData);
            const data = res.data;

            if (data.success) {
                setMessage({ text: 'User successfully created!', type: 'success' });
                setTimeout(() => navigate('/admin/users'), 1500);
            } else {
                setMessage({ text: data.message || 'Error creating user', type: 'error' });
            }
        } catch (error) {
            setMessage({ text: 'Server error encountered while creating user.', type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="w-full max-w-5xl mx-auto pb-12">

            <div className="mb-6">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-4"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Back to Users List
                </button>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Create New User</h1>
                <p className="text-sm text-gray-500 mt-1">Fill out the details below to add a new employee or manager to the system.</p>
            </div>

            {message.text && (
                <div className={`p-4 mb-6 rounded-xl text-sm font-medium border ${message.type === 'success' ? 'bg-green-50 text-green-700 border-green-100 shadow-[0_4px_12px_rgba(34,197,94,0.08)]' : 'bg-red-50 text-red-600 border-red-100 shadow-[0_4px_12px_rgba(239,68,68,0.08)]'}`}>
                    <div className="flex items-center">
                        {message.type === 'success' ? (
                            <svg className="w-5 h-5 mr-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        ) : (
                            <svg className="w-5 h-5 mr-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        )}
                        {message.text}
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-8">

                {/* Section 1: Basic Details */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] p-6 md:p-8">
                    <h3 className="text-lg font-bold text-gray-900 mb-6 pb-4 border-b border-gray-50 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center text-xs">1</span>
                        Basic Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Full Name <span className="text-rose-500">*</span></label>
                            <Input name="fullName" value={formData.fullName} onChange={handleChange} placeholder="John Doe" required />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Email Address <span className="text-rose-500">*</span></label>
                            <Input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="john.doe@company.com" required />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Phone</label>
                            <Input type="text" name="phone" value={formData.phone} onChange={handleChange} placeholder="+1 (555) 000-0000" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Employee ID</label>
                            <Input type="text" name="employeeId" value={formData.employeeId} onChange={handleChange} placeholder="Leave empty to auto-generate" />
                            <p className="text-[11px] text-gray-400 mt-1.5 leading-tight">If left blank, system will auto-assign universally unique ID sequentially.</p>
                        </div>
                    </div>
                </div>

                {/* Section 2: Job Information */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] p-6 md:p-8">
                    <h3 className="text-lg font-bold text-gray-900 mb-6 pb-4 border-b border-gray-50 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs">2</span>
                        Job Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Role <span className="text-rose-500">*</span></label>
                            <select name="role" value={formData.role} onChange={handleChange} className="w-full h-[42px] px-4 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all bg-gray-50/50 hover:bg-white cursor-pointer" required>
                                <option value="employee">Employee</option>
                                <option value="manager">Manager</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Status</label>
                            <select name="status" value={formData.status} onChange={handleChange} className="w-full h-[42px] px-4 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all bg-gray-50/50 hover:bg-white cursor-pointer">
                                <option value="Active">Active</option>
                                <option value="On Leave">On Leave</option>
                                <option value="Disabled">Disabled</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Department</label>
                            <Input name="department" value={formData.department} onChange={handleChange} placeholder="E.g. Engineering" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Job Title</label>
                            <Input name="jobTitle" value={formData.jobTitle} onChange={handleChange} placeholder="E.g. Full Stack Developer" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Location / Branch</label>
                            <Input name="location" value={formData.location} onChange={handleChange} placeholder="E.g. New York Office" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Employment Type</label>
                            <select name="employmentType" value={formData.employmentType} onChange={handleChange} className="w-full h-[42px] px-4 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all bg-gray-50/50 hover:bg-white cursor-pointer">
                                <option value="Full-time">Full-time</option>
                                <option value="Part-time">Part-time</option>
                                <option value="Contract">Contract</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Joining Date</label>
                            <Input type="date" name="joiningDate" value={formData.joiningDate} onChange={handleChange} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Reporting Manager</label>
                            <select name="reportingManager" value={formData.reportingManager} onChange={handleChange} className="w-full h-[42px] px-4 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all bg-gray-50/50 hover:bg-white cursor-pointer" disabled={loadingManagers}>
                                <option value="">Select Manager</option>
                                {managers.map(mgr => (
                                    <option key={mgr._id} value={mgr._id}>{mgr.fullName} ({mgr.email})</option>
                                ))}
                            </select>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Skills</label>
                            <div className="flex flex-wrap gap-2">
                                {availableSkills.map((skill, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => handleSkillToggle(skill)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors border ${formData.skills.includes(skill) ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                                    >
                                        {skill}
                                        {formData.skills.includes(skill) && (
                                            <span className="ml-1.5 opacity-75">×</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 3: Account Information */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] p-6 md:p-8">
                    <h3 className="text-lg font-bold text-gray-900 mb-6 pb-4 border-b border-gray-50 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center text-xs">3</span>
                        Account Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Temporary Password <span className="text-rose-500">*</span></label>
                            <Input type="text" name="password" value={formData.password} onChange={handleChange} placeholder="Generate a secure password" required />
                            <p className="text-[11px] text-gray-400 mt-1.5 leading-tight">This user will use this password for their first login. They can change it in settings.</p>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-4 border-t border-gray-100 pt-6">
                    <Button type="button" variant="outline" onClick={() => navigate(-1)} className="px-6">Cancel</Button>
                    <Button type="submit" variant="primary" disabled={isSubmitting} className="shadow-md px-8 disabled:opacity-75 disabled:cursor-not-allowed">
                        {isSubmitting ? 'Creating...' : 'Create User'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
