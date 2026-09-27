import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { GuestOnlyRoute } from '@/components/auth/GuestOnlyRoute';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { LandingPage } from '@/pages/LandingPage';
import { CatalogPage } from '@/pages/CatalogPage';
import { CourseDetailPage } from '@/pages/CourseDetailPage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { VerifyOtpPage } from '@/pages/VerifyOtpPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { LearningPage } from '@/pages/LearningPage';
import { QuizPage } from '@/pages/QuizPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { CertificatesPage } from '@/pages/CertificatesPage';
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage';
import { AdminCoursesPage } from '@/pages/admin/AdminCoursesPage';
import { AdminCourseEditPage } from '@/pages/admin/AdminCourseEditPage';
import { AdminCategoriesPage } from '@/pages/admin/AdminCategoriesPage';
import { AdminQuizzesPage } from '@/pages/admin/AdminQuizzesPage';
import { AdminOrdersPage } from '@/pages/admin/AdminOrdersPage';
import { CertificateVerifyPage } from '@/pages/CertificateVerifyPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<LandingPage />} />
        <Route path="courses" element={<CatalogPage />} />
        <Route path="courses/:courseId" element={<CourseDetailPage />} />
        <Route path="verify-certificate" element={<CertificateVerifyPage />} />
        <Route element={<AuthLayout />}>
          <Route
            path="login"
            element={
              <GuestOnlyRoute>
                <LoginPage />
              </GuestOnlyRoute>
            }
          />
          <Route
            path="register"
            element={
              <GuestOnlyRoute>
                <RegisterPage />
              </GuestOnlyRoute>
            }
          />
          <Route
            path="verify-otp"
            element={
              <GuestOnlyRoute>
                <VerifyOtpPage />
              </GuestOnlyRoute>
            }
          />
          <Route
            path="forgot-password"
            element={
              <GuestOnlyRoute>
                <ForgotPasswordPage />
              </GuestOnlyRoute>
            }
          />
          <Route
            path="reset-password"
            element={
              <GuestOnlyRoute>
                <ResetPasswordPage />
              </GuestOnlyRoute>
            }
          />
        </Route>
        <Route
          path="dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="learn/:enrollmentId"
          element={
            <ProtectedRoute>
              <LearningPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="quiz/:courseId"
          element={
            <ProtectedRoute>
              <QuizPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="certificates"
          element={
            <ProtectedRoute>
              <CertificatesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin"
          element={
            <ProtectedRoute adminOnly>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboardPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="courses" element={<AdminCoursesPage />} />
          <Route path="courses/:courseId" element={<AdminCourseEditPage />} />
          <Route path="categories" element={<AdminCategoriesPage />} />
          <Route path="quizzes" element={<AdminQuizzesPage />} />
          <Route path="orders" element={<AdminOrdersPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
