import React, { useState, useEffect } from 'react';
import api from '../services/api';
import optimizationService from '../services/optimizationService';

const Vehicles = () => {
    const [vehicles, setVehicles] = useState([]);
    const [activeOpts, setActiveOpts] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchVehicles();
    }, []);

    const fetchVehicles = async () => {
        try {
            setLoading(true);
            const [res, optRes] = await Promise.all([
                api.get('/api/vehicles'),
                optimizationService.getHistory().catch(() => ({ success: false }))
            ]);
            setVehicles(res.data.data);

            if (optRes && optRes.success) {
                const pendingOpts = optRes.data.filter(o => o.status === 'completed');
                const oMap = {};
                for (const opt of pendingOpts) {
                    const detail = await optimizationService.getOptimizationResult(opt._id).catch(() => null);
                    if (detail && detail.data && detail.data.result) {
                        detail.data.result.vehicleAssignments.forEach(assign => {
                            const vehId = assign.vehicleId._id || assign.vehicleId;
                            if (!oMap[vehId]) oMap[vehId] = [];
                            oMap[vehId].push({ ...assign, runId: detail.data._id });
                        });
                    }
                }
                setActiveOpts(oMap);
            }

            setError(null);
        } catch (err) {
            setError('Failed to fetch vehicles');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-6 text-white">Loading vehicles...</div>;
    if (error) return <div className="p-6 text-red-500">{error}</div>;

    const getStatusStyle = (status) => {
        switch (status) {
            case 'available': return 'bg-green-900/50 text-green-400';
            case 'assigned': return 'bg-blue-900/50 text-blue-400';
            case 'in_transit': return 'bg-purple-900/50 text-purple-400 border border-purple-500/30';
            case 'maintenance': return 'bg-orange-900/50 text-orange-400';
            default: return 'bg-gray-700 text-gray-400';
        }
    };

    return (
        <div className="p-6 space-y-6 text-white max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-100">Vehicle Fleet</h1>
                <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded shadow transition-all duration-200">
                    + Add Vehicle
                </button>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-xl overflow-hidden mt-6">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-900 text-gray-400 uppercase text-xs tracking-wider">
                                <th className="px-6 py-4 border-b border-gray-700">Vehicle No</th>
                                <th className="px-6 py-4 border-b border-gray-700">Type</th>
                                <th className="px-6 py-4 border-b border-gray-700">Capacity</th>
                                <th className="px-6 py-4 border-b border-gray-700">Current Location</th>
                                <th className="px-6 py-4 border-b border-gray-700">Status</th>
                                <th className="px-6 py-4 border-b border-gray-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {vehicles.length > 0 ? vehicles.map((veh) => (
                                <tr key={veh._id} className="hover:bg-gray-750 transition-colors duration-150">
                                    <td className="px-6 py-4 font-mono font-bold text-sm tracking-wider">{veh.vehicleNumber}</td>
                                    <td className="px-6 py-4 capitalize">{veh.vehicleType}</td>
                                    <td className="px-6 py-4 text-gray-300">
                                        {veh.capacity} <span className="text-xs text-gray-500">{veh.capacityUnit}</span>
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        {veh.currentLocation?.name || (
                                            <span className="text-gray-500 flex items-center gap-1">
                                                On Assignment
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {activeOpts[veh._id] ? (
                                            <div className="bg-blue-900/40 p-2 rounded border border-blue-700/50 flex flex-col items-start shadow-sm">
                                                <span className="text-blue-300 font-bold text-[10px] uppercase mb-1 flex items-center gap-1">AI Reserved</span>
                                                <span className="text-gray-300 text-xs">For {activeOpts[veh._id].length} route(s)</span>
                                            </div>
                                        ) : (
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusStyle(veh.status)}`}>
                                                {veh.status.replace('_', ' ').toUpperCase()}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex space-x-3">
                                            <button className="text-blue-400 hover:text-blue-300">Edit</button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                        No vehicles found.
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

export default Vehicles;
