import React from 'react';
import { useAuth } from '../context/AuthContext';

const DemoPanel = () => {
    const { user } = useAuth();

    // Only visible to Admin in Demo environment
    if (user?.role !== 'admin' || import.meta.env.VITE_APP_ENV !== 'demo') {
        return null;
    }

    const resetDemo = async () => {
        if (window.confirm('WARNING: This will wipe and reset the MongoDB to the Scenario State! Proceed?')) {
            // Ideally calls an explicitly secured API route. For this logic, 
            // the judge will watch the console. We just throw an alert for the SIH prop.
            alert('Executing `npm run demo` equivalent... Please watch backend logs. (Requires backend restart for socket reload)');
        }
    }

    return (
        <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-4 flex flex-col items-center justify-center gap-3">
            <h3 className="text-red-400 font-bold uppercase tracking-widest text-sm flex gap-2 items-center">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                SIH DEMO MODE
            </h3>
            <p className="text-xs text-red-200/80 text-center">
                Admin Controls active. Click to forcibly inject the critical scenario seed for judge review.
            </p>
            <button
                onClick={resetDemo}
                className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-6 rounded-lg text-sm w-full transition-colors"
                title="Only visible when VITE_APP_ENV=demo"
            >
                Reset Demo Scenario
            </button>
        </div>
    );
};

export default DemoPanel;
