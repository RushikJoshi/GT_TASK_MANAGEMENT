import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import Input from '../../components/UI/Input';
import Button from '../../components/UI/Button';
import * as XLSX from 'xlsx';

export default function CreateUser() {
    const { token } = useAuth();
    const navigate = useNavigate();

    const [createMode, setCreateMode] = useState('single'); // 'single' or 'bulk'

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

    // Bulk Upload Logic
    const [bulkFile, setBulkFile] = useState(null);
    const [bulkResults, setBulkResults] = useState(null);
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setBulkFile(file);
        setBulkResults(null);
        setMessage({ text: '', type: '' });
    };

    const handleBulkUpload = async () => {
        if (!bulkFile) {
            setMessage({ text: 'Please select an Excel file first.', type: 'error' });
            return;
        }

        setIsSubmitting(true);
        setMessage({ text: '', type: '' });

        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const json = XLSX.utils.sheet_to_json(worksheet);

                    if (json.length === 0) {
                        setMessage({ text: 'The selected Excel file is empty.', type: 'error' });
                        setIsSubmitting(false);
                        return;
                    }

                    const res = await axiosInstance.post('/admin/bulk-create-users', { users: json });

                    if (res.data.success) {
                        setBulkResults(res.data.data);
                        if (res.data.data.failed === 0) {
                            setMessage({ text: res.data.message || 'All users created successfully!', type: 'success' });
                            setTimeout(() => navigate('/admin/users'), 2500);
                        } else {
                            setMessage({ text: res.data.message || 'Bulk upload completed with some errors.', type: 'error' });
                        }
                    } else {
                        setMessage({ text: res.data.message || 'Error processing bulk upload', type: 'error' });
                    }
                } catch (err) {
                    setMessage({ text: err.response?.data?.message || 'Error parsing or uploading file.', type: 'error' });
                } finally {
                    setIsSubmitting(false);
                }
            };
            reader.onerror = () => {
                setMessage({ text: 'Error reading file.', type: 'error' });
                setIsSubmitting(false);
            };
            reader.readAsArrayBuffer(bulkFile);
        } catch (err) {
            setMessage({ text: 'Unexpected error occurred.', type: 'error' });
            setIsSubmitting(false);
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    const downloadTemplate = () => {
        const ws = XLSX.utils.json_to_sheet([{
            fullName: "Jane Doe",
            email: "jane@company.com",
            password: "Password@123",
            role: "employee",
            department: "Engineering",
            jobTitle: "Software Engineer",
            phone: "1234567890",
            location: "New York",
            employmentType: "Full-time",
            skills: "React, Node.js",
            joiningDate: "2024-01-01"
        }]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Employees Template");
        XLSX.writeFile(wb, "bulk_upload_template.xlsx");
    };

    return (
        <div className="w-full max-w-[1600px] mx-auto pb-12 px-4 sm:px-6 lg:px-8">

            <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-4"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Back to Users List
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Create New User</h1>
                    <p className="text-sm text-gray-500 mt-1">Add a single employee manually, or upload securely using an Excel file.</p>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-xl shadow-inner w-max">
                    <button
                        onClick={() => { setCreateMode('single'); setMessage({ text: '', type: '' }); }}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${createMode === 'single' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Single Entry
                    </button>
                    <button
                        onClick={() => { setCreateMode('bulk'); setMessage({ text: '', type: '' }); }}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${createMode === 'bulk' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        Bulk Upload
                    </button>
                </div>
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

            {createMode === 'single' ? (
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                        {/* LEFT COLUMN: Basic Details & Account Info */}
                        <div className="xl:col-span-5 flex flex-col gap-8">
                            {/* Section 1: Basic Details */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] p-6 md:p-8">
                                <h3 className="text-lg font-bold text-gray-900 mb-6 pb-4 border-b border-gray-50 flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center text-xs">1</span>
                                    Basic Details
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-6">
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
                                        <Input type="text" name="employeeId" value={formData.employeeId} onChange={handleChange} placeholder="Leave empty" />
                                        <p className="text-[11px] text-gray-400 mt-1.5 leading-tight">System auto-assigns sequentially.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Account Information */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] p-6 md:p-8 flex-1">
                                <h3 className="text-lg font-bold text-gray-900 mb-6 pb-4 border-b border-gray-50 flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center text-xs">3</span>
                                    Account Credentials
                                </h3>
                                <div className="grid grid-cols-1 gap-x-6 gap-y-6">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Temporary Password <span className="text-rose-500">*</span></label>
                                        <Input type="text" name="password" value={formData.password} onChange={handleChange} placeholder="Generate a secure password" required />
                                        <p className="text-[11px] text-gray-400 mt-1.5 leading-tight">This user will use this password for their first login. They can change it in settings later.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Job Information */}
                        <div className="xl:col-span-7 flex flex-col gap-8">
                            {/* Section 2: Job Information */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] p-6 md:p-8 h-full">
                                <h3 className="text-lg font-bold text-gray-900 mb-6 pb-4 border-b border-gray-50 flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs">2</span>
                                    Job Information
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
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

                                    <div className="sm:col-span-2">
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
                        </div>

                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-4 border-t border-gray-100 pt-6 mt-8">
                        <Button type="button" variant="outline" onClick={() => navigate(-1)} className="px-6">Cancel</Button>
                        <Button type="submit" variant="primary" disabled={isSubmitting} className="shadow-md px-8 disabled:opacity-75 disabled:cursor-not-allowed">
                            {isSubmitting ? 'Creating...' : 'Create User'}
                        </Button>
                    </div>
                </form>
            ) : (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 md:p-12 mb-8">
                    <div className="max-w-2xl mx-auto flex flex-col items-center text-center">
                        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
                            <svg className="w-10 h-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-3">Bulk Upload Employees</h2>
                        <p className="text-gray-500 leading-relaxed mb-8">
                            Upload a standard Excel file (.xlsx) to automatically import multiple users. Please ensure your file matches the required column headers.
                        </p>

                        <div className="w-full flex justify-center mb-10">
                            <button onClick={downloadTemplate} className="text-sm font-bold text-teal-600 flex items-center gap-2 hover:text-teal-700 hover:underline">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                Download Excel Template
                            </button>
                        </div>

                        <div
                            onClick={triggerFileInput}
                            className={`w-full border-2 border-dashed rounded-3xl p-10 cursor-pointer transition-all duration-300 ${bulkFile ? 'border-emerald-500 bg-emerald-50/50' : 'border-gray-200 hover:border-teal-400 hover:bg-slate-50'}`}
                        >
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx, .xls" className="hidden" />

                            {bulkFile ? (
                                <div className="flex flex-col items-center">
                                    <svg className="w-12 h-12 text-emerald-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    <p className="text-lg font-bold text-gray-900">{bulkFile.name}</p>
                                    <p className="text-sm text-gray-500 mt-1">{(bulkFile.size / 1024).toFixed(1)} KB • Ready to upload</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center">
                                    <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                    <p className="text-base font-bold text-gray-700">Click to select an Excel file</p>
                                    <p className="text-sm text-gray-400 mt-2">XLSX or XLS, up to 10MB</p>
                                </div>
                            )}
                        </div>

                        {bulkResults && bulkResults.errors && bulkResults.errors.length > 0 && (
                            <div className="w-full mt-8 text-left bg-red-50 border border-red-100 rounded-2xl p-6">
                                <h4 className="font-bold text-red-700 mb-3 flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    Upload Errors ({bulkResults.failed})
                                </h4>
                                <ul className="list-disc pl-5 text-[13px] text-red-600 space-y-1.5 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                    {bulkResults.errors.map((err, i) => (
                                        <li key={i}>{err}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="w-full mt-10 pt-8 border-t border-gray-100 flex justify-end gap-4">
                            <Button type="button" variant="outline" onClick={() => { setBulkFile(null); setBulkResults(null); }} className="px-6" disabled={isSubmitting || !bulkFile}>Clear</Button>
                            <Button type="button" variant="primary" onClick={handleBulkUpload} disabled={isSubmitting || !bulkFile} className="shadow-md px-10 bg-emerald-600 hover:bg-emerald-700 min-w-[180px]">
                                {isSubmitting ? 'Processing File...' : 'Upload & Create'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
