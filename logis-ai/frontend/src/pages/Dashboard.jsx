import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import DemoPanel from '../components/DemoPanel';

const createDivIcon = (htmlContent, colorClass) => {
    return L.divIcon({
        html: `<div class="flex items-center justify-center w-6 h-6 rounded-full ${colorClass} shadow-lg border-2 border-slate-900 shadow-black/50 text-white font-bold text-xs">${htmlContent}</div>`,
        className: '',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });
};
const icons = {
    warehouse: createDivIcon('<div class="w-3 h-3 bg-white"></div>', 'bg-blue-600'),
    depot: createDivIcon('<div class="w-3 h-3 bg-white rotate-45 transform"></div>', 'bg-orange-500'),
    forward_base: createDivIcon('<div class="w-3 h-3 bg-white rounded-full"></div>', 'bg-green-600'),
};

const colorMap = {
    brand: 'bg-brand-600/10   text-brand-400   border-brand-700/40',
    emerald: 'bg-emerald-900/20 text-emerald-400 border-emerald-800/40',
    amber: 'bg-amber-900/20   text-amber-400   border-amber-800/40',
    purple: 'bg-purple-900/20  text-purple-400  border-purple-800/40',
};

const Dashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        locations: 0, vehicles: 0, items: 0, openShipments: 0
    });
    const [recentShipments, setRecentShipments] = useState([]);
    const [criticalInventory, setCriticalInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [locationsMap, setLocationsMap] = useState([]);
    const [aiAlerts, setAiAlerts] = useState([]);

    // IoT Hooks
    const { isConnected, lastEvent } = useSocket();
    const [iotSummary, setIotSummary] = useState(null);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [locRes, vehRes, itemRes, shipRes, critInvRes] = await Promise.all([
                    api.get('/api/locations?limit=1'), // just for total
                    api.get('/api/vehicles?limit=1'),
                    api.get('/api/items?limit=1'),
                    api.get('/api/shipments?limit=5&sort=-createdAt'),
                    api.get('/api/inventory/critical')
                ]);

                // Calculate open shipments
                const allShipments = await api.get('/api/shipments');
                const openCount = allShipments.data.data.filter(s => ['planned', 'ready', 'dispatched', 'in_transit'].includes(s.status)).length;

                setStats({
                    locations: locRes.data.pagination.total,
                    vehicles: vehRes.data.pagination.total,
                    items: itemRes.data.pagination.total,
                    openShipments: openCount
                });

                setRecentShipments(shipRes.data.data);
                setCriticalInventory(critInvRes.data.data.slice(0, 5)); // First 5

                // Fetch basic overview for minimap
                const overviewRes = await api.get('/api/map/overview');
                setLocationsMap(overviewRes.data.data.locations || []);

                // Fetch AI Forecasting alerts safely
                try {
                    const aiRes = await api.get('/api/forecast/summary');
                    setAiAlerts(aiRes.data.data.actionableAlerts || []);
                } catch (e) {
                    // Fail silently if AI service isn't active
                }
            } catch (error) {
                console.error("Dashboard fetch error", error);
            } finally {
                setLoading(false);
            }
        };

        const fetchIot = async () => {
            try {
                const res = await api.get('/api/devices/summary');
                setIotSummary(res.data.data);
            } catch (e) { }
        }

        fetchDashboardData();
        fetchIot();
    }, []);

    useEffect(() => {
        if (lastEvent && lastEvent.type === 'device_status_updated') {
            api.get('/api/devices/summary').then(res => setIotSummary(res.data.data)).catch(() => { });
        }
    }, [lastEvent]);

    const statCards = [
        { label: 'Active Locations', value: stats.locations.toString(), sub: 'Locations tracked', color: 'brand' },
        { label: 'Fleet Vehicles', value: stats.vehicles.toString(), sub: 'In system', color: 'emerald' },
        { label: 'Open Shipments', value: stats.openShipments.toString(), sub: 'Pending delivery', color: 'amber' },
        { label: 'Inventory Items', value: stats.items.toString(), sub: 'Supply categories', color: 'purple' },
    ];

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Page header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-white">Command Dashboard</h1>
                    <p className="text-sm text-slate-400 mt-0.5">
                        Welcome back, <span className="text-slate-300 font-medium">{user?.name}</span> ·{' '}
                        <span className="capitalize">{user?.role}</span>
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <Link to="/optimization" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold shadow-lg flex items-center gap-2 transition-all cursor-pointer">
                        <span className="text-lg">✨</span> AI Optimizer
                    </Link>
                    {isConnected ? (
                        <span className="badge-green h-fit">● RT CONNECTED</span>
                    ) : (
                        <span className="badge-red h-fit">○ RT DISCONNECTED</span>
                    )}
                </div>
            </div>

            {/* Decision Center Promo / Call to Action */}
            <div className="bg-brand-900/30 border border-brand-500/30 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between shadow-lg">
                <div>
                    <h2 className="text-xl font-bold text-white mb-2 ml-1 flex items-center gap-2">
                        <span className="text-2xl">🧠</span> AI Decision Center
                    </h2>
                    <p className="text-brand-200/80 text-sm max-w-xl">
                        Review automated logic chains, check system health limits, verify IoT triggers, and simulate what-if scenarios in the Unified AI Decision Hub.
                    </p>
                </div>
                <Link to="/decision-center" className="mt-4 md:mt-0 whitespace-nowrap bg-brand-600 hover:bg-brand-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg transition-transform focus-within:-translate-y-1">
                    Open Decision Center →
                </Link>
            </div>

            <DemoPanel />

            {/* MAIN METRICS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                {statCards.map((card) => (
                    <div key={card.label} className={`card-sm border ${colorMap[card.color]} transition-transform hover:scale-105 duration-200`}>
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{card.label}</p>
                        <p className={`text-3xl font-bold mt-1 ${colorMap[card.color].split(' ')[1]}`}>
                            {loading ? '...' : card.value}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">{card.sub}</p>
                    </div>
                ))}
            </div>

            {/* LIVE IoT Overview Strip */}
            {iotSummary && (
                <div className="bg-slate-900 border border-slate-700 p-4 rounded-xl shadow-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl animate-pulse">📡</span>
                        <div>
                            <h2 className="text-white font-bold text-sm">LIVE IOT SENSOR STREAM</h2>
                            <p className="text-xs text-slate-400">
                                Total Agents: <span className="text-white font-bold">{iotSummary.total}</span> |
                                Online: <span className="text-emerald-400 font-bold">{iotSummary.online}</span> |
                                Offline: <span className="text-red-400 font-bold">{iotSummary.offline}</span>
                            </p>
                        </div>
                    </div>
                    <Link to="/devices" className="text-xs bg-slate-800 hover:bg-slate-700 text-brand-300 font-bold px-4 py-2 border border-brand-800/40 rounded transition-colors shadow">
                        OPEN DEVICE COMMAND
                    </Link>
                </div>
            )}

            {/* Mini Map Row */}
            <div className="card">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-semibold text-white">GIS Network Overview</h2>
                    <Link to="/map" className="text-xs text-brand-400 hover:text-brand-300 bg-brand-900/20 px-3 py-1 rounded font-semibold transition-colors">
                        Open Full Map
                    </Link>
                </div>
                <div className="h-64 rounded-xl overflow-hidden shadow-inner border border-surface-border">
                    <MapContainer
                        center={[20, 78]}
                        zoom={3}
                        style={{ height: '100%', width: '100%' }}
                        zoomControl={false}
                        scrollWheelZoom={false}
                        dragging={false}
                    >
                        <TileLayer
                            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        />
                        {locationsMap.filter(l => l.latitude).map(loc => {
                            const icon = loc.type === 'warehouse' ? icons.warehouse :
                                loc.type === 'depot' ? icons.depot : icons.forward_base;
                            return (
                                <Marker
                                    key={loc._id}
                                    position={[loc.latitude, loc.longitude]}
                                    icon={icon}
                                />
                            );
                        })}
                    </MapContainer>
                </div>
            </div>

            {/* Predictive AI Alerts */}
            {aiAlerts.length > 0 && (
                <div className="card border-orange-500/50 bg-orange-950/20">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-orange-400">🤖</span>
                        <h2 className="text-sm font-semibold text-orange-400 uppercase tracking-widest">AI Predictive Alerts</h2>
                    </div>
                    <div className="space-y-3">
                        {aiAlerts.slice(0, 3).map((alert) => (
                            <div key={alert._id} className="flex justify-between items-center p-3 bg-surface-base rounded border border-surface-border">
                                <div>
                                    <p className="text-white text-sm font-medium">
                                        {alert.location?.name} — {alert.item?.name}
                                    </p>
                                    <p className="text-slate-400 text-xs mt-1">
                                        Predicted Stockout Date: <strong className="text-red-400">{new Date(alert.predictedStockoutDate).toLocaleDateString()}</strong> (Confidence: {alert.confidenceLevel})
                                    </p>
                                </div>
                                {alert.recommendedReplenishment > 0 && (
                                    <span className="text-xs font-semibold text-green-400 bg-green-900/40 px-2 py-1 rounded">
                                        Suggested Replenishment: {alert.recommendedReplenishment}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Critical Inventory */}
                <div className="card h-full">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-semibold text-white">Critical Inventory</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left border-b border-surface-border">
                                    <th className="pb-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Location</th>
                                    <th className="pb-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Item</th>
                                    <th className="pb-3 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Available</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-border/50">
                                {!loading && criticalInventory.map((inv) => (
                                    <tr key={inv._id} className="hover:bg-surface-elevated/30 transition-colors">
                                        <td className="py-3 font-medium text-slate-200">{inv.location?.name}</td>
                                        <td className="py-3 text-slate-400">{inv.item?.name}</td>
                                        <td className="py-3 text-right">
                                            <span className="badge-red px-2 py-0.5 rounded text-xs font-bold font-mono">
                                                {inv.availableQuantity}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {!loading && criticalInventory.length === 0 && (
                                    <tr>
                                        <td colSpan="3" className="py-6 text-center text-slate-500">No critical inventory items found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Recent Shipments */}
                <div className="card h-full">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-semibold text-white">Recent Shipments</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left border-b border-surface-border">
                                    <th className="pb-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Number</th>
                                    <th className="pb-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Dest</th>
                                    <th className="pb-3 text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-border/50">
                                {!loading && recentShipments.map((shp) => (
                                    <tr key={shp._id} className="hover:bg-surface-elevated/30 transition-colors">
                                        <td className="py-3 font-medium text-brand-300 font-mono text-xs">{shp.shipmentNumber}</td>
                                        <td className="py-3 text-slate-400">{shp.destinationLocation?.name}</td>
                                        <td className="py-3 text-center">
                                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${shp.status === 'delivered' ? 'bg-green-900/50 text-green-400' :
                                                shp.status === 'cancelled' ? 'bg-red-900/50 text-red-400' :
                                                    'bg-amber-900/50 text-amber-400'
                                                }`}>
                                                {shp.status.replace('_', ' ').toUpperCase()}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {!loading && recentShipments.length === 0 && (
                                    <tr>
                                        <td colSpan="3" className="py-6 text-center text-slate-500">No recent shipments found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default Dashboard;
