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
        <div className="min-h-screen flex bg-white font-sans">

            {/* LEFT SIDE */}
            <div className="hidden lg:flex lg:w-1/2 items-center justify-center bg-gradient-to-br from-[#f8fafc] via-[#eef2ff] to-[#f0fdf4] border-r border-slate-100">

                <div className="max-w-lg text-center flex flex-col items-center px-10">

                    {/* Logo */}
                    <img
                        src="/new.png"
                        alt="Gitakshmi Technologies"
                        className="w-56 mb-1 object-contain"
                    />

                    {/* Company Name */}
                    {/* <h1 className="text-[28px] font-extrabold text-slate-900 tracking-tight mb-3">
                        Gitakshmi Technologies
                    </h1> */}

                    {/* System Title */}
                    <h2 className="text-[28px] font-semibold text-slate-700 mb-6">
                        Project Management System
                    </h2>

                    {/* Description */}
                    <p className="text-slate-500 text-[16px] leading-relaxed max-w-md">
                        Streamline your workflow with powerful project management,
                        task tracking, and team collaboration tools.
                    </p>

                </div>

            </div>

            {/* RIGHT SIDE LOGIN */}
            <div className="flex-1 flex items-center justify-center px-6 lg:px-20 bg-white">

                <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-8">

                    <h2 className="text-2xl font-bold text-slate-900 mb-1">
                        Welcome back
                    </h2>

                    <p className="text-slate-500 mb-6">
                        Sign in to your account to continue
                    </p>

                    {error && (
                        <div className="mb-4 bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm border border-red-100">
                            {error}
                        </div>
                    )}

                    <form className="space-y-5" onSubmit={handleLogin}>

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">
                                Email
                            </label>

                            <Input
                                type="email"
                                placeholder="you@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full rounded-lg"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">
                                Password
                            </label>

                            <div className="relative">

                                <Input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full pr-10 rounded-lg"
                                />

                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? (
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>

                            </div>
                        </div>

                        {/* Login Button */}
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={loading}
                            className="w-full py-3 font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 transition"
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </Button>

                        {/* Forgot Password */}
                        <div className="text-center pt-2">
                            <a
                                href="#"
                                className="text-sm text-slate-500 hover:text-slate-700 font-medium"
                            >
                                Forgot password?
                            </a>
                        </div>

                    </form>

                </div>

            </div>

        </div>
    );
}