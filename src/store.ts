import { create } from "zustand";

interface User {
  id: string;
  name: string;
  email: string;
  initialSalary?: number;
  notifyBudgetThreshold?: boolean;
  budgetThresholdPercent?: number;
  notifyUpcomingDebts?: boolean;
  notifyMonthlySummary?: boolean;
}

interface AppState {
  user: User | null;
  accessToken: string | null;
  currency: string;
  theme: "light" | "dark" | "system";
  setSession: (user: User | null, accessToken: string | null) => void;
  clearSession: () => void;
  setCurrency: (currency: string) => void;
  setTheme: (theme: "light" | "dark" | "system") => void;
}

export const useAppStore = create<AppState>((set) => {
  // Initialization values
  const cachedCurrency = localStorage.getItem("app_currency") || "DH";
  const cachedTheme = (localStorage.getItem("app_theme") as "light" | "dark" | "system") || "light";

  // Apply initial theme
  const applyTheme = (theme: "light" | "dark" | "system") => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  };
  applyTheme(cachedTheme);

  return {
    user: null,
    accessToken: null,
    currency: cachedCurrency,
    theme: cachedTheme,

    setSession: (user, accessToken) => set({ user, accessToken }),
    clearSession: () => {
      set({ user: null, accessToken: null });
      localStorage.removeItem("app_access_token");
    },
    setCurrency: (currency) => {
      localStorage.setItem("app_currency", currency);
      set({ currency });
    },
    setTheme: (theme) => {
      localStorage.setItem("app_theme", theme);
      applyTheme(theme);
      set({ theme });
    },
  };
});
