import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(form.email, form.password);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-surface flex items-center justify-center px-4">
            {/* Background pattern */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-brand-800/10 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-600 rounded-2xl mb-4 shadow-lg shadow-brand-900/50">
                        <span className="text-white font-bold text-xl">L</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white">LOGIS-AI</h1>
                    <p className="text-slate-400 text-sm mt-1">Predictive Logistics & Route Optimization</p>
                </div>

                {/* Card */}
                <div className="card">
                    <h2 className="text-lg font-semibold text-white mb-6">Sign in to your account</h2>

                    {error && (
                        <div className="mb-4 px-4 py-3 rounded-lg bg-red-900/40 border border-red-800 text-red-300 text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4" id="login-form">
                        <div>
                            <label htmlFor="email" className="label">Email address</label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={form.email}
                                onChange={handleChange}
                                placeholder="you@domain.com"
                                className="input"
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="label">Password</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                value={form.password}
                                onChange={handleChange}
                                placeholder="••••••••"
                                className="input"
                            />
                        </div>

                        <button
                            id="login-submit-btn"
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full mt-2"
                        >
                            {loading ? 'Signing in…' : 'Sign In'}
                        </button>
                    </form>

                    <p className="text-center text-sm text-slate-500 mt-6">
                        Don&apos;t have an account?{' '}
                        <Link to="/register" className="text-brand-400 hover:text-brand-300 font-medium">
                            Register
                        </Link>
                    </p>
                </div>

                {/* Demo notice */}
                <p className="text-center text-xs text-slate-600 mt-6">
                    Software prototype · Uses fictional demo data only
                </p>
            </div>
        </div>
    );
};

export default Login;
