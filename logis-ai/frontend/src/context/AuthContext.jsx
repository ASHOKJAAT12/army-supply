import { createContext, useContext, useState, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        try {
            const stored = localStorage.getItem('logis_user');
            return stored ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    });

    const [token, setToken] = useState(() => localStorage.getItem('logis_token') || null);

    const login = useCallback(async (email, password) => {
        const res = await api.post('/api/auth/login', { email, password });
        const { user: u, token: t } = res.data.data;
        setUser(u);
        setToken(t);
        localStorage.setItem('logis_user', JSON.stringify(u));
        localStorage.setItem('logis_token', t);
        return u;
    }, []);

    const register = useCallback(async (payload) => {
        const res = await api.post('/api/auth/register', payload);
        return res.data;
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('logis_user');
        localStorage.removeItem('logis_token');
    }, []);

    return (
        <AuthContext.Provider value={{ user, token, login, register, logout, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
};

export default AuthContext;
