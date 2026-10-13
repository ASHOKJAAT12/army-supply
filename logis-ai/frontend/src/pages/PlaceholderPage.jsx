const PlaceholderPage = ({ title, icon, phase }) => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="text-5xl mb-4">{icon}</div>
        <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
        <p className="text-slate-400 mb-4 max-w-sm">
            This module will be implemented in <span className="text-brand-400 font-medium">Phase {phase}</span>.
        </p>
        <span className="badge-slate">Coming in Phase {phase}</span>
    </div>
);

export default PlaceholderPage;
