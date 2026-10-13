import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import riskService from '../../services/riskService';
import {
    ArrowLeft, ShieldAlert, CheckCircle, Info, CloudLightning, Package, AlertTriangle
} from 'lucide-react';

export default function RiskDetail() {
    const { id } = useParams();
    const [risk, setRisk] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRisk = async () => {
            setLoading(true);
            try {
                const res = await riskService.getRiskById(id);
                if (res.success) setRisk(res.data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchRisk();
    }, [id]);

    if (loading) return <div className="p-8 text-center text-gray-500">Loading Analysis...</div>;
    if (!risk) return <div className="p-8 text-center text-red-500">Risk Assessment not found.</div>;

    const COLORS = {
        low: 'bg-green-100 text-green-800 border-green-200',
        medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        high: 'bg-orange-100 text-orange-900 border-orange-300',
        critical: 'bg-red-100 text-red-900 border-red-300'
    };

    const colorClass = COLORS[risk.riskLevel] || COLORS.low;

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="mb-6">
                <Link to="/risk" className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center mb-2">
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back to Risk Dashboard
                </Link>
                <div className={`p-6 rounded-lg border-2 flex items-center justify-between ${colorClass}`}>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center mb-1">
                            <ShieldAlert className="mr-2" />
                            {risk.entityType === 'location' ? `Location Risk: ${risk.location?.name}` : `Shipment Risk: ${risk.shipment?.shipmentNumber}`}
                        </h1>
                        <p className="text-sm opacity-80">
                            Assessment generated at {new Date(risk.generatedAt).toLocaleString()}
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="text-4xl font-black">{risk.overallScore}</div>
                        <div className="text-sm font-bold uppercase tracking-wider">{risk.riskLevel} RISK</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="md:col-span-2">
                    <div className="bg-white shadow rounded-lg p-6 mb-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                            <Info className="w-5 h-5 mr-2 text-indigo-600" />
                            Why this risk?
                        </h2>

                        <div className="space-y-4">
                            {risk.factors?.length > 0 ? (
                                <ul className="list-disc pl-5 space-y-2">
                                    {risk.factors.map((f, i) => (
                                        <li key={i} className="text-gray-800 font-medium">
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-gray-500 italic">No significant risk factors detected.</p>
                            )}
                        </div>
                    </div>

                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                            <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                            Recommended Actions
                        </h2>

                        <div className="space-y-4">
                            {risk.recommendations?.length > 0 ? (
                                <ul className="space-y-3">
                                    {risk.recommendations.map((r, i) => (
                                        <li key={i} className="bg-gray-50 p-3 rounded border border-gray-200 text-gray-800 text-sm font-medium flex">
                                            <span className="w-6 h-6 mr-3 flex-shrink-0 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-xs">{i + 1}</span>
                                            {r}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-gray-500 italic">No specific actions required at this time.</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white shadow rounded-lg p-5">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">Component Scores</h3>

                        <div className="space-y-4">
                            <ScoreBar label="Inventory & Forecast" score={Math.max(risk.componentScores?.inventory || 0, risk.componentScores?.forecast || 0)} icon={<Package size={16} />} />
                            <ScoreBar label="Weather expected" score={risk.componentScores?.weather || 0} icon={<CloudLightning size={16} />} />
                            <ScoreBar label="Terrain Hazard" score={risk.componentScores?.terrain || 0} />
                            <ScoreBar label="Transport Access" score={risk.componentScores?.transport || 0} />
                            <ScoreBar label="Entity Priority" score={risk.componentScores?.priority || 0} />
                        </div>
                    </div>

                    <div className="bg-white shadow rounded-lg p-5">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Confidence & Source</h3>
                        <p className="text-sm text-gray-800 mb-1">
                            <b>Confidence Level:</b> <span className="capitalize">{risk.confidence}</span>
                        </p>
                        {risk.confidence === 'low' && (
                            <div className="mt-2 bg-yellow-50 text-yellow-800 text-xs p-2 rounded flex items-start">
                                <AlertTriangle size={14} className="mr-1 flex-shrink-0 mt-0.5" />
                                Model is relying on degraded or missing inputs (e.g. Weather API unavailable).
                            </div>
                        )}
                        <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
                            <p>Engine Version: {risk.sourceVersion}</p>
                            <p className="mt-1 flex items-center gap-1">Simulation / Demo Mode Active</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ScoreBar({ label, score, icon }) {
    const width = `${Math.min(100, Math.max(0, score))}%`;
    let color = 'bg-green-500';
    if (score >= 40) color = 'bg-yellow-400';
    if (score >= 60) color = 'bg-orange-500';
    if (score >= 80) color = 'bg-red-500';

    return (
        <div>
            <div className="flex justify-between text-xs font-semibold mb-1 text-gray-700">
                <span className="flex items-center gap-1">{icon} {label}</span>
                <span>{Math.round(score)} / 100</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
                <div className={`${color} h-2 rounded-full`} style={{ width }}></div>
            </div>
        </div>
    );
}
