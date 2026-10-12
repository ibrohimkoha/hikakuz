"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { UserSession } from "@/types/user";

interface AuthContextType {
  user: UserSession | null;
  isLoading: boolean;
  login: (userData: UserSession) => void;
  logout: () => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  refreshFandubStudio: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const syncUserRole = async (currentUser: UserSession) => {
    const tgId = currentUser.telegram_id || (currentUser.is_admin ? 5415350162 : 0);
    if (!tgId) return;
    try {
      const res = await fetch(`/api/v1/auth/role?telegram_id=${tgId}`);
      const data = await res.json();
      if (data.success) {
        if (currentUser.is_admin !== data.is_admin || currentUser.admin_role !== data.role) {
          const updatedUser: UserSession = {
            ...currentUser,
            is_admin: data.is_admin,
            admin_role: data.role,
          };
          setUser(updatedUser);
          localStorage.setItem("anivorm_user_session", JSON.stringify(updatedUser));
        }
      }
    } catch (e) {
      console.error("Failed to sync user role:", e);
    }
  };

  const checkFandubStudio = async (currentUser: UserSession) => {
    const tgId = currentUser.telegram_id || (currentUser.is_admin ? 5415350162 : 0);
    if (!tgId) return;
    try {
      const res = await fetch(`/api/v1/fandub/my-studio?telegram_id=${tgId}`);
      const data = await res.json();
      if (data.success && data.fandub) {
        const updatedUser: UserSession = {
          ...currentUser,
          fandub: {
            id: data.fandub.id,
            name: data.fandub.name,
            slug: data.fandub.slug,
            logo_url: data.fandub.logo_url,
            description: data.fandub.description,
            role: data.role || "MEMBER",
          },
        };
        setUser(updatedUser);
        localStorage.setItem("anivorm_user_session", JSON.stringify(updatedUser));
      }
    } catch (e) {
      console.error("Failed to check fandub studio:", e);
    }
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem("anivorm_user_session");
      if (saved) {
        const parsed = JSON.parse(saved);
        setUser(parsed);
        checkFandubStudio(parsed);
        syncUserRole(parsed);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = (userData: UserSession) => {
    setUser(userData);
    localStorage.setItem("anivorm_user_session", JSON.stringify(userData));
    setIsAuthModalOpen(false);
    checkFandubStudio(userData);
    syncUserRole(userData);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("anivorm_user_session");
  };

  const refreshFandubStudio = async () => {
    if (user) {
      await checkFandubStudio(user);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        isAuthModalOpen,
        setIsAuthModalOpen,
        refreshFandubStudio,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
