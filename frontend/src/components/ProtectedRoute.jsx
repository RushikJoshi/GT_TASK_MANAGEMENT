import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
    const { isAuthenticated, role, loading } = useAuth();

    if (loading) return <div>Loading...</div>;

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    /*
     * PHASE 5 EXPLANATIONS:
     * 
     * - Why role-based access is important: 
     *   RBAC guarantees that users only see and interact with what they are authorized to. This mitigates unauthorized data mutation or access to sensitive pages.
     * 
     * - Why employees have restricted view:
     *   Employees mainly execute tasks. They shouldn't be distracted by configuration screens, project creation, or manage other users. Filtering UI creates a clear layout focused entirely on their work.
     */

    if (allowedRoles && !allowedRoles.includes(role)) {
        if (role === 'admin') return <Navigate to="/admin" replace />;
        if (role === 'manager') return <Navigate to="/dashboard" replace />;
        if (role === 'employee') return <Navigate to="/employee-dashboard" replace />;
        return <Navigate to="/employee-login" replace />;
    }

    return children;
};

export default ProtectedRoute;
