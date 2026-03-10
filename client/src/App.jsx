import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard/Dashboard';
import Login from './pages/Auth/Login';
import Profile from './pages/Users/Profile';
import AdminDashboard from './pages/Admin/AdminDashboard';
import CreateUser from './pages/Admin/CreateUser';
import UsersList from './pages/Admin/UsersList';
import EmployeeDashboard from './pages/Employee/EmployeeDashboard';

import Projects from './pages/Projects/Projects';
import ProjectDetails from './pages/Projects/ProjectDetails';
import Tasks from './pages/Tasks/Tasks';
import TaskDetails from './pages/Tasks/TaskDetails';
import Activity from './pages/Activity/Activity';
import Notifications from './pages/Activity/Notifications';
import QuickTasks from './pages/QuickTasks/QuickTasks';

import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';

// Redirects '/' based on auth state and role
const RootRedirect = () => {
    const { isAuthenticated, role } = useAuth();
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (role === 'admin') return <Navigate to="/admin" replace />;
    if (role === 'manager') return <Navigate to="/dashboard" replace />;
    return <Navigate to="/employee-dashboard" replace />;
};

// Prevents already-logged-in users from seeing the login page
const PublicRoute = ({ children }) => {
    const { isAuthenticated, role } = useAuth();
    if (!isAuthenticated) return children;
    if (role === 'admin') return <Navigate to="/admin" replace />;
    if (role === 'manager') return <Navigate to="/dashboard" replace />;
    return <Navigate to="/employee-dashboard" replace />;
};

function App() {
    useEffect(() => {
        try {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                if (user?.preferences?.theme === 'dark') {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }
            }
        } catch (e) { }
    }, []);

    return (
        <Router>
            <Routes>
                <Route path="/" element={<RootRedirect />} />

                {/* Unified login page */}
                <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

                {/* Legacy portal paths — all redirect to the unified /login */}
                <Route path="/admin-login" element={<Navigate to="/login" replace />} />
                <Route path="/manager-login" element={<Navigate to="/login" replace />} />
                <Route path="/employee-login" element={<Navigate to="/login" replace />} />

                {/* Nested Routes inside DashboardLayout */}
                <Route element={<DashboardLayout />}>
                    {/* Manager Route */}
                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute allowedRoles={['manager']}>
                                <Dashboard />
                            </ProtectedRoute>
                        }
                    />

                    {/* Employee Route */}
                    <Route
                        path="/employee-dashboard"
                        element={
                            <ProtectedRoute allowedRoles={['employee']}>
                                <EmployeeDashboard />
                            </ProtectedRoute>
                        }
                    />

                    {/* Admin Routes */}
                    <Route
                        path="/admin"
                        element={
                            <ProtectedRoute allowedRoles={['admin']}>
                                <AdminDashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/create-user"
                        element={
                            <ProtectedRoute allowedRoles={['admin']}>
                                <CreateUser />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/users"
                        element={
                            <ProtectedRoute allowedRoles={['admin']}>
                                <UsersList />
                            </ProtectedRoute>
                        }
                    />

                    {/* Shared Routes for Authorized Users */}
                    <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
                    <Route path="/projects/:id" element={<ProtectedRoute><ProjectDetails /></ProtectedRoute>} />
                    <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
                    <Route path="/tasks/:id" element={<ProtectedRoute><TaskDetails /></ProtectedRoute>} />
                    <Route path="/activity" element={<ProtectedRoute><Activity /></ProtectedRoute>} />
                    <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                    <Route path="/quick-tasks" element={<ProtectedRoute><QuickTasks /></ProtectedRoute>} />

                    {/* Public Profile - any logged in user */}
                    <Route
                        path="/profile"
                        element={
                            <ProtectedRoute>
                                <Profile />
                            </ProtectedRoute>
                        }
                    />
                </Route>

                {/* Catch-all: redirect to login if not authenticated */}
                <Route path="*" element={<RootRedirect />} />
            </Routes>
        </Router>
    );
}

export default App;
