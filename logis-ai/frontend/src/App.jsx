import { AuthProvider } from './context/AuthContext';
import AppRouter from './routes/AppRouter';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
    return (
        <ErrorBoundary>
            <AuthProvider>
                <AppRouter />
            </AuthProvider>
        </ErrorBoundary>
    );
}

export default App;
