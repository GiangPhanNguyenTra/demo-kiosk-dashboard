import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Spin } from 'antd';

const PrivateRoute = ({ children, requiredRole = null }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole) {
    if (Array.isArray(requiredRole)) {
      if (!requiredRole.includes(user?.role)) {
        // Redirect to appropriate dashboard based on user role
        switch (user?.role) {
          case 'admin':
            return <Navigate to="/admin/dashboard" replace />;
          case 'city':
            return <Navigate to="/city/dashboard" replace />;
          case 'ward':
            return <Navigate to="/ward/dashboard" replace />;
          default:
            return <Navigate to="/login" replace />;
        }
      }
    } else if (user?.role !== requiredRole) {
      // Redirect to appropriate dashboard based on user role
      switch (user?.role) {
        case 'admin':
          return <Navigate to="/admin/dashboard" replace />;
        case 'city':
          return <Navigate to="/city/dashboard" replace />;
        case 'ward':
          return <Navigate to="/ward/dashboard" replace />;
        default:
          return <Navigate to="/login" replace />;
      }
    }
  }

  return children;
};

export default PrivateRoute; 