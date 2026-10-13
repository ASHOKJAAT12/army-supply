import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import riskService from '../../services/riskService';
import anomalyService from '../../services/anomalyService';
import {
    AlertTriangle, ShieldAlert, CloudLightning, Activity,
    ArrowRight, Map, TrendingUp, Search
} from 'lucide-react';
import {
    PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

export default function RiskDashboard() {
    const [summary, setSummary] = useState(null);
    const [locations, setLocations] = useState([]);
    const [anomalies, setAnomalies] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [sumRes, locRes, anomRes] = await Promise.all([
                riskService.getRiskSummary(),
                riskService.getRiskLocations(),
                anomalyService.getAnomalies()
            ]);

            if (sumRes.success) setSummary(sumRes.data);
            if (locRes.success) setLocations(locRes.data.slice(0, 5)); // Top 5
            if (anomRes.success) setAnomalies(anomRes.data.slice(0, 5));
        } catch (error) {
            console.error('Failed to load risk dashboard data', error);
        } finally {
            setLoading(false);
        }
    };

    const COLORS = {
        low: '#10B981',      // Emerald 500
        medium: '#F59E0B',   // Amber 500
        high: '#EF4444',     // Red 500
        critical: '#7F1D1D'  // Red 900
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64 text-gray-500">
                <Activity className="animate-spin w-8 h-8 mr-2" />
                <span>Loading Predictive Risk Engine...</span>
            </div>
        );
    }

    const pieData = summary ? [
        { name: 'Low', value: summary.summary.low, color: COLORS.low },
        { name: 'Medium', value: summary.summary.medium, color: COLORS.medium },
        { name: 'High', value: summary.summary.high, color: COLORS.high },
        { name: 'Critical', value: summary.summary.critical, color: COLORS.critical },
    ].filter(d => d.value > 0) : [];

    return (
        <div className="p-6">
            <header className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                        <ShieldAlert className="mr-2 text-indigo-600" />
                        Predictive Risk Command Center
                    </h1>
                    <p className="text-gray-600">AI-powered logistics situational awareness & early warning</p>
                </div>
                <button
                    onClick={loadData}
                    className="flexItems-center px-4 py-2 bg-white border border-gray-300 rounded shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                    Refresh Analysis
                </button>
            </header>

            {/* Top KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-900 focus:outline-none">
                    <div className="flex items-center text-red-900 mb-2">
                        <AlertTriangle className="w-5 h-5 mr-1" />
                        <span className="font-semibold text-sm">CRITICAL RISKS</span>
                    </div>
                    <div className="text-3xl font-bold">{summary?.summary.critical || 0}</div>
                    <div className="text-xs text-gray-500 mt-1">Requires immediate intervention</div>
                </div>

                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
                    <div className="flex items-center text-red-600 mb-2">
                        <TrendingUp className="w-5 h-5 mr-1" />
                        <span className="font-semibold text-sm">HIGH RISKS</span>
                    </div>
                    <div className="text-3xl font-bold">{summary?.summary.high || 0}</div>
                    <div className="text-xs text-gray-500 mt-1">Review within 24 hours</div>
                </div>

                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-amber-500">
                    <div className="flex items-center text-amber-600 mb-2">
                        <CloudLightning className="w-5 h-5 mr-1" />
                        <span className="font-semibold text-sm">WEATHER ALERTS</span>
                    </div>
                    <div className="text-3xl font-bold">
                        {summary?.topLocations?.filter(l => l.componentScores?.weather >= 60).length || 0}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Locations with severe weather forecast</div>
                </div>

                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-indigo-500">
                    <div className="flex items-center text-indigo-600 mb-2">
                        <Activity className="w-5 h-5 mr-1" />
                        <span className="font-semibold text-sm">CONSUMPTION ANOMALIES</span>
                    </div>
                    <div className="text-3xl font-bold">{anomalies.length}</div>
                    <div className="text-xs text-gray-500 mt-1">Active statistical outliers</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

                {/* Risk Distribution Chart */}
                <div className="bg-white rounded-lg shadow p-4 flex flex-col">
                    <h2 className="text-lg font-semibold mb-4 text-gray-800">Overall Risk Distribution</h2>
                    <div className="flex-1 min-h-[250px]">
                        {pieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-500">
                                No risks detected. All systems nominal.
                            </div>
                        )}
                    </div>
                </div>

                {/* Top Critical Locations */}
                <div className="bg-white rounded-lg shadow p-4 lg:col-span-2">
                    <div className="flex justify-between flex-wrap items-center mb-4">
                        <h2 className="text-lg font-semibold text-gray-800">Top Risk Locations</h2>
                        <Link to="/map" className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center">
                            View on Map <Map className="w-4 h-4 ml-1" />
                        </Link>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-600">
                                <tr>
                                    <th className="py-3 px-4 font-medium">Location</th>
                                    <th className="py-3 px-4 font-medium text-center">Score</th>
                                    <th className="py-3 px-4 font-medium">Inv.</th>
                                    <th className="py-3 px-4 font-medium">Wx.</th>
                                    <th className="py-3 px-4 font-medium">Level</th>
                                    <th className="py-3 px-4 font-medium text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {locations.map(l => (
                                    <tr key={l._id} className="hover:bg-gray-50">
                                        <td className="py-3 px-4 font-medium">{l.location?.name || 'Unknown'}</td>
                                        <td className="py-3 px-4 text-center">{l.overallScore}</td>
                                        <td className="py-3 px-4">{Math.round(l.componentScores?.inventory || 0)}</td>
                                        <td className="py-3 px-4">{Math.round(l.componentScores?.weather || 0)}</td>
                                        <td className="py-3 px-4">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full
                                                ${l.riskLevel === 'critical' ? 'bg-red-100 text-red-800' :
                                                    l.riskLevel === 'high' ? 'bg-orange-100 text-orange-800' :
                                                        l.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                                            'bg-green-100 text-green-800'}
                                            `}>
                                                {l.riskLevel.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <Link to={`/risk/${l._id}`} className="text-indigo-600 hover:text-indigo-900 inline-flex items-center">
                                                Analyze <ArrowRight className="w-4 h-4 ml-1" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                                {locations.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="py-8 text-center text-gray-500">
                                            No location risks calculated yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            {/* Recent Anomalies */}
            <div className="bg-white rounded-lg shadow p-4">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Consumption Anomalies</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {anomalies.map(anom => (
                        <div key={`${anom.location._id}-${anom.item._id}`} className="border rounded-md p-4 bg-gray-50">
                            <h3 className="font-semibold flex justify-between">
                                <span>{anom.location.name}</span>
                                <span className={`text-xs px-2 py-1 rounded-full ${anom.severity === 'high' || anom.severity === 'critical' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                    {anom.severity.toUpperCase()}
                                </span>
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">Item: {anom.item.name}</p>
                            <p className="text-sm mt-3 flex justify-between text-gray-800">
                                <span>Actual: <b>{anom.actual}</b></span>
                                <span>Baseline: <b>{Math.round(anom.expected)}</b></span>
                            </p>
                            <p className="text-xs text-red-600 font-medium mt-2">
                                Deviation: {anom.deviationPercent > 0 ? '+' : ''}{Math.round(anom.deviationPercent)}%
                            </p>
                        </div>
                    ))}
                    {anomalies.length === 0 && (
                        <div className="col-span-3 py-6 text-center text-gray-500">
                            No active statistical outliers detected.
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
}
