import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '../context/AuthContext';
import MainLayout from '../layouts/MainLayout';

// Pages
import Login from '../pages/Login';
import Register from '../pages/Register';
import Dashboard from '../pages/Dashboard';
import NotFound from '../pages/NotFound';
import PlaceholderPage from '../pages/PlaceholderPage';

// Phase 1 Pages
import Locations from '../pages/Locations';
import Items from '../pages/Items';
import Inventory from '../pages/Inventory';
import Consumption from '../pages/Consumption';
import Vehicles from '../pages/Vehicles';
import Shipments from '../pages/Shipments';
import ForecastPage from '../pages/Forecast';

// Phase 3 Pages
import MapPage from '../pages/MapPage';

// Phase 5 Pages
import RiskDashboard from '../pages/risk/RiskDashboard';
import RiskDetail from '../pages/risk/RiskDetail';

// Phase 6 Pages
import OptimizationCenter from '../pages/optimization/OptimizationCenter';

// Phase 7 Pages
import DevicesList from '../pages/devices/DevicesList';
import DeviceDetail from '../pages/devices/DeviceDetail';

// Decision Center Pages
import DecisionCenter from '../pages/decisions/DecisionCenter';
import DecisionDetail from '../pages/decisions/DecisionDetail';

// Protected route wrapper
const ProtectedRoute = ({ children }) => {
    const { isAuthenticated } = useAuth();
    return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Redirect authenticated users away from auth pages
const PublicRoute = ({ children }) => {
    const { isAuthenticated } = useAuth();
    return !isAuthenticated ? children : <Navigate to="/dashboard" replace />;
};

const AppRoutes = () => (
    <Routes>
        {/* Root redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Public routes */}
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

        {/* Protected routes */}
        <Route
            element={
                <ProtectedRoute>
                    <MainLayout />
                </ProtectedRoute>
            }
        >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/locations" element={<Locations />} />
            <Route path="/items" element={<Items />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/consumption" element={<Consumption />} />
            <Route path="/vehicles" element={<Vehicles />} />
            <Route path="/shipments" element={<Shipments />} />

            {/* GIS Logistics Map (Routes) */}
            <Route path="/map" element={<Navigate to="/routes" replace />} />
            <Route path="/routes" element={<MapPage />} />
            <Route path="/forecasting" element={<ForecastPage />} />
            <Route path="/risk" element={<RiskDashboard />} />
            <Route path="/risk/:id" element={<RiskDetail />} />
            <Route path="/optimization" element={<OptimizationCenter />} />
            <Route path="/decision-center" element={<DecisionCenter />} />
            <Route path="/decisions/:id" element={<DecisionDetail />} />
            <Route path="/devices" element={<DevicesList />} />
            <Route path="/devices/:id" element={<DeviceDetail />} />
            <Route path="/alerts" element={<PlaceholderPage title="Alerts" icon="🔔" phase="3" />} />
            <Route path="/settings" element={<PlaceholderPage title="Settings" icon="⚙️" phase="1" />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
    </Routes>
);

const AppRouter = () => (
    <BrowserRouter>
        <AuthProvider>
            <AppRoutes />
        </AuthProvider>
    </BrowserRouter>
);

export default AppRouter;
