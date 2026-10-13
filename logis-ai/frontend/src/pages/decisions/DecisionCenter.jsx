import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';

const DecisionCenter = () => {
    const [scorecard, setScorecard] = useState(null);
    const [decisions, setDecisions] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchCenter = async () => {
            try {
                const [scoreRes, decRes] = await Promise.all([
                    api.get('/api/system/scorecard').catch(() => ({ data: { data: {} } })),
                    api.get('/api/decision/active').catch(() => ({ data: { data: [] } }))
                ]);
                setScorecard(scoreRes.data.data);
                setDecisions(decRes.data.data || []);
            } catch (err) {
                console.error('Failed to fetch decisions overview', err);
            } finally {
                setLoading(false);
            }
        };
        fetchCenter();
    }, []);

    if (loading) return <div className="p-6 text-white text-center">Loading Operations Logic...</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-blue-500">
                        Decision Center
                    </h1>
                    <p className="text-slate-400">Logistics Autonomous Orchestration & Human Review</p>
                </div>
            </div>

            {/* SYSTEM STATUS SCORECARD */}
            <div className="card">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-white uppercase tracking-widest text-xs">System Health Check</h2>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-300">Data Quality Score:</span>
                        <span className={`text-xl font-bold ${scorecard?.dataQualityScore > 80 ? 'text-emerald-400' : 'text-orange-400'}`}>
                            {scorecard?.dataQualityScore}%
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-7 gap-4">
                    {scorecard?.health && Object.entries(scorecard.health).map(([key, h]) => (
                        <div key={key} className={`border p-3 rounded text-center shadow-inner ${h.status === 'healthy' ? 'bg-emerald-900/10 border-emerald-800/40' :
                            h.status === 'warning' ? 'bg-orange-900/10 border-orange-800/40' :
                                'bg-red-900/10 border-red-800/40'
                            }`}>
                            <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">
                                {key.replace('Health', '')}
                            </div>
                            <div className={`font-bold ${h.status === 'healthy' ? 'text-emerald-400' :
                                h.status === 'warning' ? 'text-orange-400' :
                                    'text-red-400'
                                }`}>
                                {h.status.toUpperCase()}
                            </div>
                        </div>
                    ))}
                </div>

                {scorecard?.issues && scorecard.issues.length > 0 && (
                    <div className="mt-4 bg-orange-900/20 p-3 rounded border border-orange-500/30 text-xs text-orange-400">
                        <strong>Active Warnings: </strong>
                        <ul className="list-disc pl-5 mt-1 space-y-1">
                            {scorecard.issues.map((iss, i) => <li key={i}>{iss}</li>)}
                        </ul>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* URGENT DECISIONS (Top 5 proposals) */}
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="text-sm font-bold text-white uppercase tracking-widest">Urgent Recommendations</h2>
                    {decisions.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 bg-slate-900 border border-slate-700 rounded-xl">
                            No pending decisions. System is nominal.
                        </div>
                    ) : decisions.map(dec => (
                        <div key={dec._id} className="bg-slate-900 border border-slate-700 p-5 rounded-xl flex justify-between items-start hover:border-slate-500 transition-colors shadow">
                            <div className="flex gap-4">
                                <div className="flex flex-col items-center justify-center p-3 bg-slate-800 rounded-lg min-w-[70px]">
                                    <span className="text-[10px] uppercase text-slate-500 font-bold">Urgency</span>
                                    <span className={`text-xl font-bold font-mono ${dec.urgencyScore > 75 ? 'text-red-500' : dec.urgencyScore > 50 ? 'text-orange-400' : 'text-blue-400'}`}>
                                        {dec.urgencyScore}
                                    </span>
                                </div>
                                <div>
                                    <div className="flex gap-2 items-center mb-1">
                                        <h3 className="text-lg font-bold text-white">{dec.objective}</h3>
                                        <span className="text-[10px] bg-slate-700 text-slate-300 font-bold px-2 py-0.5 rounded uppercase font-mono">
                                            Confidence: {dec.confidenceScore}%
                                        </span>
                                    </div>
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{dec.trigger}</p>
                                    {dec.recommendations && dec.recommendations[0] && (
                                        <p className="text-sm text-brand-300 mt-2 font-medium">↳ {dec.recommendations[0].action}</p>
                                    )}
                                    <p className="text-xs text-slate-500 mt-1">Generated: {new Date(dec.createdAt).toLocaleString()}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => navigate(`/decisions/${dec._id}`)}
                                className="text-xs font-bold bg-brand-700 hover:bg-brand-600 text-white px-4 py-2 border border-brand-800 rounded transition-colors shadow-lg">
                                Review
                            </button>
                        </div>
                    ))}
                </div>

                {/* WHAT-IF SIMULATOR WIDGET */}
                <div className="card space-y-4 shadow-lg border border-slate-700">
                    <h2 className="text-sm font-bold text-white uppercase tracking-widest">Global What-If Sim</h2>
                    <p className="text-xs text-slate-400">Select a variable below to preview cascading supply chain risk impact. Simulated without mutating production state.</p>

                    <div className="space-y-3">
                        <label className="flex items-center justify-between text-sm text-slate-300 cursor-pointer p-2 hover:bg-slate-800 rounded border border-transparent hover:border-slate-700">
                            <span>Block Major Route</span>
                            <input type="checkbox" className="accent-brand-500" />
                        </label>
                        <label className="flex items-center justify-between text-sm text-slate-300 cursor-pointer p-2 hover:bg-slate-800 rounded border border-transparent hover:border-slate-700">
                            <span>30% Veh. Unavailable</span>
                            <input type="checkbox" className="accent-brand-500" />
                        </label>
                        <label className="flex items-center justify-between text-sm text-slate-300 cursor-pointer p-2 hover:bg-slate-800 rounded border border-transparent hover:border-slate-700">
                            <span>Inc. Demand x2</span>
                            <input type="checkbox" className="accent-brand-500" />
                        </label>
                        <label className="flex items-center justify-between text-sm text-slate-300 cursor-pointer p-2 hover:bg-slate-800 rounded border border-transparent hover:border-slate-700">
                            <span>Max Weather Risk</span>
                            <input type="checkbox" className="accent-brand-500" />
                        </label>
                    </div>

                    <button className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold border border-slate-600 py-2 rounded text-sm transition-colors mt-2">
                        Run Pre-computation
                    </button>
                </div>

            </div>
        </div>
    )
};

export default DecisionCenter;
