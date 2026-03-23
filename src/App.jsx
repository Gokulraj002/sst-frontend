import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { NotificationProvider } from './context/NotificationContext.jsx';
import ProtectedRoute from './components/Auth/ProtectedRoute.jsx';
import MainLayout from './components/Layout/MainLayout.jsx';
import Toast from './components/Common/Toast.jsx';

const LoginPage = lazy(() => import('./pages/Login.jsx'));
const DashboardPage = lazy(() => import('./pages/Dashboard.jsx'));
const LeadsPage = lazy(() => import('./pages/Leads.jsx'));
const QuotationsPage = lazy(() => import('./pages/Quotations.jsx'));
const BookingsPage = lazy(() => import('./pages/Bookings.jsx'));
const OperationsPage = lazy(() => import('./pages/Operations.jsx'));
const ItineraryPage = lazy(() => import('./pages/Itinerary.jsx'));
const VisaPage = lazy(() => import('./pages/Visa.jsx'));
const InventoryPage = lazy(() => import('./pages/Inventory.jsx'));
const DocumentsPage = lazy(() => import('./pages/Documents.jsx'));
const FinancePage = lazy(() => import('./pages/Finance.jsx'));
const PnLPage = lazy(() => import('./pages/PnL.jsx'));
const VendorPayPage = lazy(() => import('./pages/VendorPay.jsx'));
const ExpensesPage = lazy(() => import('./pages/Expenses.jsx'));
const VouchersPage = lazy(() => import('./pages/Vouchers.jsx'));
const RefundsPage = lazy(() => import('./pages/Refunds.jsx'));
const HRPage = lazy(() => import('./pages/HR.jsx'));
const CustomersPage = lazy(() => import('./pages/Customers.jsx'));
const SuppliersPage = lazy(() => import('./pages/Suppliers.jsx'));
const CommissionsPage = lazy(() => import('./pages/Commissions.jsx'));
const ApprovalsPage = lazy(() => import('./pages/Approvals.jsx'));
const ReportsPage = lazy(() => import('./pages/Reports.jsx'));
const AuditPage = lazy(() => import('./pages/Audit.jsx'));
const IAMPage = lazy(() => import('./pages/IAM.jsx'));
const SettingsPage = lazy(() => import('./pages/Settings.jsx'));
const NotificationsPage = lazy(() => import('./pages/Notifications.jsx'));
const LeadDetailPage = lazy(() => import('./pages/LeadDetail.jsx'));

const PageLoader = () => (
  <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
    <div className="spinner-border text-primary" role="status">
      <span className="visually-hidden">Loading...</span>
    </div>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <NotificationProvider>
          <Toast />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <MainLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="leads" element={<LeadsPage />} />
                <Route path="leads/:id" element={<LeadDetailPage />} />
                <Route path="quotations" element={<QuotationsPage />} />
                <Route path="bookings" element={<BookingsPage />} />
                <Route path="operations" element={<OperationsPage />} />
                <Route path="itinerary" element={<ItineraryPage />} />
                <Route path="visa" element={<VisaPage />} />
                <Route path="inventory" element={<InventoryPage />} />
                <Route path="documents" element={<DocumentsPage />} />
                <Route path="finance" element={<FinancePage />} />
                <Route path="pnl" element={<PnLPage />} />
                <Route path="vendorpay" element={<VendorPayPage />} />
                <Route path="expenses" element={<ExpensesPage />} />
                <Route path="vouchers" element={<VouchersPage />} />
                <Route path="refunds" element={<RefundsPage />} />
                <Route path="hr" element={<HRPage />} />
                <Route path="customers" element={<CustomersPage />} />
                <Route path="suppliers" element={<SuppliersPage />} />
                <Route path="commissions" element={<CommissionsPage />} />
                <Route path="approvals" element={<ApprovalsPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="audit" element={<AuditPage />} />
                <Route path="iam" element={<IAMPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
          </NotificationProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
