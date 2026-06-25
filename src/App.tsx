import { useEffect, useState } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAppStore } from "./store";
import { apiRequest } from "./api";
import "./i18n"; // Initialize i18n settings

import Header from "./components/Header";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import CategoryDetail from "./pages/CategoryDetail";
import History from "./pages/History";
import Debts from "./pages/Debts";
import Settings from "./pages/Settings";
import { Loader2 } from "lucide-react";

// Create TanStack query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function AppContent() {
  const { user, setSession, clearSession } = useAppStore();
  const [sessionRestored, setSessionRestored] = useState(false);
  const { t } = useTranslation();

  // Attempt silent session restoration on app boot
  useEffect(() => {
    const restoreSession = async () => {
      try {
        // Attempt token refresh first to get a valid accessToken
        const refreshResponse = await fetch("/api/auth/refresh", { method: "POST" });
        if (refreshResponse.ok) {
          const { accessToken } = await refreshResponse.json();
          // Now fetch the actual user profile
          const profileHeaders = new Headers();
          profileHeaders.set("Authorization", `Bearer ${accessToken}`);
          const profileResponse = await fetch("/api/auth/me", { headers: profileHeaders });
          if (profileResponse.ok) {
            const profile = await profileResponse.json();
            setSession(profile, accessToken);
          } else {
            clearSession();
          }
        } else {
          clearSession();
        }
      } catch (e) {
        console.error("Session restoration error:", e);
        clearSession();
      } finally {
        setSessionRestored(true);
      }
    };

    restoreSession();
  }, [setSession, clearSession]);

  if (!sessionRestored) {
    return (
      <div className="h-screen w-screen flex flex-col justify-center items-center gap-3 bg-gray-50 dark:bg-gray-900 text-gray-500">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
        <span className="text-sm font-semibold">{t("common.loading")}</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900/40 text-gray-900 dark:text-gray-100 flex flex-col transition-colors duration-200">
      <Header />
      <main className="flex-grow">
        <Routes>
          {/* Guest Routes */}
          <Route
            path="/login"
            element={!user ? <Login /> : <Navigate to="/" replace />}
          />
          <Route
            path="/register"
            element={!user ? <Register /> : <Navigate to="/" replace />}
          />

          {/* Secured Family Budget Routes */}
          <Route
            path="/"
            element={user ? <Dashboard /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/categories/:id"
            element={user ? <CategoryDetail /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/history"
            element={user ? <History /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/debts"
            element={user ? <Debts /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/settings"
            element={user ? <Settings /> : <Navigate to="/login" replace />}
          />

          {/* Catch-all Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <AppContent />
      </HashRouter>
    </QueryClientProvider>
  );
}
