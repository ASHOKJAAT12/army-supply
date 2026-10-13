import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import NotificationDropdown from './NotificationDropdown';

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <header className="h-14 flex items-center justify-between px-6 bg-surface-card border-b border-surface-border flex-shrink-0">
            {/* Left — page context */}
            <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-slate-400 font-medium">System Operational</span>
            </div>

            {/* Right — user + logout */}
            <div className="flex items-center gap-4">
                <NotificationDropdown />
                <span className="text-xs text-slate-500 hidden sm:block">
                    {new Date().toLocaleDateString('en-IN', {
                        weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
                    })}
                </span>
                {user && (
                    <>
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-medium text-slate-200">{user.name}</p>
                            <p className="text-xs text-slate-500 capitalize">{user.role}</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="btn-secondary !px-3 !py-1.5 text-xs"
                            id="logout-btn"
                        >
                            Logout
                        </button>
                    </>
                )}
            </div>
        </header>
    );
};

export default Navbar;
