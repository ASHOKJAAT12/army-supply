import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import riskService from '../services/riskService';


const Locations = () => {
    const [locations, setLocations] = useState([]);
    const [riskMap, setRiskMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchLocations();
    }, []);

    const fetchLocations = async () => {
        try {
            setLoading(true);
            const [res, riskRes] = await Promise.all([
                api.get('/api/locations'),
                riskService.getRiskLocations().catch(() => ({ success: false }))
            ]);
            setLocations(res.data.data);

            if (riskRes && riskRes.success) {
                const map = {};
                riskRes.data.forEach(r => map[r.entityId] = r);
                setRiskMap(map);
            }

            setError(null);
        } catch (err) {
            setError('Failed to fetch locations');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this location?')) return;
        try {
            await api.delete(`/api/locations/${id}`);
            fetchLocations();
        } catch (err) {
            alert(err.response?.data?.message || 'Delete failed. You might not have permission.');
        }
    };

    const totalLocations = locations.length;
    const activeLocations = locations.filter(l => l.status === 'active').length;
    const criticalLocations = locations.filter(l => l.priority === 'critical').length;

    if (loading) return <div className="p-6 text-white">Loading locations...</div>;
    if (error) return <div className="p-6 text-red-500">{error}</div>;

    return (
        <div className="p-6 space-y-6 text-white max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-100">Locations Management</h1>
                <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded shadow transition-all duration-200">
                    + Add Location
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 shadow-lg flex flex-col items-center justify-center">
                    <span className="text-gray-400 font-medium">Total Locations</span>
                    <span className="text-4xl font-bold mt-2 text-blue-400">{totalLocations}</span>
                </div>
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 shadow-lg flex flex-col items-center justify-center">
                    <span className="text-gray-400 font-medium">Active Locations</span>
                    <span className="text-4xl font-bold mt-2 text-green-400">{activeLocations}</span>
                </div>
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 shadow-lg flex flex-col items-center justify-center border-b-4 border-b-red-500">
                    <span className="text-gray-400 font-medium">Critical Priority</span>
                    <span className="text-4xl font-bold mt-2 text-red-400">{criticalLocations}</span>
                </div>
            </div>

            {/* Table */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-xl overflow-hidden mt-6">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-900 text-gray-400 uppercase text-xs tracking-wider">
                                <th className="px-6 py-4 border-b border-gray-700">Code</th>
                                <th className="px-6 py-4 border-b border-gray-700">Name</th>
                                <th className="px-6 py-4 border-b border-gray-700">Type</th>
                                <th className="px-6 py-4 border-b border-gray-700">Priority</th>
                                <th className="px-6 py-4 border-b border-gray-700">Predictive Risk</th>
                                <th className="px-6 py-4 border-b border-gray-700">Coordinates</th>
                                <th className="px-6 py-4 border-b border-gray-700">Status</th>
                                <th className="px-6 py-4 border-b border-gray-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {locations.length > 0 ? locations.map((loc) => (
                                <tr key={loc._id} className="hover:bg-gray-750 transition-colors duration-150">
                                    <td className="px-6 py-4 font-mono text-sm">{loc.code}</td>
                                    <td className="px-6 py-4 font-medium">{loc.name}</td>
                                    <td className="px-6 py-4 capitalize">{loc.type.replace('_', ' ')}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${loc.priority === 'critical' ? 'bg-red-900/50 text-red-400' :
                                            loc.priority === 'high' ? 'bg-orange-900/50 text-orange-400' :
                                                'bg-blue-900/50 text-blue-400'
                                            }`}>
                                            {loc.priority.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {riskMap[loc._id] ? (
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-1 flex-shrink-0 rounded text-[10px] font-bold ${riskMap[loc._id].riskLevel === 'critical' ? 'bg-red-900/50 text-red-500' : riskMap[loc._id].riskLevel === 'high' ? 'bg-orange-900/50 text-orange-400' : 'bg-green-900/50 text-green-400'}`}>
                                                    {riskMap[loc._id].riskLevel.toUpperCase()}
                                                </span>
                                                <Link to={`/risk/${riskMap[loc._id]._id}`} className="text-blue-400 font-semibold text-xs hover:underline">Review</Link>
                                            </div>
                                        ) : (
                                            <span className="text-gray-500 text-xs">Unassessed</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 font-mono text-sm text-gray-400 text-nowrap">
                                        {loc.latitude?.toFixed(4)}, {loc.longitude?.toFixed(4)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${loc.status === 'active' ? 'bg-green-900/50 text-green-400' : 'bg-gray-700 text-gray-400'
                                            }`}>
                                            {loc.status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex space-x-3">
                                            <Link to={`/map?location=${loc._id}`} className="text-blue-400 hover:text-blue-300 hover:underline font-medium transition-colors">
                                                View on Map
                                            </Link>
                                            <button className="text-blue-400 hover:text-blue-300">Edit</button>
                                            <button
                                                onClick={() => handleDelete(loc._id)}
                                                className="text-red-400 hover:text-red-300"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                                        No locations found. Add one to get started.
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

export default Locations;
