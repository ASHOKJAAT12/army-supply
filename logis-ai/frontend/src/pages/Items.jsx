import React, { useState, useEffect } from 'react';
import api from '../services/api';

const Items = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async () => {
        try {
            setLoading(true);
            const res = await api.get('/api/items');
            setItems(res.data.data);
            setError(null);
        } catch (err) {
            setError('Failed to fetch items');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this item?')) return;
        try {
            await api.delete(`/api/items/${id}`);
            fetchItems();
        } catch (err) {
            alert(err.response?.data?.message || 'Delete failed.');
        }
    };

    const totalItems = items.length;
    // Extract unique categories
    const categoriesCount = new Set(items.map(item => item.category)).size;

    if (loading) return <div className="p-6 text-white">Loading items...</div>;
    if (error) return <div className="p-6 text-red-500">{error}</div>;

    return (
        <div className="p-6 space-y-6 text-white max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-100">Supply Items</h1>
                <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded shadow transition-all duration-200">
                    + Add Item
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full md:w-2/3">
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 shadow-lg flex flex-col items-center justify-center">
                    <span className="text-gray-400 font-medium">Total Items</span>
                    <span className="text-4xl font-bold mt-2 text-indigo-400">{totalItems}</span>
                </div>
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 shadow-lg flex flex-col items-center justify-center">
                    <span className="text-gray-400 font-medium">Categories</span>
                    <span className="text-4xl font-bold mt-2 text-teal-400">{categoriesCount}</span>
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
                                <th className="px-6 py-4 border-b border-gray-700">Category</th>
                                <th className="px-6 py-4 border-b border-gray-700 text-right">Min Stock</th>
                                <th className="px-6 py-4 border-b border-gray-700 text-right">Max Stock</th>
                                <th className="px-6 py-4 border-b border-gray-700">Status</th>
                                <th className="px-6 py-4 border-b border-gray-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {items.length > 0 ? items.map((item) => (
                                <tr key={item._id} className="hover:bg-gray-750 transition-colors duration-150">
                                    <td className="px-6 py-4 font-mono text-sm">{item.code}</td>
                                    <td className="px-6 py-4 font-medium">{item.name}</td>
                                    <td className="px-6 py-4 capitalize">{item.category}</td>
                                    <td className="px-6 py-4 text-right text-gray-300">
                                        {item.minimumStock} <span className="text-xs text-gray-500">{item.unit}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-gray-300">
                                        {item.maximumStock} <span className="text-xs text-gray-500">{item.unit}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${item.status === 'active' ? 'bg-green-900/50 text-green-400' : 'bg-gray-700 text-gray-400'
                                            }`}>
                                            {item.status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex space-x-3">
                                            <button className="text-blue-400 hover:text-blue-300">Edit</button>
                                            <button
                                                onClick={() => handleDelete(item._id)}
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
                                        No items found. Add one to get started.
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

export default Items;
