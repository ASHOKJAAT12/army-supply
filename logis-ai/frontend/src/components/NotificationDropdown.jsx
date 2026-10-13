import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useSocket } from '../hooks/useSocket';
import { useNavigate } from 'react-router-dom';

const NotificationDropdown = () => {
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const navigate = useNavigate();

    const fetchNotifs = async () => {
        try {
            const res = await api.get('/api/notifications');
            if (res.data.success) {
                setNotifications(res.data.data);
            }
        } catch (e) { }
    };

    useEffect(() => {
        fetchNotifs();
        // simple polling for Phase 8 Demo
        const t = setInterval(fetchNotifs, 10000);
        return () => clearInterval(t);
    }, []);

    const handleRead = async (e, id, navLink) => {
        e.stopPropagation();
        try {
            await api.patch(`/api/notifications/${id}/read`);
            setNotifications(prev => prev.filter(n => n._id !== id));
            setOpen(false);
            if (navLink) navigate(navLink);
        } catch (e) { }
    };

    const count = notifications.length;

    return (
        <div className="relative z-50">
            <button
                onClick={() => setOpen(!open)}
                className="relative p-2 rounded-full hover:bg-surface-elevated transition-colors"
                title="System Alerts"
            >
                <span className="text-xl opacity-75">🔔</span>
                {count > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-surface-card animate-pulse"></span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-80 bg-slate-800 border border-slate-700 shadow-2xl rounded-xl overflow-hidden flex flex-col">
                    <div className="bg-slate-900 px-4 py-3 border-b border-slate-700 flex justify-between items-center">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Alert Center</h3>
                        <button onClick={() => setOpen(false)} className="text-slate-400 text-xs">✕</button>
                    </div>
                    <div className="max-h-96 overflow-y-auto w-full">
                        {count === 0 ? (
                            <div className="p-4 text-center text-sm text-slate-500">No active alerts.</div>
                        ) : notifications.map(n => (
                            <div key={n._id} className="p-3 border-b border-slate-700/50 hover:bg-slate-750 cursor-pointer flex justify-between"
                                onClick={(e) => handleRead(e, n._id, n.entityType === 'Decision' ? `/decisions/${n.entityId}` : null)}
                            >
                                <div>
                                    <div className="flex gap-2 items-center mb-1">
                                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${n.priority === 'critical' ? 'bg-red-500' : n.priority === 'high' ? 'bg-orange-500' : 'bg-blue-500'}`}></span>
                                        <span className={`text-[10px] font-bold uppercase tracking-widest ${n.priority === 'critical' ? 'text-red-400' : 'text-slate-400'}`}>{n.type.replace('_', ' ')}</span>
                                    </div>
                                    <div className="text-sm text-slate-200 pr-2 leading-tight">{n.message}</div>
                                    <div className="text-[10px] text-slate-500 mt-1">{new Date(n.createdAt).toLocaleTimeString()}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                    {count > 0 && (
                        <div className="bg-slate-900 border-t border-slate-700 p-2 text-center">
                            <button onClick={() => { }} className="text-xs text-brand-400 font-semibold hover:underline">Mark all read</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationDropdown;
