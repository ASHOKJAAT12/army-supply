import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';

const DecisionDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [decision, setDecision] = useState(null);
    const [loading, setLoading] = useState(true);
    const [simResult, setSimResult] = useState(null);

    // Whatif states
    const [simBlockRoute, setSimBlockRoute] = useState(false);
    const [simVeh, setSimVeh] = useState(false);

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/api/decision/${id}`);
            setDecision(res.data.data);
        } catch (e) {
            console.error(e);
            alert('Failed to load decision');
        } finally {
            setLoading(false);
        }
    };

    const handleRunSim = async () => {
        try {
            const res = await api.post(`/api/decision/simulate`, {
                decisionId: id,
                customParams: { routeBlocked: simBlockRoute, vehicleUnavailable: simVeh }
            });
            setSimResult(res.data.data);
        } catch (e) { console.error('Sim error', e); }
    };

    const handleAction = async (endpoint, payload = {}) => {
        try {
            const res = await api.post(`/api/decision/${id}/${endpoint}`, payload);
            if (res.data.success) {
                if (endpoint === 'apply') {
                    alert('Decision Logic fully Applied!');
                    navigate('/decision-center');
                } else {
                    fetchData();
                }
            }
        } catch (e) {
            alert(e.response?.data?.message || `Failed to ${endpoint} decision`);
        }
    };

    if (loading) return <div className="p-6 text-white text-center">Loading decision logic...</div>;
    if (!decision) return <div className="p-6 text-slate-300">Decision not found or expired.</div>;

    const isPending = ['draft', 'recommended', 'review_required'].includes(decision.status);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-200">
            <Link to="/decision-center" className="text-brand-400 hover:text-brand-300 text-sm font-bold flex items-center gap-1">
                ← Back to Center
            </Link>

            <div className="card flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-2xl font-bold text-white">{decision.objective}</h1>
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-widest ${decision.status === 'review_required' ? 'bg-orange-900/50 text-orange-400' :
                            decision.status === 'applied' ? 'bg-emerald-900/50 text-emerald-400' : 'bg-slate-800'
                            }`}>
                            {decision.status.replace('_', ' ')}
                        </span>
                    </div>
                    <p className="text-xs text-slate-400 font-mono tracking-widest uppercase">ID: {decision._id.substring(0, 8)} | Generated: {new Date(decision.createdAt).toLocaleString()}</p>
                </div>

                {isPending && (
                    <div className="flex items-center gap-3">
                        <button onClick={() => {
                            const reason = prompt('Reason for rejection?');
                            if (reason) handleAction('reject', { reason });
                        }} className="bg-slate-800 hover:bg-slate-700 text-red-400 text-sm font-bold border border-slate-600 px-4 py-2 rounded">
                            Reject
                        </button>
                        <button onClick={() => handleAction('approve')} className="bg-brand-700 hover:bg-brand-600 text-white text-sm font-bold border border-brand-800 px-6 py-2 rounded">
                            Approve Decision
                        </button>
                    </div>
                )}
                {decision.status === 'approved' && (
                    <button onClick={() => handleAction('apply')} className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow px-6 py-2 rounded animate-pulse">
                        APPLY TO LIVE SYSTEM
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Left Column Data Truth */}
                <div className="space-y-4">
                    <div className="card space-y-3">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-surface-border pb-2">Scoring</h3>
                        <div>
                            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Urgency</span>
                            <span className={`text-2xl font-bold mt-0.5 ${decision.urgencyScore > 75 ? 'text-red-500' : 'text-orange-400'}`}>{decision.urgencyScore}</span>
                        </div>
                        <div>
                            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">AI Confidence</span>
                            <span className={`text-2xl font-bold mt-0.5 ${decision.confidenceScore > 80 ? 'text-emerald-400' : 'text-orange-400'}`}>{decision.confidenceScore}%</span>
                        </div>
                        <div>
                            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Data Freshness</span>
                            {decision.dataSources?.freshness?.inventory?.status === 'fresh' ?
                                <span className="text-sm font-bold text-emerald-400 block mt-1">Live / Verified</span> :
                                <span className="text-sm font-bold text-orange-400 block mt-1">Stale / Degraded</span>
                            }
                        </div>
                        <div>
                            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Trigger Event</span>
                            <span className="text-sm font-medium text-slate-200 mt-0.5 block">{decision.trigger}</span>
                        </div>
                    </div>
                </div>

                {/* Right Column Engine Review */}
                <div className="lg:col-span-3 space-y-6">

                    <div className="card border-brand-800/50 bg-brand-950/10">
                        <h3 className="text-xs font-bold text-brand-400 uppercase tracking-widest mb-4">Recommended Optimization Plan</h3>

                        {decision.recommendations?.map((r, i) => (
                            <div key={i} className="mb-4">
                                <p className="text-lg font-bold text-white tracking-wide">{r.action}</p>
                                <p className="text-sm text-slate-300 mt-1">{r.description}</p>
                                <p className="text-xs text-slate-400 mt-2 bg-slate-900 border border-slate-700 p-2 inline-block rounded">
                                    <strong className="text-slate-500 uppercase tracking-widest mr-2">Trade-offs</strong>{r.tradeOffs}
                                </p>
                            </div>
                        ))}

                        <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 grid grid-cols-4 gap-4 mt-4">
                            <div>
                                <span className="text-[10px] text-slate-500 font-bold uppercase block tracking-widest">Est. Travel</span>
                                <span className="text-white font-mono text-base">{decision.selectedPlan?.estimatedTravelTimeMinutes} mins</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-slate-500 font-bold uppercase block tracking-widest">Est. Distance</span>
                                <span className="text-white font-mono text-base">{decision.selectedPlan?.distanceKm} km</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-slate-500 font-bold uppercase block tracking-widest">Route Risk Score</span>
                                <span className="text-white font-mono text-base">{decision.selectedPlan?.riskScore} ({decision.selectedPlan?.riskLevel})</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-slate-500 font-bold uppercase block tracking-widest">Vehicles</span>
                                <span className="text-white font-mono text-base">{decision.selectedPlan?.vehicleAssignments?.[0]?.vehicleNo || 'None'}</span>
                            </div>
                        </div>
                    </div>

                    {decision.alternativePlans?.length > 0 && (
                        <div className="card border border-slate-700 bg-slate-900 shadow">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Rejected Alternative Plans</h3>
                            {decision.alternativePlans.map((alt, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-slate-800 p-3 rounded mb-2 border border-slate-700">
                                    <div>
                                        <div className="text-sm font-bold text-slate-300 uppercase tracking-wider">{alt._typeLabel}</div>
                                        <div className="text-xs text-slate-500 space-x-3 mt-1">
                                            <span>ETA: {alt.estimatedTravelTimeMinutes} mins</span>
                                            <span>Dist: {alt.distanceKm} km</span>
                                            <span>Risk: {alt.riskScore}</span>
                                        </div>
                                    </div>
                                    <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest bg-slate-900 text-slate-500 rounded border border-slate-700">Suboptimal</span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="card">
                            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Supporting Evidence</h3>
                            <ul className="list-disc pl-5 space-y-1 text-xs text-slate-300">
                                {decision.reasons.map((rs, i) => <li key={i}>{rs}</li>)}
                            </ul>
                        </div>
                        <div className="card">
                            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Model Assumptions</h3>
                            <ul className="list-disc pl-5 space-y-1 text-xs text-slate-300">
                                {decision.assumptions.map((ass, i) => <li key={i}>{ass}</li>)}
                            </ul>
                            <p className="text-[10px] font-mono text-slate-600 mt-4">Risk config {decision.versions?.risk} | Opt {decision.versions?.optimization}</p>
                        </div>
                    </div>

                    {/* Targeted Sandbox Sim */}
                    {isPending && (
                        <div className="card border-blue-900/30 bg-blue-950/10 mt-6">
                            <h3 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <span>Targeted Impact Sandbox</span>
                            </h3>
                            <div className="flex gap-4 items-center">
                                <label className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                                    <input type="checkbox" className="accent-blue-500" checked={simBlockRoute} onChange={e => setSimBlockRoute(e.target.checked)} /> Route Compromised
                                </label>
                                <label className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                                    <input type="checkbox" className="accent-blue-500" checked={simVeh} onChange={e => setSimVeh(e.target.checked)} /> Missing Vehicle
                                </label>
                                <button onClick={handleRunSim} className="bg-slate-800 hover:bg-slate-700 text-xs font-bold px-4 py-1.5 rounded shadow text-slate-200 transition-colors">
                                    Test
                                </button>
                            </div>

                            {simResult && (
                                <div className="mt-4 p-4 border border-slate-700 bg-slate-900 rounded grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Plan Original</p>
                                        <p className="text-sm mt-1 text-brand-300">Risk: {simResult.original.Risk} | ETA: {simResult.original.ETAHr}h</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Sandbox Trajectory</p>
                                        <p className="text-sm mt-1 text-orange-400">Risk: {simResult.simulated.Risk} | ETA: {simResult.simulated.ETAHr}h</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default DecisionDetail;
