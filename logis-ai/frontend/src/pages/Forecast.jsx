import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';

export default function ForecastPage() {
    const { user } = useAuth();
    const [summary, setSummary] = useState(null);
    const [locations, setLocations] = useState([]);
    const [items, setItems] = useState([]);

    // Selection state
    const [selectedLoc, setSelectedLoc] = useState('');
    const [selectedItem, setSelectedItem] = useState('');
    const [horizon, setHorizon] = useState(7);

    // Forecast data
    const [forecastData, setForecastData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [chartData, setChartData] = useState([]);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [sumRes, locRes, itemRes] = await Promise.all([
                api.get('/api/forecast/summary'),
                api.get('/api/locations?limit=100'),
                api.get('/api/items?limit=100')
            ]);
            setSummary(sumRes.data.data);
            setLocations(locRes.data.data);
            setItems(itemRes.data.data);

            // Auto Select
            if (locRes.data.data.length) setSelectedLoc(locRes.data.data[0]._id);
            if (itemRes.data.data.length) setSelectedItem(itemRes.data.data[0]._id);

        } catch (error) {
            console.error("Failed to load forecast base data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        if (!selectedLoc || !selectedItem) return;
        setLoading(true);
        try {
            const res = await api.get(`/api/forecast/${selectedLoc}/${selectedItem}?horizonDays=${horizon}`);
            setForecastData(res.data.data);

            // Format chart data (Historical + Forecast)
            // Ideally we'd fetch actuals from DB here to prepend, but for demo we will just plot the forecast array.
            const formatted = res.data.data.forecastData.map(f => ({
                date: new Date(f.date).toLocaleDateString(),
                predictedDemand: f.predictedDemand,
                projectedStock: f.projectedStock
            }));
            setChartData(formatted);
        } catch (error) {
            console.error(error);
            alert("Error: " + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    const handleRetrain = async () => {
        if (!selectedLoc || !selectedItem) return;
        setLoading(true);
        try {
            const res = await api.post('/api/forecast/train', {
                locationId: selectedLoc,
                itemId: selectedItem
            });
            alert(`Model retrained successfully. Model used: ${res.data.data.modelType}`);
            handleGenerate();
        } catch (error) {
            alert("Failed to retrain model");
        } finally {
            setLoading(false);
        }
    };

    if (loading && !summary) return <div className="text-white p-6">Loading AI Models...</div>;

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-2xl font-bold tracking-tight text-white">Predictive Logistics AI</h1>
                <p className="text-sm text-slate-400 mt-1">Machine Learning demand forecasting & stockout risk engine.</p>
            </header>

            {/* KPI Summary */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="card border-l-4 border-l-blue-500">
                        <p className="text-sm text-slate-400 font-medium">Forecasts Generated</p>
                        <p className="text-3xl font-bold text-white mt-2">{summary.totalForecasts}</p>
                    </div>
                    <div className="card border-l-4 border-l-red-500">
                        <p className="text-sm text-slate-400 font-medium">Critical Predictions</p>
                        <p className="text-3xl font-bold text-white mt-2">{summary.criticalForecasts}</p>
                    </div>
                    <div className="card border-l-4 border-l-orange-500">
                        <p className="text-sm text-slate-400 font-medium">Stockout Risks</p>
                        <p className="text-3xl font-bold text-white mt-2">{summary.stockoutRiskLocations}</p>
                    </div>
                    <div className="card border-l-4 border-l-green-500">
                        <p className="text-sm text-slate-400 font-medium">Replenishments Guided</p>
                        <p className="text-3xl font-bold text-white mt-2">{summary.replenishmentRecommendations}</p>
                    </div>
                </div>
            )}

            {/* Main Selector */}
            <div className="card">
                <h2 className="text-lg font-semibold text-white mb-4">Forecast Configuration</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Location</label>
                        <select
                            value={selectedLoc}
                            onChange={(e) => setSelectedLoc(e.target.value)}
                            className="input w-full"
                        >
                            <option value="">Select Location</option>
                            {locations.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Item</label>
                        <select
                            value={selectedItem}
                            onChange={(e) => setSelectedItem(e.target.value)}
                            className="input w-full"
                        >
                            <option value="">Select Item</option>
                            {items.map(i => <option key={i._id} value={i._id}>{i.name}</option>)}
                        </select>
                    </div>
                    <div className="flex space-x-2">
                        <button onClick={() => setHorizon(7)} className={`px-4 py-2 text-sm rounded transition-colors ${horizon === 7 ? 'bg-brand-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>7 Days</button>
                        <button onClick={() => setHorizon(14)} className={`px-4 py-2 text-sm rounded transition-colors ${horizon === 14 ? 'bg-brand-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>14 Days</button>
                        <button onClick={() => setHorizon(30)} className={`px-4 py-2 text-sm rounded transition-colors ${horizon === 30 ? 'bg-brand-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>30 Days</button>
                    </div>
                </div>
                <div className="mt-6 flex space-x-4">
                    <button onClick={handleGenerate} disabled={loading} className="btn-primary px-6">
                        {loading ? 'Forecasting...' : 'Generate Forecast'}
                    </button>
                    <button onClick={handleRetrain} disabled={loading} className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded font-medium transition-colors">
                        Retrain Model
                    </button>
                </div>
            </div>

            {/* Forecast Outputs */}
            {forecastData && (
                <div className="space-y-6">
                    {/* Metrics Banner */}
                    <div className="flex flex-wrap gap-4 items-center p-4 bg-brand-900/20 border border-brand-800 rounded-lg">
                        <span className="text-slate-300 text-sm">Model: <strong className="text-white">{forecastData.modelUsed.toUpperCase()}</strong></span>
                        <span className="text-slate-300 text-sm">Confidence: <strong className={`capitalize ${forecastData.confidenceLevel === 'high' ? 'text-green-400' : 'text-orange-400'}`}>{forecastData.confidenceLevel}</strong></span>
                        <span className="text-slate-300 text-sm">Status: <strong className={`capitalize ${forecastData.stockStatus === 'stockout_risk' ? 'text-red-500' : forecastData.stockStatus === 'warning' ? 'text-orange-500' : 'text-green-500'}`}>{forecastData.stockStatus.replace('_', ' ')}</strong></span>
                        {forecastData.predictedStockoutDate && (
                            <span className="text-slate-300 text-sm">Critical By: <strong className="text-red-400">{new Date(forecastData.predictedStockoutDate).toLocaleDateString()}</strong></span>
                        )}
                        {forecastData.recommendedReplenishment > 0 && (
                            <span className="ml-auto text-sm bg-brand-600 text-white px-3 py-1 rounded">Recommended Replenish: {forecastData.recommendedReplenishment} units</span>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Demand Chart */}
                        <div className="card h-96">
                            <h3 className="text-sm font-semibold text-slate-300 mb-4">Predicted Demand</h3>
                            <ResponsiveContainer width="100%" height="90%">
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                                    <YAxis stroke="#94a3b8" fontSize={12} />
                                    <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', color: '#fff' }} />
                                    <Legend />
                                    <Line type="monotone" dataKey="predictedDemand" name="Predicted Demand" stroke="#3b82f6" strokeWidth={3} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Projection Chart */}
                        <div className="card h-96">
                            <h3 className="text-sm font-semibold text-slate-300 mb-4">Projected Stock Level vs Minimum</h3>
                            <ResponsiveContainer width="100%" height="90%">
                                <AreaChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                                    <YAxis stroke="#94a3b8" fontSize={12} />
                                    <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', color: '#fff' }} />
                                    <Legend />
                                    <Area type="monotone" dataKey="projectedStock" name="Projected Inventory" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
