import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import BuyerDashboard from './pages/BuyerDashboard';
import SellerDashboard from './pages/SellerDashboard';
import GigDetails from './pages/GigDetails';
import BuyerOrders from './pages/BuyerOrders';
import SellerOrders from './pages/SellerOrders';
import MessagesPage from './pages/MessagesPage';
import OrderDetails from './pages/OrderDetails';
import Wallet from './pages/Wallet';
import Profile from './pages/Profile';
import Reports from './pages/Reports';

// A tiny helper component to route users to the right landing page if they hit "/"
function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'Admin') return <Navigate to="/admin" replace />;
  if (user.role === 'Seller' || user.role === 'Both') return <Navigate to="/seller" replace />;
  return <Navigate to="/buyer" replace />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="brand-shell flex flex-col min-h-screen">
          <Navbar />
          <main className="flex-grow flex flex-col">
            <Routes>
              <Route path="/" element={<HomeRedirect />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* Publicly Viewable App Pages */}
              <Route path="/gigs/:id" element={<GigDetails />} />
              
              {/* Protected Routes */}
              <Route 
                path="/admin/*" 
                element={
                  <ProtectedRoute allowedRoles={['Admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/buyer/*" 
                element={
                  <ProtectedRoute allowedRoles={['Buyer', 'Both']}>
                    <BuyerDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/buyer/orders" 
                element={
                  <ProtectedRoute allowedRoles={['Buyer', 'Both']}>
                    <BuyerOrders />
                  </ProtectedRoute>
                } 
              />
              <Route
                path="/orders/:orderId"
                element={
                  <ProtectedRoute allowedRoles={['Buyer', 'Seller', 'Both']}>
                    <OrderDetails />
                  </ProtectedRoute>
                }
              />
              <Route 
                path="/seller/*" 
                element={
                  <ProtectedRoute allowedRoles={['Seller', 'Both']}>
                    <SellerDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/seller/orders" 
                element={
                  <ProtectedRoute allowedRoles={['Seller', 'Both']}>
                    <SellerOrders />
                  </ProtectedRoute>
                } 
              />
              <Route
                path="/messages"
                element={
                  <ProtectedRoute allowedRoles={['Buyer', 'Seller', 'Both']}>
                    <MessagesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/wallet"
                element={
                  <ProtectedRoute allowedRoles={['Buyer', 'Seller', 'Both']}>
                    <Wallet />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute allowedRoles={['Buyer', 'Seller', 'Both']}>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Seller', 'Both']}>
                    <Reports />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
