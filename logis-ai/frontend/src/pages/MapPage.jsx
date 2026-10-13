import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import api from '../services/api';
import riskService from '../services/riskService';
import optimizationService from '../services/optimizationService';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';

// --- Custom Icons ---
const createDivIcon = (htmlContent, colorClass) => {
    return L.divIcon({
        html: `<div class="flex items-center justify-center w-8 h-8 rounded-full ${colorClass} shadow-lg border-2 border-slate-900 shadow-black/50 text-white font-bold text-lg">${htmlContent}</div>`,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
    });
};

const icons = {
    warehouse: createDivIcon('<div class="w-4 h-4 bg-white"></div>', 'bg-blue-600'), // Square internal
    depot: createDivIcon('<div class="w-4 h-4 bg-white rotate-45 transform"></div>', 'bg-orange-500'), // Diamond
    forward_base: createDivIcon('<div class="w-4 h-4 bg-white rounded-full"></div>', 'bg-green-600'), // Circle
    vehicle: createDivIcon('🚛', 'bg-slate-700 border-yellow-500'),
    device: createDivIcon('📡', 'bg-slate-900 border-emerald-500'),
    planned_route: L.divIcon({ html: `<div class="w-3 h-3 bg-red-500 rounded-full border-2 border-white"></div>`, className: '' })
};

// Component to dynamically fit bounds
const FitBounds = ({ markers }) => {
    const map = useMap();
    useEffect(() => {
        if (markers && markers.length > 0) {
            const group = new L.featureGroup(markers.map(m => L.marker([m.lat, m.lng])));
            map.fitBounds(group.getBounds(), { padding: [50, 50] });
        }
    }, [markers, map]);
    return null;
};

const MapPage = () => {
    const [locations, setLocations] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [shipments, setShipments] = useState([]);
    const [devices, setDevices] = useState([]);
    const [riskMap, setRiskMap] = useState({ locations: {}, shipments: {} });
    const [loading, setLoading] = useState(true);

    const { lastEvent } = useSocket();

    // UI State
    const [selectedItem, setSelectedItem] = useState(null); // { type: 'location'|'vehicle'|'shipment'|'route', data: {} }
    const navigate = useNavigate();
    const routerLocation = useLocation();
    const searchParams = new URLSearchParams(routerLocation.search);
    const targetLocId = searchParams.get('location');

    // Filter Logic
    const [showLocations, setShowLocations] = useState(true);
    const [showVehicles, setShowVehicles] = useState(true);
    const [showShipments, setShowShipments] = useState(true);
    const [showOptimizedRoutes, setShowOptimizedRoutes] = useState(true);
    const [showDevices, setShowDevices] = useState(true);
    const [optimizedLines, setOptimizedLines] = useState([]);

    // Planner State
    const [isPlannerOpen, setIsPlannerOpen] = useState(false);
    const [planSource, setPlanSource] = useState('');
    const [planDest, setPlanDest] = useState('');
    const [calculatedRoute, setCalculatedRoute] = useState(null);
    const [calculatingRoute, setCalculatingRoute] = useState(false);

    useEffect(() => {
        const fetchOverview = async () => {
            try {
                const res = await api.get('/api/map/overview');
                setLocations(res.data.data.locations || []);
                setVehicles(res.data.data.vehicles || []);
                setShipments(res.data.data.shipments || []);

                try {
                    const devRes = await api.get('/api/devices');
                    // We only want tracking devices or sensors with coordinates
                    setDevices(devRes.data.data);
                } catch (e) { }

                // Fetch risks in parallel
                try {
                    const [locRisks, shipRisks, optRes] = await Promise.all([
                        riskService.getRiskLocations(),
                        riskService.getRiskShipments(),
                        optimizationService.getHistory().catch(() => ({ success: false }))
                    ]);
                    const rm = { locations: {}, shipments: {} };
                    if (locRisks.success) locRisks.data.forEach(r => rm.locations[r.entityId] = r);
                    if (shipRisks.success) shipRisks.data.forEach(r => rm.shipments[r.entityId] = r);
                    setRiskMap(rm);

                    if (optRes && optRes.success) {
                        const pendingOpt = optRes.data.find(o => o.status === 'completed');
                        if (pendingOpt) {
                            const detail = await optimizationService.getOptimizationResult(pendingOpt._id).catch(() => null);
                            if (detail && detail.data && detail.data.result) {
                                const lines = detail.data.result.vehicleAssignments.map(assign => {
                                    const shp = res.data.data.shipments.find(s => s._id === (assign.shipmentId._id || assign.shipmentId));
                                    if (shp && shp.sourceLocation && shp.destinationLocation) {
                                        return {
                                            id: assign._id || Math.random(),
                                            path: [
                                                [shp.sourceLocation.latitude, shp.sourceLocation.longitude],
                                                [shp.destinationLocation.latitude, shp.destinationLocation.longitude]
                                            ],
                                            vehicle: assign.vehicleId
                                        };
                                    }
                                    return null;
                                }).filter(Boolean);
                                setOptimizedLines(lines);
                            }
                        }
                    }
                } catch (e) {
                    console.error('Failed to load risk and opt setup', e);
                }

                // If loaded with a location query param, auto-select it
                if (targetLocId) {
                    const l = res.data.data.locations.find(x => x._id === targetLocId);
                    if (l) setSelectedItem({ type: 'location', data: l });
                }
            } catch (err) {
                console.error('Failed to fetch map data', err);
            } finally {
                setLoading(false);
            }
        };
        fetchOverview();
    }, [targetLocId]);

    useEffect(() => {
        if (lastEvent && lastEvent.type === 'telemetry_received') {
            const tel = lastEvent.data;
            if (tel.measurements && tel.measurements.latitude) {
                setDevices(prev => prev.map(d => {
                    if (d._id === tel.device) {
                        return { ...d, location: { ...d.location, latitude: tel.measurements.latitude, longitude: tel.measurements.longitude } };
                    }
                    return d;
                }));
            }
        }
    }, [lastEvent]);

    const handleCalculateRoute = async () => {
        if (!planSource || !planDest) return alert("Select source and destination");
        try {
            setCalculatingRoute(true);
            const res = await api.post('/api/routes/calculate', {
                sourceLocationId: planSource,
                destinationLocationId: planDest
            });
            setCalculatedRoute(res.data.data);
            setSelectedItem({ type: 'route', data: res.data.data }); // Open Panel automatically
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to calculate route.');
        } finally {
            setCalculatingRoute(false);
        }
    };

    const filteredLocations = showLocations ? locations.filter(loc => loc.latitude != null && loc.longitude != null) : [];

    let fitMarkers = [];
    if (calculatedRoute) {
        fitMarkers = [
            { lat: calculatedRoute.source.latitude, lng: calculatedRoute.source.longitude },
            { lat: calculatedRoute.destination.latitude, lng: calculatedRoute.destination.longitude }
        ];
    } else {
        fitMarkers = locations.filter(l => l.latitude && l.longitude).map(l => ({ lat: l.latitude, lng: l.longitude }));
    }

    if (loading) return <div className="p-6 text-white text-center mt-10">Loading GIS Network...</div>;

    const renderSidePanelContent = () => {
        if (!selectedItem) return null;
        if (selectedItem.type === 'location') {
            const loc = selectedItem.data;
            return (
                <div className="space-y-4 text-sm text-slate-300">
                    <div>
                        <div className="text-xs text-slate-500 uppercase tracking-widest">Name</div>
                        <div className="text-white font-medium text-base">{loc.name} ({loc.code})</div>
                    </div>
                    <div>
                        <div className="text-xs text-slate-500 uppercase tracking-widest">Type</div>
                        <div className="capitalize">{loc.type.replace('_', ' ')}</div>
                    </div>
                    <div>
                        <div className="text-xs text-slate-500 uppercase tracking-widest">Status / Priority</div>
                        <div className="flex gap-2 mt-1">
                            <span className="badge-green">{loc.status}</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${loc.priority === 'critical' ? 'bg-red-900/50 text-red-500' : 'bg-blue-900/50 text-blue-400'}`}>
                                {loc.priority.toUpperCase()}
                            </span>
                        </div>
                    </div>
                    {riskMap.locations[loc._id] && (
                        <div className="mt-4 p-3 rounded bg-slate-800 border border-slate-700">
                            <div className="text-xs text-slate-500 uppercase tracking-widest mb-1 flex items-center justify-between">
                                <span>Predictive Risk</span>
                                <span className="text-[10px] text-slate-400">Phase 5</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`text-xl font-bold ${riskMap.locations[loc._id].riskLevel === 'critical' || riskMap.locations[loc._id].riskLevel === 'high' ? 'text-red-500' : 'text-orange-400'}`}>
                                    {riskMap.locations[loc._id].overallScore}
                                </span>
                                <span className="text-xs uppercase font-bold text-slate-300 bg-slate-700 px-2 rounded-full">{riskMap.locations[loc._id].riskLevel}</span>
                            </div>
                            <button onClick={() => navigate(`/risk/${riskMap.locations[loc._id]._id}`)} className="text-blue-400 text-xs mt-2 hover:underline font-semibold block w-full text-center py-1 mt-3 bg-slate-900 rounded">View Full Risk Profile</button>
                        </div>
                    )}
                    <button
                        className="w-full mt-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded shadow border border-slate-600 transition-colors"
                        onClick={() => navigate(`/locations`)}
                    >
                        View Locations Fleet
                    </button>
                    <button
                        className="w-full mt-2 py-2 bg-brand-700 hover:bg-brand-600 text-white rounded shadow transition-colors"
                        onClick={() => {
                            setIsPlannerOpen(true);
                            setPlanSource(loc._id);
                            setSelectedItem(null);
                        }}
                    >
                        Plan Route From Here
                    </button>
                </div>
            );
        }
        if (selectedItem.type === 'vehicle') {
            const veh = selectedItem.data;
            return (
                <div className="space-y-4 text-sm text-slate-300">
                    <div>
                        <div className="text-xs text-slate-500 uppercase tracking-widest">Vehicle No.</div>
                        <div className="text-white font-medium text-base font-mono">{veh.vehicleNumber}</div>
                    </div>
                    <div>
                        <div className="text-xs text-slate-500 uppercase tracking-widest">Status / Capacity</div>
                        <div className="flex gap-2 items-center mt-1">
                            <span className="badge-slate uppercase">{veh.status.replace('_', ' ')}</span>
                            <span className="text-white">{veh.capacity} {veh.capacityUnit}</span>
                        </div>
                    </div>
                    <button
                        className="w-full mt-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded shadow border border-slate-600 transition-colors"
                        onClick={() => navigate(`/vehicles`)}
                    >
                        View Vehicle Fleet
                    </button>
                </div>
            );
        }
        if (selectedItem.type === 'shipment') {
            const shp = selectedItem.data;
            return (
                <div className="space-y-4 text-sm text-slate-300">
                    <div>
                        <div className="text-xs text-slate-500 uppercase tracking-widest">Shipment No.</div>
                        <div className="text-brand-400 font-bold font-mono text-base">{shp.shipmentNumber}</div>
                    </div>
                    <div>
                        <div className="text-xs text-slate-500 uppercase tracking-widest">Route</div>
                        <div className="text-white mt-1">
                            {shp.sourceLocation.name} <br />
                            <span className="text-slate-500">↓</span><br />
                            {shp.destinationLocation.name}
                        </div>
                    </div>
                    <div className="flex justify-between">
                        <div>
                            <div className="text-xs text-slate-500 uppercase tracking-widest">Priority</div>
                            <span className={`uppercase font-bold ${shp.priority === 'critical' ? 'text-red-500' : 'text-blue-400'}`}>{shp.priority}</span>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-slate-500 uppercase tracking-widest">Status</div>
                            <span className="uppercase text-amber-400 font-bold">{shp.status}</span>
                        </div>
                    </div>
                    {riskMap.shipments[shp._id] && (
                        <div className="mt-4 p-3 rounded bg-slate-800 border border-slate-700">
                            <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Predictive Risk</div>
                            <div className="flex items-center gap-2">
                                <span className={`text-xl font-bold ${riskMap.shipments[shp._id].riskLevel === 'critical' || riskMap.shipments[shp._id].riskLevel === 'high' ? 'text-red-500' : 'text-orange-400'}`}>
                                    {riskMap.shipments[shp._id].overallScore}
                                </span>
                                <span className="text-xs uppercase font-bold text-slate-300 bg-slate-700 px-2 rounded-full">{riskMap.shipments[shp._id].riskLevel}</span>
                            </div>
                            <p className="text-xs mt-2 text-slate-400">{riskMap.shipments[shp._id].factors?.[0]}</p>
                            <button onClick={() => navigate(`/risk/${riskMap.shipments[shp._id]._id}`)} className="text-blue-400 text-xs mt-2 hover:underline block font-semibold text-center w-full bg-slate-900 py-1 rounded">View Full Risk Profile</button>
                        </div>
                    )}
                </div>
            );
        }
        if (selectedItem.type === 'route') {
            const route = selectedItem.data;
            return (
                <div className="space-y-4 text-sm text-slate-300">
                    <div className="p-3 bg-red-900/20 border border-red-500/30 rounded text-red-400 text-xs text-center font-medium">
                        Route calculation is currently using demo geometry.
                    </div>
                    <div>
                        <div className="text-xs text-slate-500 uppercase tracking-widest">Distance</div>
                        <div className="text-white font-medium text-xl">{route.distanceKm} <span className="text-sm text-slate-400">km</span></div>
                    </div>
                    <div>
                        <div className="text-xs text-slate-500 uppercase tracking-widest">Est. Travel Time</div>
                        <div className="text-white font-medium text-xl">
                            {Math.floor(route.estimatedTravelTimeMinutes / 60)}h {route.estimatedTravelTimeMinutes % 60}m
                        </div>
                    </div>
                    <div className="pt-2 border-t border-slate-700">
                        <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Route Risk Assessment</div>
                        <div className="flex items-center gap-3">
                            <span className={`text-2xl font-bold ${route.riskScore > 60 ? 'text-red-500' : route.riskScore > 30 ? 'text-orange-400' : 'text-brand-400'}`}>
                                {route.riskScore}
                            </span>
                            <span className="uppercase font-bold text-xs bg-slate-800 px-2 rounded-full border border-slate-600">
                                {route.riskLevel}
                            </span>
                        </div>
                    </div>
                    <div>
                        <ul className="list-disc pl-5 text-slate-400 text-xs space-y-1">
                            {route.riskFactors && route.riskFactors.map((f, i) => <li key={i}>{f}</li>)}
                        </ul>
                    </div>

                    <button
                        className="w-full mt-4 py-2 bg-brand-700 hover:bg-brand-600 text-white rounded shadow transition-colors font-semibold"
                        onClick={() => navigate('/shipments')} // Demo flow directly to shipments
                    >
                        Create Shipment
                    </button>
                    <button
                        className="w-full mt-2 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded shadow border border-slate-600 transition-colors"
                        onClick={() => setCalculatedRoute(null)}
                    >
                        Clear Route
                    </button>
                </div>
            );
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)] -mt-6 -mx-6 relative">
            {/* Top Filter Bar */}
            <div className="bg-slate-900 border-b border-slate-700 p-4 flex justify-between items-center text-slate-300">
                <div className="flex gap-6 items-center text-sm">
                    <span className="font-bold text-white uppercase tracking-wider text-xs bg-brand-900 px-2 py-1 rounded">GIS Layers</span>
                    <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                        <input type="checkbox" checked={showLocations} onChange={e => setShowLocations(e.target.checked)} className="accent-brand-500" /> Locations
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                        <input type="checkbox" checked={showVehicles} onChange={e => setShowVehicles(e.target.checked)} className="accent-brand-500" /> Vehicles
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                        <input type="checkbox" checked={showShipments} onChange={e => setShowShipments(e.target.checked)} className="accent-brand-500" /> Active Routes
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer hover:text-white text-orange-400 font-semibold">
                        <input type="checkbox" checked={showOptimizedRoutes} onChange={e => setShowOptimizedRoutes(e.target.checked)} className="accent-orange-500" /> AI Plan
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer hover:text-white text-emerald-400 font-semibold">
                        <input type="checkbox" checked={showDevices} onChange={e => setShowDevices(e.target.checked)} className="accent-emerald-500" /> IoT Network
                    </label>
                </div>
                <div>
                    <button
                        onClick={() => setIsPlannerOpen(!isPlannerOpen)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors shadow ${isPlannerOpen ? 'bg-orange-500 text-white' : 'bg-slate-800 border border-slate-600 hover:bg-slate-700 text-slate-200'}`}
                    >
                        {isPlannerOpen ? 'Close Planner' : 'Plan Route'}
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex flex-1 relative overflow-hidden">
                <div className="flex-1 bg-slate-800 relative z-0">
                    <MapContainer
                        center={[20, 78]}
                        zoom={4}
                        style={{ height: '100%', width: '100%' }}
                        className="z-0"
                    >
                        <TileLayer
                            url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
                            attribution='Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ'
                        />
                        {fitMarkers.length > 0 && <FitBounds markers={fitMarkers} />}

                        {filteredLocations.map(loc => {
                            const risk = riskMap.locations[loc._id];
                            let riskIconColor = 'bg-blue-600';
                            if (risk) {
                                if (risk.riskLevel === 'critical' || risk.riskLevel === 'high') riskIconColor = 'bg-red-600 animate-pulse border-red-300';
                                else if (risk.riskLevel === 'medium') riskIconColor = 'bg-orange-500';
                                else riskIconColor = 'bg-green-600';
                            }
                            const iconHtml = loc.type === 'warehouse' ? '<div class="w-4 h-4 bg-white"></div>' :
                                loc.type === 'depot' ? '<div class="w-4 h-4 bg-white rotate-45 transform"></div>' :
                                    '<div class="w-4 h-4 bg-white rounded-full"></div>';
                            const locIcon = createDivIcon(iconHtml, riskIconColor);

                            return (
                                <Marker
                                    key={loc._id}
                                    position={[loc.latitude, loc.longitude]}
                                    icon={locIcon}
                                    eventHandlers={{ click: () => setSelectedItem({ type: 'location', data: loc }) }}
                                />
                            );
                        })}

                        {showVehicles && vehicles.map(veh => {
                            let lat, lng;
                            if (veh.currentGeoPoint?.coordinates) {
                                lng = veh.currentGeoPoint.coordinates[0];
                                lat = veh.currentGeoPoint.coordinates[1];
                            } else if (veh.currentLocation?.latitude) {
                                lat = veh.currentLocation.latitude + 0.002;
                                lng = veh.currentLocation.longitude + 0.002;
                            }
                            if (!lat || !lng) return null;

                            return (
                                <Marker
                                    key={veh._id}
                                    position={[lat, lng]}
                                    icon={icons.vehicle}
                                    eventHandlers={{ click: () => setSelectedItem({ type: 'vehicle', data: veh }) }}
                                />
                            );
                        })}

                        {/* Rendering Active Shipment Routes */}
                        {showShipments && shipments.map(shp => {
                            if (!shp.sourceLocation?.latitude || !shp.destinationLocation?.latitude) return null;
                            const path = [
                                [shp.sourceLocation.latitude, shp.sourceLocation.longitude],
                                [shp.destinationLocation.latitude, shp.destinationLocation.longitude]
                            ];
                            const isCritical = shp.priority === 'critical';
                            let color = '#3b82f6';
                            if (shp.status === 'in_transit') color = '#a855f7';

                            return (
                                <Polyline
                                    key={shp._id}
                                    positions={path}
                                    pathOptions={{
                                        color: isCritical ? '#ef4444' : color,
                                        weight: shp.status === 'in_transit' ? 4 : 2,
                                        dashArray: shp.status === 'in_transit' ? null : '4,8',
                                        opacity: 0.6
                                    }}
                                    eventHandlers={{ click: () => setSelectedItem({ type: 'shipment', data: shp }) }}
                                />
                            );
                        })}

                        {/* Rendering IoT Devices */}
                        {showDevices && devices.map(dev => {
                            let lat, lng;
                            if (dev.location && dev.location.latitude) {
                                lat = dev.location.latitude;
                                lng = dev.location.longitude;
                            }
                            if (!lat || !lng) return null;

                            return (
                                <Marker
                                    key={`dev-${dev._id}`}
                                    position={[lat, lng]}
                                    icon={icons.device}
                                >
                                    <Popup>
                                        <div className="text-slate-900 font-bold p-1">
                                            {dev.name}<br />
                                            <span className="text-xs font-normal capitalize">Type: {dev.deviceType.replace('_', ' ')}</span>
                                            <br /><span className="text-xs font-normal">Battery: {dev.batteryPercent}%</span>
                                        </div>
                                    </Popup>
                                </Marker>
                            )
                        })}

                        {/* Rendering Pending Optimization Plan */}
                        {showOptimizedRoutes && optimizedLines.map(line => (
                            <Polyline
                                key={line.id}
                                positions={line.path}
                                pathOptions={{
                                    color: '#f97316', // Orange
                                    weight: 4,
                                    dashArray: '5,10', // dashed line for AI plan
                                    opacity: 0.8
                                }}
                            />
                        ))}

                        {/* Rendering Planned/Calculated Route */}
                        {calculatedRoute && (
                            <Polyline
                                positions={[
                                    [calculatedRoute.source.latitude, calculatedRoute.source.longitude],
                                    [calculatedRoute.destination.latitude, calculatedRoute.destination.longitude]
                                ]}
                                pathOptions={{
                                    color: '#f97316', // Orange
                                    weight: 4,
                                    dashArray: '5,10', // dashed line for demo plan route
                                }}
                            />
                        )}
                    </MapContainer>

                    {/* Floating Route Planner Window */}
                    {isPlannerOpen && (
                        <div className="absolute top-4 left-4 z-[400] w-72 bg-slate-900 border border-slate-600 shadow-2xl rounded-lg overflow-hidden">
                            <div className="bg-slate-800 p-3 border-b border-slate-700">
                                <h3 className="font-bold text-white text-sm">Route Planner</h3>
                            </div>
                            <div className="p-4 space-y-4">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Source</label>
                                    <select
                                        className="w-full bg-slate-800 text-white text-sm border border-slate-700 rounded p-1.5 focus:border-brand-500 focus:outline-none"
                                        value={planSource}
                                        onChange={e => setPlanSource(e.target.value)}
                                    >
                                        <option value="">Select source...</option>
                                        {locations.map(l => (
                                            <option key={l._id} value={l._id}>{l.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="text-center text-slate-600 text-lg">↓</div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Destination</label>
                                    <select
                                        className="w-full bg-slate-800 text-white text-sm border border-slate-700 rounded p-1.5 focus:border-brand-500 focus:outline-none"
                                        value={planDest}
                                        onChange={e => setPlanDest(e.target.value)}
                                    >
                                        <option value="">Select destination...</option>
                                        {locations.map(l => (
                                            <option key={l._id} value={l._id}>{l.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <button
                                    onClick={handleCalculateRoute}
                                    disabled={calculatingRoute}
                                    className="w-full bg-brand-700 hover:bg-brand-600 disabled:opacity-50 text-white text-sm font-bold py-2 rounded shadow transition-colors"
                                >
                                    {calculatingRoute ? 'Calculating...' : 'Calculate Route'}
                                </button>
                            </div>
                        </div>
                    )}

                </div>

                {/* Side Information Panel */}
                <div className={`w-80 bg-slate-900 border-l border-slate-700 shadow-2xl p-5 overflow-y-auto transition-transform z-10 
                    ${selectedItem ? 'translate-x-0' : 'translate-x-full absolute right-0 top-0 h-full'}`}>
                    {selectedItem && (
                        <div>
                            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-700">
                                <h2 className="text-base font-bold text-white uppercase tracking-wider">{selectedItem.type} Details</h2>
                                <button onClick={() => setSelectedItem(null)} className="text-slate-400 hover:text-white bg-slate-800 p-1 rounded">✕</button>
                            </div>
                            {renderSidePanelContent()}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MapPage;
