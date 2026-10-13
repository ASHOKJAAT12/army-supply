import React, { useState, useEffect } from 'react';
import api from '../services/api';
import anomalyService from '../services/anomalyService';
import { useSocket } from '../hooks/useSocket';

const Inventory = () => {
    const [inventories, setInventories] = useState([]);
    const [summary, setSummary] = useState(null);
    const [anomaliesMap, setAnomaliesMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { isConnected, lastEvent } = useSocket();

    useEffect(() => {
        fetchInventory();
    }, []);

    useEffect(() => {
        if (lastEvent && lastEvent.type === 'inventory_updated') {
            setInventories(prev => prev.map(inv => {
                if (inv.location._id === lastEvent.data.locationId && inv.item._id === lastEvent.data.itemId) {
                    return {
                        ...inv,
                        currentQuantity: lastEvent.data.quantity,
                        availableQuantity: lastEvent.data.quantity - inv.reservedQuantity,
                        quantitySource: lastEvent.data.source,
                        lastSensorUpdate: lastEvent.data.lastSensorUpdate
                    };
                }
                return inv;
            }));
        }
    }, [lastEvent]);

    const fetchInventory = async () => {
        try {
            setLoading(true);
            const [invRes, sumRes, anomRes] = await Promise.all([
                api.get('/api/inventory'),
                api.get('/api/inventory/summary'),
                anomalyService.getAnomalies().catch(() => ({ success: false }))
            ]);
            setInventories(invRes.data.data);
            setSummary(sumRes.data.data);

            if (anomRes && anomRes.success) {
                const aMap = {};
                anomRes.data.forEach(a => aMap[`${a.location._id}-${a.item._id}`] = a);
                setAnomaliesMap(aMap);
            }

            setError(null);
        } catch (err) {
            setError('Failed to fetch inventory data');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-6 text-white">Loading inventory...</div>;
    if (error) return <div className="p-6 text-red-500">{error}</div>;

    return (
        <div className="p-6 space-y-6 text-white max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-100">Inventory Status</h1>
                <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded shadow transition-all duration-200">
                    + Manual Adjust
                </button>
            </div>

            {/* KPI Cards */}
            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 shadow-lg flex flex-col items-center">
                        <span className="text-gray-400 font-medium">Total Records</span>
                        <span className="text-3xl font-bold mt-2 text-blue-400">{summary.total}</span>
                    </div>
                    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 shadow-lg flex flex-col items-center">
                        <span className="text-gray-400 font-medium">Normal Stock</span>
                        <span className="text-3xl font-bold mt-2 text-green-400">{summary.normalCount}</span>
                    </div>
                    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 shadow-lg flex flex-col items-center">
                        <span className="text-gray-400 font-medium">Low Stock</span>
                        <span className="text-3xl font-bold mt-2 text-warning text-orange-400">{summary.lowCount}</span>
                    </div>
                    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 shadow-lg flex flex-col items-center border-b-4 border-b-red-500">
                        <span className="text-gray-400 font-medium">Critical Stock</span>
                        <span className="text-3xl font-bold mt-2 text-red-500">{summary.criticalCount}</span>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-xl overflow-hidden mt-6">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-900 text-gray-400 uppercase text-xs tracking-wider">
                                <th className="px-6 py-4 border-b border-gray-700">Location</th>
                                <th className="px-6 py-4 border-b border-gray-700">Item</th>
                                <th className="px-6 py-4 border-b border-gray-700 text-right">Current Stock</th>
                                <th className="px-6 py-4 border-b border-gray-700 text-right">Reserved</th>
                                <th className="px-6 py-4 border-b border-gray-700 text-right">Available</th>
                                <th className="px-6 py-4 border-b border-gray-700 text-right">Min Stock</th>
                                <th className="px-6 py-4 border-b border-gray-700 text-center">Status</th>
                                <th className="px-6 py-4 border-b border-gray-700 text-center">Data Source</th>
                                <th className="px-6 py-4 border-b border-gray-700 text-center">AI Anomaly</th>
                                <th className="px-6 py-4 border-b border-gray-700">Last Updated</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {inventories.length > 0 ? inventories.map((inv) => (
                                <tr key={inv._id} className="hover:bg-gray-750 transition-colors duration-150">
                                    <td className="px-6 py-4 font-medium">{inv.location?.name || 'Unknown'}</td>
                                    <td className="px-6 py-4">{inv.item?.name || 'Unknown'}</td>
                                    <td className="px-6 py-4 text-right text-gray-200">
                                        {inv.currentQuantity} <span className="text-xs text-gray-500">{inv.item?.unit}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-orange-300">
                                        {inv.reservedQuantity} <span className="text-xs text-gray-500">{inv.item?.unit}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-blue-300">
                                        {inv.availableQuantity} <span className="text-xs text-gray-500">{inv.item?.unit}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-gray-400 text-sm">
                                        {inv.minimumStock}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 flex-shrink-0 whitespace-nowrap rounded text-xs font-semibold ${inv.status === 'critical' ? 'bg-red-900/50 text-red-400 border border-red-500/50' : inv.status === 'low' ? 'bg-orange-900/50 text-orange-400 border border-orange-500/50' : 'bg-green-900/50 text-green-400 border border-green-500/50'}`}>
                                            {inv.status?.toUpperCase() || 'NORMAL'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {inv.quantitySource === 'iot' || inv.quantitySource === 'hybrid' ? (
                                            <div className="flex flex-col items-center justify-center">
                                                <span className="text-emerald-400 text-[10px] uppercase font-bold tracking-widest leading-none">IoT Sensor</span>
                                                {inv.lastSensorUpdate && (
                                                    <span className="text-gray-500 text-[9px] mt-1 whitespace-nowrap">{(Date.now() - new Date(inv.lastSensorUpdate).getTime()) < 60000 ? 'Live' : 'Stale'}</span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 text-xs uppercase font-bold">Manual</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {anomaliesMap[`${inv.location?._id}-${inv.item?._id}`] ? (
                                            <span title="Unusual consumption pattern detected" className="px-2 py-0.5 rounded text-[10px] font-bold bg-pink-900/50 text-pink-400 border border-pink-700/50 animate-pulse">
                                                ANOMALY
                                            </span>
                                        ) : (
                                            <span className="text-gray-500 text-xs">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-400 text-nowrap">
                                        {new Date(inv.lastUpdated).toLocaleDateString()}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="9" className="px-6 py-8 text-center text-gray-500">
                                        No inventory records found.
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

export default Inventory;
