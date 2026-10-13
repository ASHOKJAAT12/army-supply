import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useParams, Link } from 'react-router-dom';
import { useSocket } from '../../hooks/useSocket';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const DeviceDetail = () => {
    const { id } = useParams();
    const [device, setDevice] = useState(null);
    const [telemetry, setTelemetry] = useState([]);
    const [loading, setLoading] = useState(true);
    const { isConnected, lastEvent } = useSocket();

    useEffect(() => {
        fetchData();
    }, [id]);

    useEffect(() => {
        // Socket updates
        if (lastEvent && lastEvent.type === 'telemetry_received' && lastEvent.data.device === id) {
            setTelemetry(prev => {
                const updated = [lastEvent.data, ...prev].slice(0, 50); // keep last 50 points
                return updated;
            });
        }
        if (lastEvent && lastEvent.type === 'device_status_updated' && lastEvent.data._id === id) {
            setDevice(lastEvent.data);
        }
    }, [id, lastEvent]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [dRes, tRes] = await Promise.all([
                api.get(`/api/devices/${id}`),
                api.get(`/api/devices/${id}/telemetry`)
            ]);
            setDevice(dRes.data.data);
            setTelemetry(tRes.data.data);
        } catch (err) {
            console.error('Failed to load detail', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-6 text-white">Loading device detail...</div>;
    if (!device) return <div className="p-6 text-white">Device not found</div>;

    // Formatting for Chart
    const chartData = [...telemetry].reverse().map(t => ({
        time: new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        weight: t.measurements?.weightKg || 0,
        temp: t.measurements?.temperatureC || 0,
        battery: t.batteryPercent || 0
    }));

    return (
        <div className="p-6 space-y-6 text-white max-w-7xl mx-auto">
            <Link to="/devices" className="text-brand-400 hover:text-brand-300 font-semibold text-sm">
                ← Back to Devices
            </Link>

            <div className="flex justify-between items-start bg-slate-900 border border-slate-700 p-6 rounded shadow-lg">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">{device.name}</h1>
                    <div className="flex gap-4 items-center">
                        <span className="font-mono text-slate-400 bg-slate-800 px-2 rounded">{device.deviceId}</span>
                        <span className="text-sm uppercase text-slate-500 font-semibold">{device.deviceType.replace('_', ' ')}</span>
                    </div>
                </div>
                <div className="text-right">
                    <div className={`mb-2 font-bold px-3 py-1 rounded shadow-inner uppercase tracking-wider text-xs inline-block ${device.status === 'online' ? 'bg-emerald-500 text-white' :
                            device.status === 'warning' ? 'bg-orange-500 text-white' :
                                'bg-slate-700 text-slate-300'
                        }`}>
                        {device.status}
                    </div>
                    <div className="text-xs text-slate-400 mt-2">
                        Last Active: <span className="font-semibold text-white">{new Date(device.lastSeenAt).toLocaleString()}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                        Live Sync: <span className={isConnected ? "text-emerald-400 font-bold" : "text-red-500 font-bold"}>{isConnected ? 'LIVE' : 'DISCONNECTED'}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                {/* Meta Panel */}
                <div className="card space-y-4 shadow-lg lg:col-span-1">
                    <h3 className="text-lg font-bold border-b border-surface-border pb-2">Specs & Config</h3>
                    <div>
                        <div className="text-[10px] uppercase text-slate-500 font-bold">Battery Life</div>
                        <div className={`text-xl font-bold mt-1 ${device.batteryPercent < 20 ? 'text-red-400' : 'text-emerald-400'}`}>
                            {device.batteryPercent}%
                        </div>
                    </div>
                    <div>
                        <div className="text-[10px] uppercase text-slate-500 font-bold">Assigned Location</div>
                        <div className="text-base text-slate-200 mt-1">{device.location?.name || 'None'}</div>
                    </div>
                    <div>
                        <div className="text-[10px] uppercase text-slate-500 font-bold">Assigned Item Tracker</div>
                        <div className="text-base text-slate-200 mt-1">{device.item?.name || 'None'}</div>
                    </div>
                    {device.deviceType === 'inventory_sensor' && (
                        <div>
                            <div className="text-[10px] uppercase text-slate-500 font-bold">Latest Measured Weight</div>
                            <div className="text-2xl text-blue-400 font-bold mt-1 font-mono">
                                {telemetry.length > 0 ? telemetry[0].measurements?.weightKg : '--'} kg
                            </div>
                        </div>
                    )}
                </div>

                {/* Telemetry Chart Panel */}
                <div className="card shadow-lg lg:col-span-3">
                    <h3 className="text-lg font-bold border-b border-surface-border pb-2 mb-4">Real-Time Telemetry Stream</h3>
                    <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} />
                                <YAxis yAxisId="left" stroke="#60a5fa" fontSize={12} />
                                <YAxis yAxisId="right" orientation="right" stroke="#f43f5e" fontSize={12} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }} />
                                <Legend />
                                <Line yAxisId="left" type="stepAfter" dataKey="weight" name="Weight (kg)" stroke="#3b82f6" strokeWidth={3} dot={false} isAnimationActive={false} />
                                <Line yAxisId="right" type="monotone" dataKey="temp" name="Temp (°C)" stroke="#ef4444" strokeWidth={2} dot={false} isAnimationActive={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default DeviceDetail;
