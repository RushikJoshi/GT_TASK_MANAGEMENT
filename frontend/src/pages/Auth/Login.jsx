import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import { authApi } from '../../api/auth.api';
import { useAuth } from '../../context/AuthContext';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    // Prevent back navigation after login
    useEffect(() => {
        window.history.pushState(null, '', window.location.href);
        window.onpopstate = () => window.history.go(1);
        return () => {
            window.onpopstate = null;
        };
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const data = await authApi.login(email, password);
            if (data.success) {
                login(data.user, data.token);

                // Role-based redirection — auto-detected from backend
                const role = data.user?.role;
                if (role === 'admin') {
                    navigate('/admin', { replace: true });
                } else if (role === 'manager') {
                    navigate('/dashboard', { replace: true });
                } else {
                    navigate('/employee-dashboard', { replace: true });
                }
            } else {
                setError(data.message || 'Login failed. Please try again.');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-white font-sans overflow-hidden">
            {/* LEFT SIDE: Brand Section */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#f8fafc] via-[#eef2ff] to-[#f0fdf4] flex-col justify-center items-center relative p-12 overflow-hidden border-r border-slate-100">
                <div className="relative z-10 w-full max-w-md text-center flex flex-col items-center">
                    {/* Abstract background blobs */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/3 w-96 h-96 bg-blue-400/10 rounded-full blur-[80px] pointer-events-none"></div>
                    <div className="absolute bottom-0 right-1/2 translate-x-1/3 translate-y-1/3 w-80 h-80 bg-emerald-400/10 rounded-full blur-[80px] pointer-events-none"></div>

                    {/* Logo */}
                    <div className="mb-6 relative flex items-center justify-center">
                        <img src="../../public/logo2.png" alt="Logo" className="w-24 h-24 object-contain" />
                    </div>

                    <h1 className="text-[32px] font-extrabold text-slate-900 tracking-tight lg:text-[40px] leading-tight mb-2">
                        Gitakshmi Technologies
                    </h1>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-700 mb-8 tracking-wide">
                        Project Management System
                    </h2>
                    <p className="text-slate-500 text-sm sm:text-[16px] leading-relaxed px-4 font-medium max-w-[90%]">
                        Streamline your workflow with powerful project management, task tracking, and team collaboration tools.
                    </p>
                </div>
            </div>

            {/* RIGHT SIDE: Login Form Section */}
            <div className="flex-1 flex flex-col justify-center py-12 px-6 sm:px-12 lg:px-20 xl:px-32 bg-white relative">
                <div className="mx-auto w-full max-w-[400px]">
                    {/* Mobile Branding */}
                    <div className="lg:hidden text-center mb-10">
                        <div className="flex justify-center mb-4">
                            <svg width="56" height="56" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M50 15C31.5 15 15 31.5 15 50s16.5 35 35 35 35-16.5 35-35H68c0 9.9-8.1 18-18 18s-18-8.1-18-18 8.1-18 18-18c4.6 0 8.7 1.7 11.9 4.6l12.7-12.7C63 19.5 56.8 15 50 15z" fill="#312E81" />
                                <path d="M50 50v17h17V50H50z" fill="#312E81" />
                                <path d="M25 25L15 15M35 15L30 5M50 10V0M65 15L70 5M75 25L85 15" stroke="#F97316" strokeWidth="6" strokeLinecap="round" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-1">
                            Gitakshmi Technologies
                        </h1>
                        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Project Management System</h2>
                    </div>

                    <div className="mb-8">
                        <h2 className="text-[28px] font-extrabold text-slate-900 tracking-tight mb-2">Welcome back</h2>
                        <p className="text-[15px] text-slate-500 font-medium">Sign in to your account to continue</p>
                    </div>

                    {error && (
                        <div className="mb-6 bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm border border-red-100 font-medium flex items-center gap-2">
                            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            {error}
                        </div>
                    )}

                    <form className="space-y-6" onSubmit={handleLogin}>
                        <div>
                            <label className="block text-[13px] font-bold text-slate-700 mb-2" htmlFor="email">
                                Email
                            </label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="you@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="!py-3 !rounded-xl text-[15px] w-full border-slate-200 bg-white"
                            />
                        </div>

                        <div>
                            <label className="block text-[13px] font-bold text-slate-700 mb-2" htmlFor="password">
                                Password
                            </label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="!py-3 !rounded-xl text-[15px] w-full border-slate-200 bg-white pr-10"
                                />
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? (
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="pt-2">
                            <Button
                                type="submit"
                                variant="primary"
                                disabled={loading}
                                className="w-full text-[15px] font-bold py-3.5 shadow-md hover:shadow-lg transition-all disabled:opacity-75 disabled:cursor-not-allowed bg-[#2563EB] hover:bg-[#1D4ED8] !rounded-xl"
                            >
                                {loading ? 'Signing in...' : 'Sign In'}
                            </Button>
                        </div>

                        {/* Adjusting Forgot password to be separate per the reference, though reference shows it below or beside but usually below button or above input. I'll place it below button. */}
                        <div className="text-center mt-6">
                            <a href="#" className="text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors">
                                Forgot password?
                            </a>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
