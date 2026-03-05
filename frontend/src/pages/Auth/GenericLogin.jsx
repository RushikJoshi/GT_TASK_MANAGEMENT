import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import { authApi } from '../../api/auth.api';
import { useAuth } from '../../context/AuthContext';

export default function GenericLogin({ role, title, subtitle }) {
    /*
     * PHASE 5 EXPLANATIONS:
     * 
     * - Why role-specific login portals exist:
     *   Having separate portals (e.g., /admin-login, /employee-login) strictly enforces UI and routing separation from the very first interaction. 
     *   It prevents employees from even attempting to guess admin routes and adds a layer of security by explicitly declaring the expected authentication context before sending the request.
     */
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    // Prevent back navigation logic natively within login container mounting
    useEffect(() => {
        window.history.pushState(null, "", window.location.href);
        window.onpopstate = () => window.history.go(1);
        return () => {
            window.onpopstate = null; // Cleanup
        }
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const data = await authApi.login(email, password, role);
            if (data.success) {
                login(data.user, data.token);

                // Use Replace True as requested
                if (role === 'admin') {
                    navigate('/admin', { replace: true });
                } else if (role === 'manager') {
                    navigate('/dashboard', { replace: true });
                } else {
                    navigate('/employee-dashboard', { replace: true });
                }
            } else {
                setError(data.message);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
            <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
                {/* Logo Placeholder */}
                <div className={`mx-auto h-12 w-12 text-white rounded-xl flex items-center justify-center transform -rotate-6 shadow-sm mb-6 ${role === 'admin' ? 'bg-purple-600' : role === 'manager' ? 'bg-indigo-600' : 'bg-green-600'}`}>
                    <svg className="w-6 h-6 transform rotate-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                </div>
                <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">{title}</h2>
                <p className="mt-2 text-sm text-gray-500 font-medium">{subtitle}</p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-[440px]">
                <div className="bg-white py-8 px-4 sm:px-10 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-gray-100/60">
                    {error && (
                        <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100 text-center font-medium">
                            {error}
                        </div>
                    )}
                    <form className="space-y-5" onSubmit={handleLogin}>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2" htmlFor="email">
                                Email Address
                            </label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="name@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                icon={
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                                    </svg>
                                }
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider" htmlFor="password">
                                    Password
                                </label>
                                <a href="#" className="text-xs font-semibold text-blue-600 hover:text-blue-500 transition-colors">
                                    Forgot password?
                                </a>
                            </div>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                icon={
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                }
                            />
                        </div>

                        <div className="pt-2">
                            <Button type="submit" variant="primary" disabled={loading} className={`w-full text-base py-3 shadow-md hover:shadow-lg transition-all disabled:opacity-75 disabled:cursor-not-allowed ${role === 'admin' ? 'bg-purple-600 hover:bg-purple-700' : role === 'manager' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-green-600 hover:bg-green-700'}`}>
                                {loading ? 'Logging in...' : 'Sign In'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
            {/* Portals footer selector */}
            <div className="mt-8 flex flex-col items-center space-y-3 text-xs font-medium text-gray-500">
                <p>Other Portals:</p>
                <div className="flex space-x-6">
                    {role !== 'admin' && <span onClick={() => navigate('/admin-login')} className="hover:text-purple-600 transition-colors font-bold cursor-pointer">Admin Portal</span>}
                    {role !== 'manager' && <span onClick={() => navigate('/manager-login')} className="hover:text-indigo-600 transition-colors font-bold cursor-pointer">Manager Portal</span>}
                    {role !== 'employee' && <span onClick={() => navigate('/employee-login')} className="hover:text-green-600 transition-colors font-bold cursor-pointer">Employee Portal</span>}
                </div>
            </div>
        </div>
    );
}
