import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import riskService from '../services/riskService';
import optimizationService from '../services/optimizationService';
import api from '../services/api';

const Shipments = () => {
    const [shipments, setShipments] = useState([]);
    const [riskMap, setRiskMap] = useState({});
    const [activeOpts, setActiveOpts] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchShipments();
    }, []);

    const fetchShipments = async () => {
        try {
            setLoading(true);
            const [res, riskRes, optRes] = await Promise.all([
                api.get('/api/shipments'),
                riskService.getRiskShipments().catch(() => ({ success: false })),
                optimizationService.getHistory().catch(() => ({ success: false }))
            ]);
            setShipments(res.data.data);

            if (riskRes && riskRes.success) {
                const map = {};
                riskRes.data.forEach(r => map[r.entityId] = r);
                setRiskMap(map);
            }

            if (optRes && optRes.success) {
                const pendingOpts = optRes.data.filter(o => o.status === 'completed');
                const oMap = {};
                for (const opt of pendingOpts) {
                    const detail = await optimizationService.getOptimizationResult(opt._id).catch(() => null);
                    if (detail && detail.data && detail.data.result) {
                        detail.data.result.vehicleAssignments.forEach(assign => {
                            const shpId = assign.shipmentId._id || assign.shipmentId;
                            oMap[shpId] = { ...assign, runId: detail.data._id };
                        });
                    }
                }
                setActiveOpts(oMap);
            }

            setError(null);
        } catch (err) {
            setError('Failed to fetch shipments');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'planned': return 'bg-gray-700 text-gray-300 border border-gray-600';
            case 'ready': return 'bg-blue-900/50 text-blue-400 border border-blue-600/30';
            case 'dispatched': return 'bg-purple-900/50 text-purple-400 border border-purple-500/30';
            case 'in_transit': return 'bg-teal-900/50 text-teal-400 border border-teal-500/30';
            case 'delivered': return 'bg-green-900/50 text-green-400 border border-green-500/30';
            case 'cancelled': return 'bg-red-900/50 text-red-500 border border-red-500/30';
            default: return 'bg-gray-700 text-gray-400';
        }
    };

    if (loading) return <div className="p-6 text-white">Loading shipments...</div>;
    if (error) return <div className="p-6 text-red-500">{error}</div>;

    return (
        <div className="p-6 space-y-6 text-white max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-100">Live Shipments</h1>
                <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded shadow transition-all duration-200">
                    + Create Shipment
                </button>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-xl overflow-hidden mt-6">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-900 text-gray-400 uppercase text-xs tracking-wider">
                                <th className="px-6 py-4 border-b border-gray-700">Shipment No</th>
                                <th className="px-6 py-4 border-b border-gray-700">Source</th>
                                <th className="px-6 py-4 border-b border-gray-700">Destination</th>
                                <th className="px-6 py-4 border-b border-gray-700">Predictive Risk</th>
                                <th className="px-6 py-4 border-b border-gray-700">Priority</th>
                                <th className="px-6 py-4 border-b border-gray-700 text-center">Status</th>
                                <th className="px-6 py-4 border-b border-gray-700">Updates</th>
                                <th className="px-6 py-4 border-b border-gray-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {shipments.length > 0 ? shipments.map((shp) => (
                                <tr key={shp._id} className="hover:bg-gray-750 transition-colors duration-150">
                                    <td className="px-6 py-4 font-mono font-bold text-sm tracking-wider text-blue-300">
                                        {shp.shipmentNumber}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium">
                                        {shp.sourceLocation?.name}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium">
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-500">→</span>
                                            {shp.destinationLocation?.name}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {riskMap[shp._id] ? (
                                            <div className="flex flex-col items-start gap-1">
                                                <span className={`px-2 py-0.5 shadow flex-shrink-0 whitespace-nowrap rounded text-[10px] font-bold ${riskMap[shp._id].riskLevel === 'critical' ? 'bg-red-500 text-white' : riskMap[shp._id].riskLevel === 'high' ? 'bg-orange-500 text-white' : 'bg-green-600 text-white'}`}>
                                                    {riskMap[shp._id].riskLevel.toUpperCase()}
                                                </span>
                                                <Link to={`/risk/${riskMap[shp._id]._id}`} className="text-blue-400 font-bold text-xs hover:underline">Analysis</Link>
                                            </div>
                                        ) : (
                                            <span className="text-gray-500 text-xs">Unassessed</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`uppercase font-bold text-xs ${shp.priority === 'critical' ? 'text-red-500' : shp.priority === 'high' ? 'text-orange-400' : 'text-blue-400'}`}>
                                            {shp.priority}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold shadow-sm inline-flex ${getStatusStyle(shp.status)}`}>
                                            {shp.status.replace('_', ' ').toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-gray-400">
                                        {activeOpts[shp._id] ? (
                                            <div className="bg-blue-900/40 p-2 rounded border border-blue-700/50">
                                                <p className="text-blue-300 font-bold mb-1">AI Recommendation</p>
                                                <p>Vehicle: {activeOpts[shp._id].vehicleId.registrationNumber || 'Assigned'}</p>
                                                <p>Dist: {Math.round(activeOpts[shp._id].distanceKm)}km</p>
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            await optimizationService.applyOptimization(activeOpts[shp._id].runId);
                                                            fetchShipments();
                                                        } catch (e) {
                                                            alert("Failed to apply optimization or stale");
                                                        }
                                                    }}
                                                    className="mt-1 bg-green-600 hover:bg-green-500 text-white px-2 py-0.5 rounded text-[10px] uppercase font-bold">
                                                    Apply Rec.
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                {shp.dispatchDate && <div>Dispatch: {new Date(shp.dispatchDate).toLocaleDateString()}</div>}
                                                {shp.actualArrival && <div className="text-green-400">Arrived: {new Date(shp.actualArrival).toLocaleDateString()}</div>}
                                            </>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                        <Link to={`/map`} className="text-blue-400 hover:text-blue-300 hover:underline mr-4 font-medium transition-colors">
                                            View on Map
                                        </Link>
                                        <button className="text-blue-400 hover:text-blue-300 transition-colors">Update</button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                                        No active shipments found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Shipments;
