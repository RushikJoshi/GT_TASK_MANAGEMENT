import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth.api';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../../utils/cropImage';

export default function Profile() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    // Cropper states
    const [imageSrc, setImageSrc] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: '',
        avatar: '',
        jobTitle: '',
        department: '',
        phone: '',
        bio: '',
        joiningDate: '',
        status: '',
        preferences: {
            theme: 'light',
            notifications: true
        }
    });

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await authApi.getProfile();
                if (res.success && res.data) {
                    const user = res.data;
                    setFormData({
                        name: user.name || '',
                        email: user.email || '',
                        role: user.role || '',
                        avatar: user.avatar || '',
                        jobTitle: user.jobTitle || '',
                        department: user.department || '',
                        phone: user.phone || '',
                        bio: user.bio || '',
                        joiningDate: user.joiningDate ? new Date(user.joiningDate).toLocaleDateString() : '',
                        status: user.status || '',
                        preferences: {
                            theme: user.preferences?.theme || 'light',
                            notifications: user.preferences?.notifications !== undefined ? user.preferences.notifications : true
                        }
                    });
                    // Refresh local storage user 
                    localStorage.setItem('user', JSON.stringify(user));
                }
            } catch (err) {
                setMessage({ text: 'Failed to load profile. Please try again.', type: 'error' });
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        if (name === 'theme' || name === 'notifications') {
            const newValue = type === 'checkbox' ? checked : value;
            setFormData(prev => ({
                ...prev,
                preferences: {
                    ...prev.preferences,
                    [name]: newValue
                }
            }));

            // Instantly apply theme preview
            if (name === 'theme') {
                if (newValue === 'dark') {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }
            }
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setMessage({ text: '', type: '' });
        setSaving(true);

        try {
            const dataToUpdate = {
                name: formData.name,
                avatar: formData.avatar,
                phone: formData.phone,
                bio: formData.bio,
                jobTitle: formData.jobTitle,
                department: formData.department,
                preferences: formData.preferences
            };

            const res = await authApi.updateProfile(dataToUpdate);
            if (res.success) {
                setMessage({ text: 'Profile updated successfully!', type: 'success' });
                localStorage.setItem('user', JSON.stringify(res.data)); // Update local user state

                // Ensure theme is persisted
                if (res.data.preferences?.theme === 'dark') {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }
            } else {
                setMessage({ text: res.message || 'Failed to update profile', type: 'error' });
            }
        } catch (error) {
            setMessage({ text: error.response?.data?.message || 'An error occurred while saving', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const showCroppedImage = useCallback(async () => {
        try {
            const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
            setFormData(prev => ({ ...prev, avatar: croppedImage }));
            setImageSrc(null); // Close cropper modal
        } catch (e) {
            console.error(e);
        }
    }, [imageSrc, croppedAreaPixels]);

    // saves avatar immediately via API
    const handleSavePhoto = async () => {
        if (!formData.avatar) return;
        setSaving(true);
        try {
            const res = await authApi.updateProfile({ avatar: formData.avatar });
            if (res.success) {
                setMessage({ text: 'Photo saved successfully', type: 'success' });
                // update stored user as well
                const updated = res.data;
                localStorage.setItem('user', JSON.stringify(updated));
            } else {
                setMessage({ text: res.message || 'Unable to save photo', type: 'error' });
            }
        } catch (err) {
            setMessage({ text: err.response?.data?.message || 'Unable to save photo', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="w-full h-full min-h-[400px] flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-4 border-gray-200 border-t-gray-900 animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="w-full mx-auto flex-col flex gap-8 pb-12 animate-fade-in font-sans">

            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mt-2">
                <div>
                    <button
                        onClick={() => navigate(formData.role === 'admin' ? '/admin' : formData.role === 'manager' ? '/manager-dashboard' : '/employee-dashboard')}
                        className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 hover:text-slate-800 uppercase tracking-widest transition-colors mb-4"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Back to Dashboard
                    </button>
                    <h1 className="text-[32px] font-heading font-extrabold text-slate-800 tracking-tight">Profile Settings</h1>
                    <p className="text-[14px] text-slate-500 mt-1 font-medium">Manage your personal information and preferences.</p>
                </div>
                <Button
                    variant="primary"
                    onClick={handleSave}
                    disabled={saving}
                    className="disabled:opacity-75 disabled:cursor-not-allowed bg-teal-600 hover:bg-teal-700 text-white rounded-xl px-6 py-2.5 font-bold shadow-sm"
                >
                    {saving ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>

            {message.text && (
                <div className={`p-4 rounded-[16px] text-[13px] font-bold border ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSave} className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                {/* Column 1: Basic Info */}
                <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6 md:p-8 flex flex-col gap-6">
                    <div>
                        <h3 className="text-[16px] font-heading font-bold text-slate-800">Basic Information</h3>
                        <p className="text-[13px] text-slate-500 mt-1 font-medium">Update your photo and personal details.</p>
                    </div>

                    <div className="flex items-center gap-6">
                        <img
                            src={formData.avatar || `https://ui-avatars.com/api/?name=${formData.name}&background=random`}
                            alt="Avatar"
                            className="w-[84px] h-[84px] rounded-full border-4 border-white shadow-[0_2px_12px_rgba(0,0,0,0.08)] object-cover bg-slate-50"
                        />
                        <div className="flex-1">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5" htmlFor="avatarUpload">
                                Profile Photo
                            </label>
                            <div className="flex items-center gap-3">
                                <label htmlFor="avatarUpload" className="cursor-pointer inline-flex items-center justify-center font-bold rounded-xl transition-all outline-none text-[12px] px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm bg-white active:scale-[0.98]">
                                    <svg className="w-4 h-4 mr-2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    Upload Photo
                                </label>
                                <input
                                    id="avatarUpload"
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files[0];
                                        if (file) {
                                            const reader = new FileReader();
                                            reader.onload = (event) => {
                                                setImageSrc(event.target.result);
                                            };
                                            reader.readAsDataURL(file);
                                        }
                                        e.target.value = null;
                                    }}
                                />
                                {formData.avatar && (
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, avatar: '' }))}
                                        className="text-[12px] font-bold text-rose-500 hover:text-rose-600 transition-colors"
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-2 font-medium">Max 5MB. Edit enabled.</p>
                        </div>
                    </div>

                    {/* Image Cropper Modal */}
                    {imageSrc && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/80 backdrop-blur-sm p-4">
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
                                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                    <h3 className="font-bold text-gray-900 dark:text-white">Adjust Photo</h3>
                                    <button
                                        onClick={() => setImageSrc(null)}
                                        className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors p-1"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                                <div className="relative w-full h-[300px] sm:h-[400px] bg-gray-50 dark:bg-gray-900">
                                    <Cropper
                                        image={imageSrc}
                                        crop={crop}
                                        zoom={zoom}
                                        aspect={1}
                                        cropShape="round"
                                        showGrid={false}
                                        onCropChange={setCrop}
                                        onCropComplete={onCropComplete}
                                        onZoomChange={setZoom}
                                    />
                                </div>
                                <div className="p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row gap-4 justify-between items-center">
                                    <div className="w-full sm:w-1/2 flex items-center gap-3 text-gray-500 dark:text-gray-400 text-sm">
                                        <span>Zoom</span>
                                        <input
                                            type="range"
                                            value={zoom}
                                            min={1}
                                            max={3}
                                            step={0.1}
                                            onChange={(e) => setZoom(Number(e.target.value))}
                                            className="w-full h-1 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-gray-900 dark:accent-white"
                                        />
                                    </div>
                                    <div className="flex gap-2 w-full sm:w-auto">
                                        <Button variant="secondary" onClick={() => setImageSrc(null)} className="w-full sm:w-auto">Cancel</Button>
                                        <Button variant="primary" onClick={showCroppedImage} className="w-full sm:w-auto">Apply</Button>
                                        <Button variant="primary" onClick={async () => { await showCroppedImage(); handleSavePhoto(); }} className="w-full sm:w-auto">Save Photo</Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-6">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2" htmlFor="name">
                                Full Name
                            </label>
                            <Input
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2" htmlFor="email">
                                Email <span className="text-slate-400 font-medium normal-case">(Read-only)</span>
                            </label>
                            <Input
                                id="email"
                                value={formData.email}
                                disabled
                                className="bg-slate-50 text-slate-500 cursor-not-allowed border-slate-200 shadow-inner"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2" htmlFor="bio">
                            Bio
                        </label>
                        <textarea
                            id="bio"
                            name="bio"
                            rows={3}
                            value={formData.bio}
                            onChange={handleChange}
                            placeholder="Write a short introduction about yourself"
                            className="block w-full rounded-xl border border-slate-200 bg-white py-3 px-4 text-[14px] text-slate-700 placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-4 focus:ring-teal-500/10 transition-all resize-none shadow-sm"
                        />
                    </div>
                </div>

                {/* Column 2: Professional Info */}
                <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6 md:p-8 flex flex-col gap-6">
                    <div>
                        <h3 className="text-[16px] font-heading font-bold text-slate-800">Professional Details</h3>
                        <p className="text-[13px] text-slate-500 mt-1 font-medium">Your role and contact information.</p>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2" htmlFor="role">
                                System Role <span className="text-slate-400 font-medium normal-case">(Read-only)</span>
                            </label>
                            <Input
                                id="role"
                                value={formData.role}
                                disabled
                                className="bg-slate-50 text-slate-500 cursor-not-allowed border-slate-200 shadow-inner capitalize"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2" htmlFor="phone">
                                Phone Number
                            </label>
                            <Input
                                id="phone"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="+1 (555) 000-0000"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2" htmlFor="jobTitle">
                                Job Title
                            </label>
                            <Input
                                id="jobTitle"
                                name="jobTitle"
                                value={formData.jobTitle}
                                onChange={handleChange}
                                placeholder="E.g. Product Manager"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2" htmlFor="department">
                                Department
                            </label>
                            <Input
                                id="department"
                                name="department"
                                value={formData.department}
                                onChange={handleChange}
                                placeholder="Engineering"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-5 mt-auto">
                        <div className="p-4 rounded-[16px] bg-slate-50 border border-slate-100 flex flex-col justify-center">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5" htmlFor="status">
                                Account Status
                            </label>
                            <div className="flex items-center gap-2 mt-0.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
                                <span className="text-[14px] font-bold text-slate-800 capitalize">{formData.status}</span>
                            </div>
                        </div>
                        <div className="p-4 rounded-[16px] bg-slate-50 border border-slate-100 flex flex-col justify-center">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5" htmlFor="joiningDate">
                                Joining Date
                            </label>
                            <span className="text-[14px] font-bold text-slate-800 block mt-0.5">{formData.joiningDate}</span>
                        </div>
                    </div>
                </div>

                {/* Column 3: Preferences */}
                <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6 md:p-8 flex flex-col gap-6">
                    <div>
                        <h3 className="text-[16px] font-heading font-bold text-slate-800">Preferences</h3>
                        <p className="text-[13px] text-slate-500 mt-1 font-medium">Customize your experience and notifications.</p>
                    </div>

                    <div className="flex flex-col gap-4 flex-1">
                        <div className="flex items-center justify-between p-4.5 rounded-[16px] border border-slate-100 bg-slate-50/50 shadow-sm">
                            <div>
                                <h4 className="text-[14px] font-bold text-slate-800">Email Notifications</h4>
                                <p className="text-[12px] text-slate-500 mt-0.5 font-medium">Receive digests via email.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" name="notifications" checked={formData.preferences.notifications} onChange={handleChange} className="sr-only peer" />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
                            </label>
                        </div>

                        <div className="flex items-center justify-between p-4.5 rounded-[16px] border border-slate-100 bg-white shadow-sm">
                            <div>
                                <h4 className="text-[14px] font-bold text-slate-800">Weekly Activity Report</h4>
                                <p className="text-[12px] text-slate-500 mt-0.5 font-medium">Get an overview of your tasks.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" defaultChecked className="sr-only peer" />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
                            </label>
                        </div>

                        <div className="flex items-center justify-between p-4.5 rounded-[16px] border border-slate-100 bg-white shadow-sm">
                            <div>
                                <h4 className="text-[14px] font-bold text-slate-800">Push Notifications</h4>
                                <p className="text-[12px] text-slate-500 mt-0.5 font-medium">Alerts for task assignments.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
                            </label>
                        </div>

                        <div className="mt-6 pt-6 border-t border-slate-100">
                            <button type="button" className="text-[13px] font-bold text-rose-500 hover:text-rose-600 transition-colors w-full text-left flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                Request Account Deletion
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
