import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('React Error Boundary Caught:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-surface rounded-xl border border-surface-border p-6 text-center">
                    <span className="text-4xl mb-4">🚨</span>
                    <h2 className="text-xl font-bold text-white mb-2">Something went wrong.</h2>
                    <p className="text-slate-400 text-sm max-w-md mb-6">
                        The UI component crashed during execution. This boundary prevents the entire application from blank-screening.
                    </p>
                    <button
                        onClick={() => window.location.href = '/'}
                        className="btn-primary"
                    >
                        Return to Command Center
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
