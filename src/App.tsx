/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { LanguageProvider } from './contexts/LanguageContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppProvider, useApp } from './contexts/AppContext';
import { ToastProvider } from './contexts/ToastContext';
import { calculateTechnicianCompletion } from './utils/profileCompletion';

import { SplashLoader } from './components/common/SplashLoader';
import { FloatingPWAWidget } from './components/common/FloatingPWAWidget';
import { ScrollToTopButton } from './components/common/ScrollToTopButton';
import { ScrollToTop } from './components/common/ScrollToTop';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Layout
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { MobileNav } from './components/layout/MobileNav';

// Pages
import { HomePage } from './pages/HomePage';
import { ServicesPage } from './pages/ServicesPage';
import { ProfessionalsPage } from './pages/ProfessionalsPage';
import { ProfessionalDetailPage } from './pages/ProfessionalDetailPage';
import { SearchPage } from './pages/SearchPage';
import { BookPage } from './pages/BookPage';
import { BookingDetailPage } from './pages/BookingDetailPage';
import { EmergencyPage } from './pages/EmergencyPage';
import { HowItWorksPage } from './pages/HowItWorksPage';
import { SafetyPage } from './pages/SafetyPage';
import { BecomeProfessionalPage } from './pages/BecomeProfessionalPage';
import { HeatmapPage } from './pages/HeatmapPage';
import { MapPage } from './pages/MapPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { CustomerDashboard } from './pages/CustomerDashboard';
import { TechnicianDashboard } from './pages/TechnicianDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { DashboardRouter } from './pages/DashboardRouter';
import { NotFoundPage } from './pages/NotFoundPage';

const RequireAuth: React.FC<{ children: React.ReactNode; allowedRoles?: Array<'CUSTOMER' | 'TECHNICIAN' | 'ADMIN'> }> = ({
  children,
  allowedRoles
}) => {
  const { isAuthenticated, currentUser } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !currentUser) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const TechnicianVerificationGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const { technicians } = useApp();
  const location = useLocation();

  if (currentUser?.role === 'TECHNICIAN') {
    const myTech = technicians.find(
      (t) =>
        t.userId === currentUser.id ||
        (!!currentUser.email && !!t.email && t.email.toLowerCase() === currentUser.email.toLowerCase())
    );
    if (myTech) {
      const comp = calculateTechnicianCompletion(myTech);
      const isApproved = !!myTech.skillVerified && comp.isMinReady;
      const allowedPaths = [
        '/technician/dashboard',
        '/technician/jobs',
        '/technician/portfolio',
        '/professionals',
        '/login',
        '/register'
      ];
      const isAllowed = allowedPaths.some(p => location.pathname.startsWith(p));
      if (!isApproved && !isAllowed) {
        return <Navigate to="/technician/dashboard?tab=profile" replace />;
      }
    }
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <ToastProvider>
            <AuthProvider>
              <AppProvider>
                <SplashLoader />
                <BrowserRouter>
                <ScrollToTop />
                <div className="min-h-screen flex flex-col overflow-x-clip bg-stone-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors duration-200 selection:bg-orange-500 selection:text-white">
                  <Navbar />
                  <main className="flex-1 pb-16 lg:pb-0">
                    <TechnicianVerificationGuard>
                      <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/services" element={<ServicesPage />} />
                        <Route path="/services/:id" element={<ServicesPage />} />
                        <Route path="/professionals" element={<ProfessionalsPage />} />
                        <Route
                          path="/professionals/:id"
                          element={
                            <RequireAuth>
                              <ProfessionalDetailPage />
                            </RequireAuth>
                          }
                        />
                        <Route path="/search" element={<SearchPage />} />
                        <Route
                          path="/book"
                          element={
                            <RequireAuth>
                              <BookPage />
                            </RequireAuth>
                          }
                        />
                        <Route
                          path="/booking/:id"
                          element={
                            <RequireAuth>
                              <BookingDetailPage />
                            </RequireAuth>
                          }
                        />
                        <Route path="/emergency" element={<EmergencyPage />} />
                        <Route path="/heatmap" element={<HeatmapPage />} />
                        <Route path="/map" element={<MapPage />} />
                        <Route path="/how-it-works" element={<HowItWorksPage />} />
                        <Route path="/safety" element={<SafetyPage />} />
                        <Route path="/become-professional" element={<BecomeProfessionalPage />} />
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/register" element={<RegisterPage />} />
                        <Route
                          path="/dashboard"
                          element={
                            <RequireAuth>
                              <DashboardRouter />
                            </RequireAuth>
                          }
                        />
                        <Route
                          path="/customer/dashboard"
                          element={
                            <RequireAuth allowedRoles={['CUSTOMER']}>
                              <CustomerDashboard />
                            </RequireAuth>
                          }
                        />
                        <Route
                          path="/customer/bookings"
                          element={
                            <RequireAuth allowedRoles={['CUSTOMER']}>
                              <CustomerDashboard />
                            </RequireAuth>
                          }
                        />
                        <Route
                          path="/customer/favorites"
                          element={
                            <RequireAuth allowedRoles={['CUSTOMER']}>
                              <CustomerDashboard />
                            </RequireAuth>
                          }
                        />
                        <Route
                          path="/customer/messages"
                          element={
                            <RequireAuth allowedRoles={['CUSTOMER']}>
                              <CustomerDashboard />
                            </RequireAuth>
                          }
                        />
                        <Route
                          path="/technician/dashboard"
                          element={
                            <RequireAuth allowedRoles={['TECHNICIAN', 'ADMIN']}>
                              <TechnicianDashboard />
                            </RequireAuth>
                          }
                        />
                        <Route
                          path="/technician/jobs"
                          element={
                            <RequireAuth allowedRoles={['TECHNICIAN', 'ADMIN']}>
                              <TechnicianDashboard />
                            </RequireAuth>
                          }
                        />
                        <Route
                          path="/technician/earnings"
                          element={
                            <RequireAuth allowedRoles={['TECHNICIAN', 'ADMIN']}>
                              <TechnicianDashboard />
                            </RequireAuth>
                          }
                        />
                        <Route
                          path="/technician/messages"
                          element={
                            <RequireAuth allowedRoles={['TECHNICIAN', 'ADMIN']}>
                              <TechnicianDashboard />
                            </RequireAuth>
                          }
                        />
                        <Route
                          path="/technician/portfolio"
                          element={
                            <RequireAuth allowedRoles={['TECHNICIAN', 'ADMIN']}>
                              <TechnicianDashboard />
                            </RequireAuth>
                          }
                        />
                        <Route
                          path="/admin/dashboard"
                          element={
                            <RequireAuth allowedRoles={['ADMIN']}>
                              <AdminDashboard />
                            </RequireAuth>
                          }
                        />
                        <Route
                          path="/admin/users"
                          element={
                            <RequireAuth allowedRoles={['ADMIN']}>
                              <AdminDashboard />
                            </RequireAuth>
                          }
                        />
                        <Route
                          path="/admin/technicians"
                          element={
                            <RequireAuth allowedRoles={['ADMIN']}>
                              <AdminDashboard />
                            </RequireAuth>
                          }
                        />
                        <Route
                          path="/admin/bookings"
                          element={
                            <RequireAuth allowedRoles={['ADMIN']}>
                              <AdminDashboard />
                            </RequireAuth>
                          }
                        />
                        <Route
                          path="/admin/reports"
                          element={
                            <RequireAuth allowedRoles={['ADMIN']}>
                              <AdminDashboard />
                            </RequireAuth>
                          }
                        />
                        <Route path="*" element={<NotFoundPage />} />
                      </Routes>
                    </TechnicianVerificationGuard>
                  </main>
                  <Footer />
                  <MobileNav />
                  <FloatingPWAWidget />
                  <ScrollToTopButton />
                </div>
              </BrowserRouter>
            </AppProvider>
          </AuthProvider>
        </ToastProvider>
      </LanguageProvider>
    </ThemeProvider>
    </ErrorBoundary>
  );
}
