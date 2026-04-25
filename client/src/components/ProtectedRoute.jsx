import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user } = useAuth();

  if (!user) {
    // If not logged in, redirect to login page
    return <Navigate to="/login" replace />;
  }

  // Check role authorization (optional array prop)
  if (allowedRoles && !allowedRoles.includes(user.role) && user.role !== 'Admin') {
    // Both role can usually access both, but an Admin overrides everything
    if (user.role === 'Both' && (allowedRoles.includes('Buyer') || allowedRoles.includes('Seller'))) {
      return children;
    }
    
    // Redirect un-authorized user. If they are a buyer, go to buyer, etc.
    const fallbackPath = user.role === 'Admin' ? '/admin' : user.role === 'Seller' || user.role === 'Both' ? '/seller' : '/buyer';
    return <Navigate to={fallbackPath} replace />;
  }

  // Authorized
  return children;
}
