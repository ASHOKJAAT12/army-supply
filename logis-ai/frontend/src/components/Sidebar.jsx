import { useAuth } from '../context/AuthContext';
import { Link, useLocation } from 'react-router-dom';

const navItems = [
    { label: 'Dashboard', to: '/dashboard', icon: '⊞' },
    { label: 'Decision Center', to: '/decision-center', icon: '🧠' },
    { label: 'Locations', to: '/locations', icon: '📍' },
    { label: 'Inventory', to: '/inventory', icon: '📦' },
    { label: 'Vehicles', to: '/vehicles', icon: '🚚' },
    { label: 'Shipments', to: '/shipments', icon: '📋' },
    { label: 'Routes', to: '/routes', icon: '🗺️' },
    { label: 'Forecasting', to: '/forecasting', icon: '📈' },
    { label: 'Risk Analysis', to: '/risk', icon: '⚠️' },
    { label: 'Optimization', to: '/optimization', icon: '✨' },
    { label: 'IoT Devices', to: '/devices', icon: '📡' },
    { label: 'Alerts', to: '/alerts', icon: '🔔' },
    { label: 'Settings', to: '/settings', icon: '⚙️' },
];

const Sidebar = () => {
    const { pathname } = useLocation();
    const { user } = useAuth();

    return (
        <aside className="w-64 flex-shrink-0 h-screen flex flex-col bg-surface-card border-r border-surface-border">
            {/* Logo */}
            <div className="px-6 py-5 border-b border-surface-border">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold text-sm">
                        L
                    </div>
                    <div>
                        <p className="text-white font-semibold text-sm leading-tight">LOGIS-AI</p>
                        <p className="text-slate-500 text-xs">Logistics System</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 overflow-y-auto">
                <p className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Navigation
                </p>
                <ul className="space-y-0.5">
                    {navItems.map((item) => {
                        const active = pathname === item.to;
                        return (
                            <li key={item.to}>
                                <Link
                                    to={item.to}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active
                                        ? 'bg-brand-600/20 text-brand-300 border border-brand-700/40'
                                        : 'text-slate-400 hover:text-slate-200 hover:bg-surface-elevated'
                                        }`}
                                >
                                    <span className="text-base">{item.icon}</span>
                                    {item.label}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* User footer */}
            {user && (
                <div className="px-4 py-4 border-t border-surface-border">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-700 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                            {user.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-200 truncate">{user.name}</p>
                            <p className="text-xs text-slate-500 capitalize">{user.role}</p>
                        </div>
                    </div>
                </div>
            )}
        </aside>
    );
};

export default Sidebar;
