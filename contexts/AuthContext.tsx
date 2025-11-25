import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../lib/api";

type Role = "Patient" | "Pharmacist" | "Tech" | "Admin";

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  username?: string;
}

interface PatientSignupData {
  firstName: string;
  lastName: string;
  dob: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
}

interface StaffSignupData {
  fullName: string;
  role: "Pharmacist" | "Tech" | "Admin";
  email: string;
  password: string;
  confirmPassword?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (identifier: string, password: string, role: Role) => Promise<boolean>;
  signup: (data: PatientSignupData | StaffSignupData) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "pharma-user";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load user from localStorage on startup
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: User = JSON.parse(saved);
        setUser(parsed);
      }
    } catch (err) {
      console.error("Failed to parse stored user:", err);
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setLoading(false);
    }
  }, []);

  const persistUser = (u: User | null) => {
    setUser(u);
    if (u) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const login = async (
    identifier: string,
    password: string,
    role: Role
  ): Promise<boolean> => {
    setError(null);
    try {
      const res = await api.post<{ user: User }>("/api/auth/login", {
        identifier,
        password,
        role,
      });

      if (!res.ok) {
        setError((res.data as any)?.error || "Login failed");
        return false;
      }

      const loggedInUser = res.data.user;
      if (!loggedInUser) {
        setError("Invalid response from server.");
        return false;
      }

      persistUser(loggedInUser);
      return true;
    } catch (err) {
      console.error("Login error:", err);
      setError("Unable to connect to server.");
      return false;
    }
  };

  // Unified signup (patient vs staff)
  const signup = async (
    data: PatientSignupData | StaffSignupData
  ): Promise<boolean> => {
    setError(null);

    // Patient signup (has dob)
    if ("dob" in data) {
      const payload = {
        firstName: data.firstName,
        lastName: data.lastName,
        dob: data.dob,
        email: data.email,
        password: data.password,
        phone: data.phone || undefined,
        address: data.address || undefined,
      };

      try {
        const res = await api.post("/api/auth/signup/patient", payload, {
          successMessage:
            "Account created! Please check your email to verify.",
        });

        if (!res.ok) {
          setError((res.data as any)?.error || "Signup failed");
          return false;
        }

        // No auto-login; must verify via email
        return true;
      } catch (err) {
        console.error("Patient signup error:", err);
        setError("Unable to connect to server.");
        return false;
      }
    }

    // Staff signup request
    const staff = data as StaffSignupData;

    try {
      const res = await api.post(
        "/api/auth/signup/staff-request",
        {
          fullName: staff.fullName,
          role: staff.role,
          email: staff.email,
          password: staff.password,
        },
        {
          successMessage:
            "Staff access request submitted! Please wait for admin approval.",
        }
      );

      if (!res.ok) {
        setError((res.data as any)?.error || "Staff signup failed");
        return false;
      }

      return true;
    } catch (err) {
      console.error("Staff signup error:", err);
      setError("Unable to connect to server.");
      return false;
    }
  };

  const logout = () => {
    persistUser(null);
    // Optional: call backend logout route here later
  };

  const value: AuthContextType = {
    user,
    loading,
    error,
    login,
    signup,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}