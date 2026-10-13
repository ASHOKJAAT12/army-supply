import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Link } from 'react-router-dom';
import { useSocket } from '../../hooks/useSocket';

const DevicesList = () => {
    const [devices, setDevices] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const { isConnected, lastEvent } = useSocket();

    useEffect(() => {
        fetchDevices();
    }, []);

    useEffect(() => {
        if (lastEvent && lastEvent.type === 'device_status_updated') {
            setDevices(prev => prev.map(d => d._id === lastEvent.data._id ? lastEvent.data : d));
            // Trigger summary refresh
            api.get('/api/devices/summary').then(res => setSummary(res.data.data)).catch(console.error);
        }
    }, [lastEvent]);

    const fetchDevices = async () => {
        try {
            setLoading(true);
            const [devRes, sumRes] = await Promise.all([
                api.get('/api/devices'),
                api.get('/api/devices/summary')
            ]);
            setDevices(devRes.data.data);
            setSummary(sumRes.data.data);
        } catch (err) {
            console.error('Failed to fetch devices', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-6 text-white">Loading device grid...</div>;

    return (
        <div className="p-6 space-y-6 text-white max-w-7xl mx-auto">
            <div className="flex justify-between items-center bg-slate-900 border border-slate-700 p-4 rounded shadow-lg">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
                        IoT Device Network
                    </h1>
                    <p className="text-slate-400 mt-1">Real-time sensor and asset tracking array</p>
                </div>
                <div>
                    <span className={`px-4 py-2 rounded-full font-bold shadow-lg ${isConnected ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-500/30' : 'bg-red-900/50 text-red-500 border border-red-500/30'}`}>
                        {isConnected ? '● RT CONNECTED' : '○ RT DISCONNECTED'}
                    </span>
                </div>
            </div>

            {/* Quick Summary */}
            {summary && (
                <div className="grid grid-cols-4 gap-4">
                    <div className="card border-blue-800/50">
                        <div className="text-xs uppercase text-slate-400">Total Devices</div>
                        <div className="text-3xl font-bold text-white mt-1">{summary.total}</div>
                    </div>
                    <div className="card border-emerald-800/50">
                        <div className="text-xs uppercase text-slate-400">Online</div>
                        <div className="text-3xl font-bold text-emerald-400 mt-1">{summary.online}</div>
                    </div>
                    <div className="card border-orange-800/50">
                        <div className="text-xs uppercase text-slate-400">Warning</div>
                        <div className="text-3xl font-bold text-orange-400 mt-1">{summary.warning}</div>
                    </div>
                    <div className="card border-red-800/50">
                        <div className="text-xs uppercase text-slate-400">Offline</div>
                        <div className="text-3xl font-bold text-red-400 mt-1">{summary.offline}</div>
                    </div>
                </div>
            )}

            {/* Device Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {devices.map(device => (
                    <div key={device._id} className="bg-slate-800 border border-slate-700 rounded-xl p-5 hover:border-slate-500 transition-colors">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-bold text-white text-lg">{device.name}</h3>
                                <p className="text-xs font-mono text-slate-400 mt-0.5">{device.deviceId}</p>
                            </div>
                            <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded shadow-inner ${device.status === 'online' ? 'bg-emerald-500 text-white' :
                                    device.status === 'warning' ? 'bg-orange-500 text-white' :
                                        'bg-slate-700 text-slate-300'
                                }`}>
                                {device.status}
                            </span>
                        </div>
                        <div className="space-y-2 mb-6 border-b border-slate-700 pb-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500 uppercase tracking-widest text-[10px]">Type</span>
                                <span className="text-slate-300 capitalize">{device.deviceType.replace('_', ' ')}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500 uppercase tracking-widest text-[10px]">Battery</span>
                                <span className={`font-bold ${device.batteryPercent < 20 ? 'text-red-400' : 'text-emerald-400'}`}>
                                    {device.batteryPercent}% 🔋
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500 uppercase tracking-widest text-[10px]">Last Sync</span>
                                <span className="text-slate-300">
                                    {device.lastTelemetryAt ? new Date(device.lastTelemetryAt).toLocaleTimeString() : 'Never'}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500 uppercase tracking-widest text-[10px]">Location</span>
                                <span className="text-slate-300">{device.location?.name || 'Unassigned'}</span>
                            </div>
                        </div>
                        <Link
                            to={`/devices/${device._id}`}
                            className="w-full block text-center bg-slate-900 border border-slate-700 hover:bg-brand-700 hover:text-white text-slate-300 py-2 rounded text-sm font-semibold transition-all">
                            View Live Telemetry
                        </Link>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DevicesList;
