import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';

export default function UsersList() {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Edit modal state
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        role: '',
        department: '',
        status: ''
    });

    // Delete confirmation modal state
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletingUser, setDeletingUser] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // Action feedback
    const [actionError, setActionError] = useState('');

    const fetchUsers = async () => {
        try {
            const res = await axiosInstance.get('/admin/users');
            if (res.data.success) {
                setUsers(res.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch users', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [token]);

    // ── Edit ────────────────────────────────────────────────────────────────
    const handleEditClick = (user) => {
        setEditingUser(user);
        setFormData({
            fullName: user.fullName || '',
            email: user.email || '',
            role: user.role || '',
            department: user.department || '',
            status: user.status || 'ACTIVE'
        });
        setIsEditModalOpen(true);
    };

    const handleCloseEditModal = () => {
        setIsEditModalOpen(false);
        setEditingUser(null);
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmitEdit = async (e) => {
        e.preventDefault();
        try {
            const res = await axiosInstance.put(`/admin/users/${editingUser._id}`, formData);
            const data = res.data;
            if (data.success) {
                // Instantly update user in state without full re-fetch
                setUsers(prev => prev.map(u => u._id === editingUser._id ? { ...u, ...data.data } : u));
                handleCloseEditModal();
            } else {
                alert(data.message || 'Failed to update user');
            }
        } catch (error) {
            console.error('Error updating user:', error);
            alert('Something went wrong updating user.');
        }
    };

    // ── Disable / Enable ────────────────────────────────────────────────────
    const handleToggleDisable = async (user) => {
        setActionError('');
        try {
            const res = await axiosInstance.patch(`/admin/users/${user._id}/disable`);
            const data = res.data;
            if (data.success) {
                // Instantly update status in state
                setUsers(prev =>
                    prev.map(u => u._id === user._id ? { ...u, status: data.data.status } : u)
                );
            } else {
                setActionError(data.message || 'Failed to toggle user status');
            }
        } catch (error) {
            console.error('Error toggling user status:', error);
            const message = error.response?.data?.message || 'Something went wrong. Please try again.';
            setActionError(message);
        }
    };

    // ── Delete ───────────────────────────────────────────────────────────────
    const handleDeleteClick = (user) => {
        setDeletingUser(user);
        setIsDeleteModalOpen(true);
        setActionError('');
    };

    const handleCloseDeleteModal = () => {
        setIsDeleteModalOpen(false);
        setDeletingUser(null);
    };

    const handleConfirmDelete = async () => {
        if (!deletingUser) return;
        setDeleteLoading(true);
        setActionError('');
        try {
            const res = await axiosInstance.delete(`/admin/users/${deletingUser._id}`);
            const data = res.data;
            if (data.success) {
                // Remove user from UI instantly — no page refresh
                setUsers(prev => prev.filter(u => u._id !== deletingUser._id));
                handleCloseDeleteModal();
            } else {
                setActionError(data.message || 'Failed to delete user');
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            setActionError('Something went wrong. Please try again.');
        } finally {
            setDeleteLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">All System Users</h2>
                <button
                    onClick={() => navigate('/admin/create-user')}
                    className="bg-gray-900 text-white px-4 py-2 rounded shadow-md hover:bg-gray-800 transition"
                >
                    + Add User
                </button>
            </div>

            {/* Global action error banner */}
            {actionError && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 flex justify-between items-center">
                    <span>{actionError}</span>
                    <button onClick={() => setActionError('')} className="ml-4 font-bold text-red-500 hover:text-red-700">✕</button>
                </div>
            )}

            {loading ? (
                <div className="text-gray-500 py-6 text-center">Loading users...</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm whitespace-nowrap">
                        <thead className="uppercase tracking-wider font-bold border-b border-gray-200 text-gray-500 bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-4">Name</th>
                                <th scope="col" className="px-6 py-4">Email</th>
                                <th scope="col" className="px-6 py-4">Role</th>
                                <th scope="col" className="px-6 py-4">Department</th>
                                <th scope="col" className="px-6 py-4">Status</th>
                                <th scope="col" className="px-6 py-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {users.map(u => (
                                <tr key={u._id} className="hover:bg-gray-50 transition">
                                    <td className="px-6 py-4 font-medium text-gray-900">{u.fullName}</td>
                                    <td className="px-6 py-4 text-gray-600">{u.email}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : u.role === 'manager' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                                            {u.role.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">{u.department || '-'}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${u.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {u.status?.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-3 text-sm items-center">
                                            {/* Edit */}
                                            <button
                                                onClick={() => handleEditClick(u)}
                                                className="text-blue-600 hover:text-blue-800 font-medium transition"
                                            >
                                                Edit
                                            </button>

                                            {/* Disable / Enable */}
                                            <button
                                                onClick={() => handleToggleDisable(u)}
                                                className={`font-medium transition ${u.status === 'ACTIVE' ? 'text-amber-600 hover:text-amber-800' : 'text-green-600 hover:text-green-800'}`}
                                            >
                                                {u.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                                            </button>

                                            {/* Delete */}
                                            <button
                                                onClick={() => handleDeleteClick(u)}
                                                className="text-red-500 hover:text-red-700 font-medium transition"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── Edit Modal ─────────────────────────────────────────────── */}
            {isEditModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Edit User</h3>
                        <form onSubmit={handleSubmitEdit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                <input
                                    type="text"
                                    name="fullName"
                                    value={formData.fullName}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                <select
                                    name="role"
                                    value={formData.role}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="employee">Employee</option>
                                    <option value="manager">Manager</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                                <input
                                    type="text"
                                    name="department"
                                    value={formData.department}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="ACTIVE">ACTIVE</option>
                                    <option value="INACTIVE">INACTIVE</option>
                                </select>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={handleCloseEditModal}
                                    className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded font-medium"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Delete Confirmation Modal ────────────────────────────────── */}
            {isDeleteModalOpen && deletingUser && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
                        {/* Warning icon */}
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
                            <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                            </svg>
                        </div>

                        <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Delete User</h3>
                        <p className="text-sm text-gray-600 text-center mb-1">
                            Are you sure you want to permanently delete
                        </p>
                        <p className="text-sm font-semibold text-gray-900 text-center mb-4">
                            {deletingUser.fullName} ({deletingUser.email})?
                        </p>
                        <p className="text-xs text-gray-500 text-center mb-6 bg-amber-50 border border-amber-100 rounded p-2">
                            This will remove the user and clean up their project memberships and task assignments. <strong>This action cannot be undone.</strong>
                        </p>

                        {actionError && (
                            <p className="text-sm text-red-600 text-center mb-4">{actionError}</p>
                        )}

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={handleCloseDeleteModal}
                                disabled={deleteLoading}
                                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDelete}
                                disabled={deleteLoading}
                                className="flex-1 px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg font-medium transition disabled:opacity-50"
                            >
                                {deleteLoading ? 'Deleting...' : 'Yes, Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
