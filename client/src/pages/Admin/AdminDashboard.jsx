import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';

export default function AdminDashboard() {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalEmployees: 0,
        totalManagers: 0,
        totalProjects: 0
    });

    useEffect(() => {
        // Fetch stats
        fetchStats();
    }, [token]);

    const fetchStats = async () => {
        try {
            const [usersRes, projectsRes] = await Promise.all([
                axiosInstance.get('/admin/users'),
                axiosInstance.get('/projects')
            ]);
            const users = usersRes.data.success ? usersRes.data.data : [];
            const projects = projectsRes.data.success ? projectsRes.data.data : [];

            setStats({
                totalEmployees: users.filter(u => u.role === 'employee').length,
                totalManagers: users.filter(u => u.role === 'manager').length,
                totalProjects: projects.length
            });
        } catch (error) {
            console.error('Error fetching admin stats', error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                <button onClick={() => navigate('/admin/create-user')} className="bg-indigo-600 text-white px-4 py-2 rounded shadow hover:bg-indigo-700">
                    + Add New User
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Total Employees</h3>
                    <p className="text-4xl font-bold text-gray-900">{stats.totalEmployees}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Total Managers</h3>
                    <p className="text-4xl font-bold text-gray-900">{stats.totalManagers}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Active Projects</h3>
                    <p className="text-4xl font-bold text-gray-900">{stats.totalProjects}</p>
                </div>
            </div>

            <div className="mt-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Recent System Activity</h2>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-gray-500 text-sm italic">
                    All system operations are running smoothly. RBAC logic enforced.
                </div>
            </div>
        </div>
    );
}
