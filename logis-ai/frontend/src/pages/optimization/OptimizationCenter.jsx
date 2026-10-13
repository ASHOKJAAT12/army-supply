import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import optimizationService from '../../services/optimizationService';
import { Network, Truck, Package, Play, CheckCircle, Navigation, ShieldAlert, Zap, ServerCrash } from 'lucide-react';
import { toast } from 'react-hot-toast';

const OptimizationCenter = () => {
    const [locations, setLocations] = useState([]);
    const [shipments, setShipments] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [history, setHistory] = useState([]);

    const [sourceLoc, setSourceLoc] = useState('');
    const [selectedShipments, setSelectedShipments] = useState([]);
    const [selectedVehicles, setSelectedVehicles] = useState([]);
    const [preset, setPreset] = useState('balanced');
    const [weights, setWeights] = useState({ distanceWeight: 20, timeWeight: 20, riskWeight: 25, delayWeight: 20, efficiencyWeight: 5, priorityWeight: 10 });

    const [running, setRunning] = useState(false);
    const [result, setResult] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [locRes, shpRes, vehRes, histRes] = await Promise.all([
                api.get('/api/locations'),
                api.get('/api/shipments'),
                api.get('/api/vehicles'),
                optimizationService.getHistory()
            ]);
            setLocations(locRes.data.data.filter(l => l.type !== 'destination'));
            setShipments(shpRes.data.data.filter(s => ['planned', 'pending'].includes(s.status)));
            setVehicles(vehRes.data.data.filter(v => ['available', 'idle', 'in_transit'].includes(v.status)));
            if (histRes && histRes.data) setHistory(histRes.data);

            // Auto-select first source warehouse if exists
            const sources = locRes.data.data.filter(l => l.type !== 'destination');
            if (sources.length > 0) setSourceLoc(sources[0]._id);
        } catch (error) {
            console.error(error);
        }
    };

    const handlePresetChange = (e) => {
        const val = e.target.value;
        setPreset(val);
        if (val === 'balanced') setWeights({ distanceWeight: 20, timeWeight: 20, riskWeight: 25, delayWeight: 20, efficiencyWeight: 5, priorityWeight: 10 });
        if (val === 'fastest') setWeights({ distanceWeight: 10, timeWeight: 50, riskWeight: 10, delayWeight: 20, efficiencyWeight: 0, priorityWeight: 10 });
        if (val === 'lowestRisk') setWeights({ distanceWeight: 10, timeWeight: 10, riskWeight: 60, delayWeight: 10, efficiencyWeight: 0, priorityWeight: 10 });
        if (val === 'shortestDistance') setWeights({ distanceWeight: 60, timeWeight: 10, riskWeight: 10, delayWeight: 10, efficiencyWeight: 0, priorityWeight: 10 });
    };

    const executeRun = async () => {
        if (!sourceLoc) return toast.error("Select a source location");
        if (selectedShipments.length === 0) return toast.error("Select at least one shipment");
        if (selectedVehicles.length === 0) return toast.error("Select at least one vehicle");

        setRunning(true);
        setErrorMsg('');
        setResult(null);

        try {
            const payload = {
                sourceLocationId: sourceLoc,
                shipmentIds: selectedShipments,
                vehicleIds: selectedVehicles,
                objective: weights
            };

            const res = await optimizationService.runOptimization(payload);

            if (res.success && res.data) {
                setResult(res.data);
                toast.success("Optimization plan generated successfully");
                fetchData(); // refresh history
            }
        } catch (err) {
            console.error(err);
            if (err.response && err.response.data) {
                setErrorMsg(err.response.data.message);
                toast.error(err.response.data.message);
            } else {
                setErrorMsg("Advanced optimization service unavailable or failed.");
                toast.error("Optimizer encountered an error");
            }
        } finally {
            setRunning(false);
        }
    };

    const submitApply = async (id) => {
        try {
            await optimizationService.applyOptimization(id);
            toast.success("Logistics Plan Assigments Applied!");
            fetchData();
            setResult(prev => ({ ...prev, status: 'applied' }));
        } catch (err) {
            if (err.response) toast.error(err.response.data.message);
            else toast.error("Apply failed");
        }
    };

    // Derived states
    const totalSelectedShipmentsLoad = shipments.filter(s => selectedShipments.includes(s._id)).reduce((acc, curr) => acc + 500, 0); // demo 500 fixed weight
    const totalSelectedVehicleCapacity = vehicles.filter(v => selectedVehicles.includes(v._id)).reduce((acc, curr) => acc + curr.capacity, 0);

    return (
        <div className="p-6 text-white max-w-7xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold flex items-center gap-3">
                <Network className="text-blue-500 w-8 h-8" />
                Logistics Optimization Center
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Control Panel */}
                <div className="lg:col-span-1 bg-gray-800 rounded-xl p-5 shadow-lg space-y-4 border border-gray-700">
                    <h2 className="text-xl font-bold text-gray-200 border-b border-gray-700 pb-2">Configuration</h2>

                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-400">Source Warehouse</label>
                        <select className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white" value={sourceLoc} onChange={e => setSourceLoc(e.target.value)}>
                            {locations.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-400">Optimization Goal (Weights)</label>
                        <select className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white" value={preset} onChange={handlePresetChange}>
                            <option value="balanced">Balanced</option>
                            <option value="fastest">Fastest Time</option>
                            <option value="lowestRisk">Lowest Risk</option>
                            <option value="shortestDistance">Shortest Distance</option>
                        </select>
                    </div>

                    <div className="bg-gray-900 p-3 rounded text-xs space-y-1 font-mono text-gray-400">
                        <div className="flex justify-between"><span>Distance:</span><span className="text-blue-400">{weights.distanceWeight}%</span></div>
                        <div className="flex justify-between"><span>Time:</span><span className="text-blue-400">{weights.timeWeight}%</span></div>
                        <div className="flex justify-between"><span>Risk:</span><span className="text-red-400">{weights.riskWeight}%</span></div>
                        <div className="flex justify-between"><span>Priority Ops:</span><span className="text-orange-400">{weights.priorityWeight}%</span></div>
                    </div>

                    <div className="pt-2">
                        <label className="block text-sm font-medium mb-1 text-gray-400">Select Shipments ({selectedShipments.length}/{shipments.length})</label>
                        <div className="max-h-32 overflow-y-auto bg-gray-900 border border-gray-700 rounded p-2 text-sm space-y-1">
                            {shipments.map(s => (
                                <label key={s._id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-800 p-1 rounded">
                                    <input type="checkbox" className="rounded bg-gray-700 border-gray-600"
                                        checked={selectedShipments.includes(s._id)}
                                        onChange={(e) => {
                                            if (e.target.checked) setSelectedShipments([...selectedShipments, s._id]);
                                            else setSelectedShipments(selectedShipments.filter(id => id !== s._id));
                                        }}
                                    />
                                    <span className="truncate">{s.shipmentNumber} → {s.destination?.name || 'Dest'} ({s.priority})</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="pt-2">
                        <label className="block text-sm font-medium mb-1 text-gray-400">Select Vehicles ({selectedVehicles.length}/{vehicles.length})</label>
                        <div className="max-h-32 overflow-y-auto bg-gray-900 border border-gray-700 rounded p-2 text-sm space-y-1">
                            {vehicles.map(v => (
                                <label key={v._id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-800 p-1 rounded">
                                    <input type="checkbox" className="rounded bg-gray-700 border-gray-600"
                                        checked={selectedVehicles.includes(v._id)}
                                        onChange={(e) => {
                                            if (e.target.checked) setSelectedVehicles([...selectedVehicles, v._id]);
                                            else setSelectedVehicles(selectedVehicles.filter(id => id !== v._id));
                                        }}
                                    />
                                    <span className="truncate">{v.registrationNumber} ({v.type}) Cap: {v.capacity}kg</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="pt-2 text-xs">
                        <div className={`p-2 rounded border ${totalSelectedShipmentsLoad > totalSelectedVehicleCapacity ? 'bg-red-900/40 border-red-500/50 text-red-300' : 'bg-green-900/40 border-green-500/50 text-green-300'}`}>
                            Required: {totalSelectedShipmentsLoad}kg | Available: {totalSelectedVehicleCapacity}kg
                            {totalSelectedShipmentsLoad > totalSelectedVehicleCapacity && (
                                <p className="mt-1 font-bold">Warning: Capacity insufficient!</p>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={executeRun}
                        disabled={running}
                        className="w-full mt-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3 rounded shadow-lg flex items-center justify-center gap-2 transition-all">
                        {running ? <Zap className="animate-pulse" /> : <Play />}
                        {running ? 'OPTIMIZING...' : 'RUN AI OPTIMIZATION'}
                    </button>
                    {errorMsg && (
                        <p className="text-red-400 text-xs mt-2 text-center bg-red-900/20 p-2 rounded border border-red-800 flex items-center justify-center gap-1">
                            <ServerCrash size={14} /> {errorMsg}
                        </p>
                    )}
                </div>

                {/* Output Panel */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Active Result */}
                    {result ? (
                        <div className="bg-gray-800 rounded-xl p-5 shadow-lg border border-gray-700 h-full">
                            <div className="flex justify-between items-center border-b border-gray-700 pb-3 mb-4">
                                <h2 className="text-2xl font-bold flex items-center gap-2 text-blue-400">
                                    <CheckCircle /> RECOMMENDED PLAN
                                </h2>

                                {result.status !== 'applied' ? (
                                    <button
                                        onClick={() => submitApply(result._id)}
                                        className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded shadow font-bold text-sm">
                                        APPLY PLAN ASSIGNMENTS
                                    </button>
                                ) : (
                                    <span className="bg-green-900/50 text-green-500 border border-green-500/50 px-3 py-1 rounded font-bold text-sm uppercase">
                                        Applied & Active
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-4 gap-4 mb-6">
                                <div className="bg-gray-900 p-3 rounded-lg border border-gray-700 text-center">
                                    <p className="text-gray-400 text-xs mb-1">Assigned vs Requested</p>
                                    <p className="text-xl font-bold text-green-400">{result.result?.vehicleAssignments?.length} / {result.shipmentIds.length}</p>
                                </div>
                                <div className="bg-gray-900 p-3 rounded-lg border border-gray-700 text-center">
                                    <p className="text-gray-400 text-xs mb-1">Vehicles Dispatched</p>
                                    <p className="text-xl font-bold text-blue-400">{result.result?.summary?.totalVehiclesUsed || 0}</p>
                                </div>
                                <div className="bg-gray-900 p-3 rounded-lg border border-gray-700 text-center">
                                    <p className="text-gray-400 text-xs mb-1">Combined Distance</p>
                                    <p className="text-xl font-bold text-gray-200">
                                        {Math.round(result.result?.vehicleAssignments.reduce((acc, curr) => acc + curr.distanceKm, 0) || 0)} <span className="text-sm">km</span>
                                    </p>
                                </div>
                                <div className="bg-gray-900 p-3 rounded-lg border border-gray-700 text-center">
                                    <p className="text-gray-400 text-xs mb-1">Avg Route Risk</p>
                                    <p className="text-xl font-bold text-orange-400">
                                        {Math.round((result.result?.vehicleAssignments.reduce((acc, curr) => acc + curr.routeRiskScore, 0) || 0) / (result.result?.vehicleAssignments.length || 1))} <span className="text-sm text-gray-500">/100</span>
                                    </p>
                                </div>
                            </div>

                            <h3 className="font-bold text-gray-300 mb-2">Assignments & Explainability</h3>
                            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                                {result.result?.vehicleAssignments.map((assign, i) => {
                                    const shp = shipments.find(s => s._id === assign.shipmentId) || shipments.find(s => s._id === assign.shipmentId._id);
                                    const veh = vehicles.find(v => v._id === assign.vehicleId) || vehicles.find(v => v._id === assign.vehicleId._id);

                                    return (
                                        <div key={i} className="bg-gray-900 p-4 rounded-lg border border-gray-700 flex flex-col md:flex-row justify-between gap-4">
                                            <div className="flex gap-4">
                                                <div className="flex flex-col items-center justify-center p-3 bg-gray-800 rounded">
                                                    <Truck size={24} className="text-blue-400" />
                                                    <span className="text-xs font-bold mt-1">{veh?.registrationNumber || 'VEH'}</span>
                                                    <span className="text-[10px] text-gray-500">{assign.vehicleUtilization}% Full</span>
                                                </div>
                                                <div className="flex flex-col items-center justify-center text-gray-500">
                                                    <Navigation size={16} />
                                                    <span className="text-xs">{Math.round(assign.distanceKm)}km</span>
                                                </div>
                                                <div className="flex flex-col items-center justify-center p-3 bg-gray-800 rounded">
                                                    <Package size={24} className="text-orange-400" />
                                                    <span className="text-xs font-bold mt-1 text-center truncate max-w-[80px]">{shp?.destination?.name || 'Dest'}</span>
                                                    <span className="text-[10px] uppercase text-gray-500">{shp?.priority || 'std'}</span>
                                                </div>
                                            </div>

                                            <div className="flex-1 text-sm bg-gray-800 p-3 rounded">
                                                <p className="font-bold border-b border-gray-700 pb-1 mb-1 text-blue-300">Why this plan?</p>
                                                <ul className="text-xs space-y-1 text-gray-300">
                                                    <li><span className="font-semibold text-gray-400">Vehicle:</span> {assign.explanation?.vehicleReason}</li>
                                                    <li><span className="font-semibold text-gray-400">Route:</span> {assign.explanation?.routeReason}</li>
                                                    <li><span className="font-semibold text-gray-400">Priority:</span> {assign.explanation?.priorityReason}</li>
                                                </ul>
                                            </div>
                                        </div>
                                    )
                                })}

                                {result.result?.unassignedShipments && result.result.unassignedShipments.length > 0 && (
                                    <div className="mt-4 p-4 border border-red-900/50 bg-red-900/20 rounded-lg">
                                        <h3 className="font-bold text-red-500 flex items-center gap-2 mb-2"><ShieldAlert size={18} /> UNASSIGNED SHIPMENTS</h3>
                                        {result.result.unassignedShipments.map((unassig, idx) => {
                                            const uShp = shipments.find(s => s._id === unassig.shipmentId);
                                            return (
                                                <div key={idx} className="text-sm text-red-300 flex justify-between bg-red-900/30 p-2 rounded mb-1">
                                                    <span>{uShp?.shipmentNumber || unassig.shipmentId}</span>
                                                    <span className="italic">{unassig.reason}</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gray-800/50 rounded-xl p-5 shadow-lg border border-gray-700 h-full flex flex-col items-center justify-center text-gray-500 min-h-[400px]">
                            <Network size={64} className="mb-4 opacity-30" />
                            <p className="text-xl">Awaiting Optimization Run...</p>
                            <p className="text-sm mt-2 max-w-md text-center">Select your source warehouse, load in your pending shipments, and pick the available vehicle fleet to trigger the OR-Tools AI Solver.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Run History */}
            <div className="mt-8 bg-gray-800 rounded-xl p-5 shadow-lg border border-gray-700">
                <h2 className="text-xl font-bold text-gray-200 border-b border-gray-700 pb-2 mb-4">Recent Optimization History</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-900 text-gray-400 text-xs uppercase">
                            <tr>
                                <th className="p-3 rounded-tl">Run ID</th>
                                <th className="p-3">Date</th>
                                <th className="p-3 border-l border-gray-800">Shipments</th>
                                <th className="p-3">Vehicles</th>
                                <th className="p-3 border-l border-gray-800 text-center">Status</th>
                                <th className="p-3 rounded-tr text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700 text-sm">
                            {history.length > 0 ? history.map(h => (
                                <tr key={h._id} className="hover:bg-gray-750">
                                    <td className="p-3 font-mono text-blue-400">{h.optimizationId}</td>
                                    <td className="p-3 text-gray-400">{new Date(h.createdAt).toLocaleString()}</td>
                                    <td className="p-3">{h.shipmentIds?.length || 0} Target(s)</td>
                                    <td className="p-3">{h.vehicleIds?.length || 0} Pool</td>
                                    <td className="p-3 text-center">
                                        <span className={`px-2 py-1 rounded text-xs uppercase font-bold 
                                            ${h.status === 'applied' ? 'bg-green-900/50 text-green-500' :
                                                h.status === 'completed' ? 'bg-blue-900/50 text-blue-400' :
                                                    'bg-gray-700 text-gray-300'}`}>
                                            {h.status}
                                        </span>
                                    </td>
                                    <td className="p-3 text-right">
                                        <button
                                            onClick={async () => {
                                                const res = await optimizationService.getOptimizationResult(h._id);
                                                setResult(res.data);
                                            }}
                                            className="text-gray-300 hover:text-white underline text-xs">
                                            Restore View
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="6" className="p-6 text-center text-gray-500">No optimization history found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
};

export default OptimizationCenter;
