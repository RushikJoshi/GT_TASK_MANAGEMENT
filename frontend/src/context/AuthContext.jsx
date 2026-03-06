import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
    return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Clean up any old localStorage tokens (migration to sessionStorage)
        localStorage.removeItem('user');
        localStorage.removeItem('token');

        // Load auth state from sessionStorage on init
        // sessionStorage clears automatically when browser/tab is closed
        const storedUser = sessionStorage.getItem('user');
        const storedToken = sessionStorage.getItem('token');

        if (storedUser && storedToken) {
            try {
                setUser(JSON.parse(storedUser));
                setToken(storedToken);
            } catch (e) {
                // Corrupted data — clear and force re-login
                sessionStorage.removeItem('user');
                sessionStorage.removeItem('token');
            }
        }
        setLoading(false);
    }, []);

    const login = (userData, userToken) => {
        setUser(userData);
        setToken(userToken);
        sessionStorage.setItem('user', JSON.stringify(userData));
        sessionStorage.setItem('token', userToken);
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('token');
    };

    const updateUser = (userData) => {
        const updated = { ...user, ...userData };
        setUser(updated);
        sessionStorage.setItem('user', JSON.stringify(updated));
    };

    const value = {
        user,
        role: user?.role,
        token,
        login,
        logout,
        updateUser,
        isAuthenticated: !!token
    };

    if (loading) return <div>Loading...</div>;

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
