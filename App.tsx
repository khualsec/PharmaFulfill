import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import HomePage from "./components/HomePage";
import LoginSelector from "./components/LoginSelector";
import LoginPatientPharmacist from "./components/LoginPatientPharmacist";
import LoginTechAdmin from "./components/LoginTechAdmin";
import SignUpSelector from "./components/SignUpSelector";
import SignUpPatient from "./components/SignUpPatient";
import SignUpStaff from "./components/SignUpStaff";
import PatientDashboard from "./components/PatientDashboard";
import PharmacistDashboard from "./components/PharmacistDashboard";
import TechDashboard from "./components/TechDashboard";
import AdminDashboard from "./components/AdminDashboard";
import VerifyEmailPage from "./components/VerifyEmailPage";
import { PrescriptionFilling } from "./components/PrescriptionFilling";
import { Toaster } from "./components/ui/sonner";

type Role = "Patient" | "Pharmacist" | "Tech" | "Admin";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: Role[];
}

function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role as Role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<HomePage />} />

      {/* Login flows */}
      <Route
        path="/login"
        element={
          user ? (
            <Navigate
              to={`/dashboard/${user.role.toLowerCase()}`}
              replace
            />
          ) : (
            <LoginSelector />
          )
        }
      />
      <Route
        path="/login/patient-pharmacist"
        element={<LoginPatientPharmacist />}
      />
      <Route path="/login/tech-admin" element={<LoginTechAdmin />} />

      {/* Signup */}
      <Route path="/signup" element={<SignUpSelector />} />
      <Route path="/signup/patient" element={<SignUpPatient />} />
      <Route path="/signup/staff" element={<SignUpStaff />} />

      {/* Email verification */}
      <Route path="/verify/:token" element={<VerifyEmailPage />} />

      {/* Dashboards */}
      <Route
        path="/dashboard/patient"
        element={
          <ProtectedRoute allowedRoles={["Patient"]}>
            <PatientDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/pharmacist"
        element={
          <ProtectedRoute allowedRoles={["Pharmacist"]}>
            <PharmacistDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/tech"
        element={
          <ProtectedRoute allowedRoles={["Tech"]}>
            <TechDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/admin"
        element={
          <ProtectedRoute allowedRoles={["Admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* Pharmacist – filling workflow route (matches navigate(`/dashboard/pharmacist/fill/${id}`) ) */}
      <Route
        path="/dashboard/pharmacist/fill/:rxId"
        element={
          <ProtectedRoute allowedRoles={["Pharmacist"]}>
            <PrescriptionFilling />
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppRoutes />
          {/* Global toast notifications */}
          <Toaster />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}