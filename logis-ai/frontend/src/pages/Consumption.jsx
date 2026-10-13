import React, { useState, useEffect } from 'react';
import api from '../services/api';

const Consumption = () => {
    const [consumptions, setConsumptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchConsumptions();
    }, []);

    const fetchConsumptions = async () => {
        try {
            setLoading(true);
            const res = await api.get('/api/consumption');
            setConsumptions(res.data.data);
            setError(null);
        } catch (err) {
            setError('Failed to fetch consumptions');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-6 text-white">Loading consumption records...</div>;
    if (error) return <div className="p-6 text-red-500">{error}</div>;

    return (
        <div className="p-6 space-y-6 text-white max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-100">Consumption Records</h1>
                <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded shadow transition-all duration-200">
                    + Record Consumption
                </button>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-xl overflow-hidden mt-6">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-900 text-gray-400 uppercase text-xs tracking-wider">
                                <th className="px-6 py-4 border-b border-gray-700">Date</th>
                                <th className="px-6 py-4 border-b border-gray-700">Location</th>
                                <th className="px-6 py-4 border-b border-gray-700">Item</th>
                                <th className="px-6 py-4 border-b border-gray-700 text-right">Quantity</th>
                                <th className="px-6 py-4 border-b border-gray-700">Source</th>
                                <th className="px-6 py-4 border-b border-gray-700">Operator</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {consumptions.length > 0 ? consumptions.map((rec) => (
                                <tr key={rec._id} className="hover:bg-gray-750 transition-colors duration-150">
                                    <td className="px-6 py-4 text-sm text-gray-300">
                                        {new Date(rec.date).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 font-medium">{rec.location?.name || 'Unknown'}</td>
                                    <td className="px-6 py-4">{rec.item?.name || 'Unknown'}</td>
                                    <td className="px-6 py-4 text-right font-bold text-red-400">
                                        -{rec.quantity} <span className="text-xs text-gray-500 font-normal">{rec.item?.unit}</span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-400">
                                        {rec.source || 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-400">
                                        {rec.createdBy?.name || 'Unknown'}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                        No consumption records found.
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

export default Consumption;
