import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch } from '@/app/store';
import { logout } from '@/app/slices/authSlice';
import AppLayout from '@/components/layout/AppLayout';
import PrivateRoute from '@/components/common/PrivateRoute';
import Dashboard from '@/pages/Dashboard';
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import PurchaseOrders from '@/pages/purchaseOrders/PurchaseOrders';
import PurchaseOrderDetails from '@/pages/PurchaseOrderDetails';
import SupplierCollaboration from '@/pages/SupplierCollaboration';
import Cockpit from '@/pages/Cockpit';
import LineItemDetails from '@/pages/LineItemDetails';
import Delegation from '@/pages/Delegation';
import Chat from '@/pages/Chat';
import Settings from '@/pages/Settings';
import { UserRole } from '@/models';
import { UNAUTHORIZED_EVENT } from '@/api/axios';

const AuthRedirectHandler: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    const handleUnauthorized = () => {
      dispatch(logout());
      if (location.pathname !== '/login') {
        navigate('/login', { replace: true, state: { from: location } });
      }
    };

    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);

    return () => {
      window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    };
  }, [dispatch, location, navigate]);

  return null;
};

const AppRoutes: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthRedirectHandler />
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <AppLayout>
                <Dashboard />
              </AppLayout>
            </PrivateRoute>
          }
        />
        
        <Route
          path="/purchase-orders"
          element={
            <PrivateRoute>
              <AppLayout>
                <PurchaseOrders />
              </AppLayout>
            </PrivateRoute>
          }
        />
        
        <Route
          path="/purchase-orders/:id"
          element={
            <PrivateRoute>
              <AppLayout>
                <PurchaseOrderDetails />
              </AppLayout>
            </PrivateRoute>
          }
        />

        <Route
          path="/purchase-orders/:id/line-items/:lineId"
          element={
            <PrivateRoute>
              <AppLayout>
                <LineItemDetails />
              </AppLayout>
            </PrivateRoute>
          }
        />

        <Route
          path="/supplier-collaboration"
          element={
            <PrivateRoute allowedRoles={[UserRole.SUPPLIER, UserRole.ADMIN]}>
              <AppLayout>
                <SupplierCollaboration />
              </AppLayout>
            </PrivateRoute>
          }
        />

        <Route
          path="/cockpit"
          element={
            <PrivateRoute allowedRoles={[UserRole.PROCUREMENT_SPECIALIST, UserRole.ADMIN]}>
              <AppLayout>
                <Cockpit />
              </AppLayout>
            </PrivateRoute>
          }
        />
        
        <Route
          path="/delegation"
          element={
            <PrivateRoute allowedRoles={[UserRole.PROCUREMENT_SPECIALIST, UserRole.ADMIN]}>
              <AppLayout>
                <Delegation />
              </AppLayout>
            </PrivateRoute>
          }
        />
        
        <Route
          path="/chat"
          element={
            <PrivateRoute>
              <AppLayout>
                <Chat />
              </AppLayout>
            </PrivateRoute>
          }
        />
        
        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <AppLayout>
                <Settings />
              </AppLayout>
            </PrivateRoute>
          }
        />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/purchase-orders" replace />} />
        <Route path="*" element={<Navigate to="/purchase-orders" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;
