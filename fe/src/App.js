import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import CityDashboard from './pages/CityDashboard';
import WardDashboard from './pages/WardDashboard';

// Component để redirect dựa trên role
const RoleBasedRedirect = () => {
  const { user, loading, isAuthenticated } = useAuth();

  console.log('🔄 RoleBasedRedirect render:');
  console.log('   - user:', user);
  console.log('   - loading:', loading);
  console.log('   - isAuthenticated:', isAuthenticated);
  console.log('   - token exists:', !!localStorage.getItem('token'));

  if (loading) {
    console.log('🔄 Still loading, showing spinner...');
    return <div>Loading...</div>;
  }

  if (!isAuthenticated || !user) {
    console.log('❌ Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  console.log('✅ User authenticated, role:', user.role);
  
  switch (user.role) {
    case 'admin':
      console.log('➡️ Redirecting to admin dashboard');
      return <Navigate to="/admin/dashboard" replace />;
    case 'city':
      console.log('➡️ Redirecting to city dashboard');
      return <Navigate to="/city/dashboard" replace />;
    case 'ward':
      console.log('➡️ Redirecting to ward dashboard');
      return <Navigate to={`/ward/dashboard/${user.ward_id}`} replace />;
    default:
      console.log('⚠️ Unknown role, redirecting to login');
      return <Navigate to="/login" replace />;
  }
};

const AppContent = () => {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        
        {/* Protected routes with role-based access */}
        <Route 
          path="/admin/dashboard" 
          element={
            <PrivateRoute requiredRole="admin">
              <AdminDashboard />
            </PrivateRoute>
          } 
        />
        
        <Route 
          path="/city/dashboard" 
          element={
            <PrivateRoute requiredRole="city">
              <CityDashboard />
            </PrivateRoute>
          } 
        />
        
        <Route 
          path="/ward/dashboard/:ward_id" 
          element={
            <PrivateRoute requiredRole={["city", "ward"]}>
              <WardDashboard />
            </PrivateRoute>
          } 
        />
        
        {/* Default redirect based on user role */}
        <Route path="/" element={<RoleBasedRedirect />} />
        
        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

const App = () => {
  return (
    <ConfigProvider locale={viVN}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ConfigProvider>
  );
};

export default App; 