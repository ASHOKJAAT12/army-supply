import { Link } from 'react-router-dom';

const NotFound = () => (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center text-center px-4">
        <div className="text-6xl font-black text-brand-700 mb-4">404</div>
        <h1 className="text-2xl font-bold text-white mb-2">Page Not Found</h1>
        <p className="text-slate-400 mb-8 max-w-sm">
            The route you are looking for does not exist in this system.
        </p>
        <Link to="/dashboard" className="btn-primary" id="back-to-dashboard-btn">
            ← Back to Dashboard
        </Link>
    </div>
);

export default NotFound;
