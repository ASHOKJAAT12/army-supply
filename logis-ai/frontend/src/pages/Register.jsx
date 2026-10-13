import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Register = () => {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({
        name: '', email: '', mobile: '', password: '', role: 'viewer',
    });
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState([]);
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setFieldErrors([]);
        setLoading(true);
        try {
            await register(form);
            navigate('/login', { state: { registered: true } });
        } catch (err) {
            const data = err.response?.data;
            if (data?.errors?.length) {
                setFieldErrors(data.errors);
            } else {
                setError(data?.message || 'Registration failed. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-surface flex items-center justify-center px-4 py-10">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-brand-800/10 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-600 rounded-2xl mb-4 shadow-lg shadow-brand-900/50">
                        <span className="text-white font-bold text-xl">L</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white">LOGIS-AI</h1>
                    <p className="text-slate-400 text-sm mt-1">Create your account</p>
                </div>

                <div className="card">
                    <h2 className="text-lg font-semibold text-white mb-6">Register</h2>

                    {error && (
                        <div className="mb-4 px-4 py-3 rounded-lg bg-red-900/40 border border-red-800 text-red-300 text-sm">
                            {error}
                        </div>
                    )}
                    {fieldErrors.length > 0 && (
                        <ul className="mb-4 px-4 py-3 rounded-lg bg-red-900/40 border border-red-800 text-red-300 text-sm space-y-1">
                            {fieldErrors.map((e, i) => <li key={i}>• {e.message}</li>)}
                        </ul>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4" id="register-form">
                        <div>
                            <label htmlFor="name" className="label">Full Name</label>
                            <input id="name" name="name" type="text" required value={form.name}
                                onChange={handleChange} placeholder="John Doe" className="input" />
                        </div>
                        <div>
                            <label htmlFor="reg-email" className="label">Email address</label>
                            <input id="reg-email" name="email" type="email" required value={form.email}
                                onChange={handleChange} placeholder="you@domain.com" className="input" />
                        </div>
                        <div>
                            <label htmlFor="mobile" className="label">Mobile (10 digits)</label>
                            <input id="mobile" name="mobile" type="tel" required value={form.mobile}
                                onChange={handleChange} placeholder="9876543210" className="input" maxLength={10} />
                        </div>
                        <div>
                            <label htmlFor="reg-password" className="label">Password</label>
                            <input id="reg-password" name="password" type="password" required value={form.password}
                                onChange={handleChange} placeholder="Min 8 characters" className="input" />
                        </div>
                        <div>
                            <label htmlFor="role" className="label">Role</label>
                            <select id="role" name="role" value={form.role} onChange={handleChange} className="input">
                                <option value="viewer">Viewer</option>
                                <option value="operator">Operator</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>

                        <button id="register-submit-btn" type="submit" disabled={loading} className="btn-primary w-full mt-2">
                            {loading ? 'Creating account…' : 'Create Account'}
                        </button>
                    </form>

                    <p className="text-center text-sm text-slate-500 mt-6">
                        Already have an account?{' '}
                        <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium">Sign in</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;
