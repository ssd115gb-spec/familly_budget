import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../store";
import { apiRequest } from "../api";
import {
  Menu,
  X,
  Globe,
  LogOut,
  Wallet,
  TrendingUp,
  CreditCard,
  Settings,
  User,
  LayoutDashboard,
} from "lucide-react";

export default function Header() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, clearSession, currency } = useAppStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setLangDropdownOpen(false);
  };

  const handleLogout = async () => {
    try {
      await apiRequest("/auth/logout", { method: "POST" });
    } catch (e) {
      console.error(e);
    } finally {
      clearSession();
      navigate("/login");
    }
  };

  const menuItems = [
    {
      path: "/",
      label: t("dashboard.title"),
      icon: LayoutDashboard,
    },
    {
      path: "/history",
      label: t("history.title"),
      icon: TrendingUp,
    },
    {
      path: "/debts",
      label: t("debts.title"),
      icon: CreditCard,
    },
    {
      path: "/settings",
      label: t("settings.title"),
      icon: Settings,
    },
  ];

  if (!user) return null;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-stone-200/60 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2.5 font-display font-extrabold text-xl text-stone-900 dark:text-white tracking-tight">
              <div className="p-1.5 bg-emerald-600 dark:bg-emerald-500 text-white rounded-xl shadow-md shadow-emerald-500/10">
                <Wallet className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span className="font-black bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">{t("common.appName")}</span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex space-x-1.5 rtl:space-x-reverse">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider font-display transition-all ${
                    isActive
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/10"
                      : "text-stone-600 hover:text-emerald-600 hover:bg-emerald-50/50"
                  }`}
                >
                  <Icon className="w-4 h-4 stroke-[2]" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right section */}
          <div className="hidden md:flex items-center gap-4">
            {/* Currency chip */}
            <span className="text-xs font-mono bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-400 px-3 py-1.5 rounded-xl font-bold tracking-wider">
              {currency}
            </span>

            {/* Language Selector */}
            <div className="relative">
              <button
                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                className="px-3 py-1.5 border border-stone-200/80 dark:border-slate-800 text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-50 dark:hover:bg-slate-800/60 rounded-xl transition-all flex items-center gap-1.5"
                aria-label="Change language"
              >
                <Globe className="w-4 h-4 stroke-[2]" />
                <span className="text-xs font-bold uppercase font-mono tracking-wider">{i18n.language}</span>
              </button>
              {langDropdownOpen && (
                <div className="absolute right-0 rtl:left-0 mt-2 w-44 rounded-2xl bg-white dark:bg-slate-900 border border-stone-150 dark:border-slate-800 shadow-xl py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <button
                    onClick={() => changeLanguage("ar")}
                    className="w-full text-start px-4 py-2.5 text-xs text-stone-700 dark:text-slate-300 hover:bg-stone-50 dark:hover:bg-slate-800 font-bold font-display"
                  >
                    العربية (ar)
                  </button>
                  <button
                    onClick={() => changeLanguage("fr")}
                    className="w-full text-start px-4 py-2.5 text-xs text-stone-700 dark:text-slate-300 hover:bg-stone-50 dark:hover:bg-slate-800 font-bold font-display"
                  >
                    Français (fr)
                  </button>
                  <button
                    onClick={() => changeLanguage("en")}
                    className="w-full text-start px-4 py-2.5 text-xs text-stone-700 dark:text-slate-300 hover:bg-stone-50 dark:hover:bg-slate-800 font-bold font-display"
                  >
                    English (en)
                  </button>
                </div>
              )}
            </div>

            {/* User Profile */}
            <div className="flex items-center gap-3 border-l border-stone-250 dark:border-slate-800 ps-4 rtl:border-l-0 rtl:border-r rtl:pe-4">
              <div className="flex flex-col text-end">
                <span className="text-xs font-bold font-display text-stone-850 dark:text-slate-200 max-w-[120px] truncate tracking-wide">
                  {user.name}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-all cursor-pointer"
                title={t("auth.logout")}
              >
                <LogOut className="w-4.5 h-4.5 stroke-[2.2]" />
              </button>
            </div>
          </div>

          {/* Mobile menu toggle */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setLangDropdownOpen(!langDropdownOpen)}
              className="p-2 text-stone-600 dark:text-slate-400 rounded-xl hover:bg-stone-50 dark:hover:bg-slate-800"
            >
              <Globe className="w-5 h-5 stroke-[2]" />
            </button>
            {langDropdownOpen && (
              <div className="absolute top-14 right-4 rtl:left-4 mt-2 w-40 rounded-2xl bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 shadow-xl py-1.5 z-50">
                <button
                  onClick={() => changeLanguage("ar")}
                  className="w-full text-start px-4 py-2 text-xs font-bold text-stone-700 dark:text-slate-300 hover:bg-stone-50 dark:hover:bg-slate-800"
                >
                  {t("settings.ar")}
                </button>
                <button
                  onClick={() => changeLanguage("fr")}
                  className="w-full text-start px-4 py-2 text-xs font-bold text-stone-700 dark:text-slate-300 hover:bg-stone-50 dark:hover:bg-slate-800"
                >
                  {t("settings.fr")}
                </button>
                <button
                  onClick={() => changeLanguage("en")}
                  className="w-full text-start px-4 py-2 text-xs font-bold text-stone-700 dark:text-slate-300 hover:bg-stone-50 dark:hover:bg-slate-800"
                >
                  {t("settings.en")}
                </button>
              </div>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-stone-600 dark:text-slate-400 hover:bg-stone-50 dark:hover:bg-slate-800 rounded-xl transition-all"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-stone-150 dark:border-slate-850 bg-white dark:bg-slate-900 px-4 pt-2.5 pb-5 space-y-1.5 shadow-lg animate-in slide-in-from-top-4 duration-150">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3.5 px-4.5 py-3 rounded-2xl text-sm font-semibold font-display tracking-wide transition-all ${
                  isActive
                    ? "bg-emerald-600 text-white"
                    : "text-stone-600 hover:bg-emerald-50/50"
                }`}
              >
                <Icon className="w-5 h-5 stroke-[2]" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <div className="pt-4.5 mt-2 border-t border-stone-150 dark:border-slate-850 flex items-center justify-between px-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-stone-100 dark:bg-slate-800 flex items-center justify-center">
                <User className="w-4.5 h-4.5 text-stone-500" />
              </div>
              <span className="text-sm font-bold font-display text-stone-800 dark:text-slate-200">{user.name}</span>
            </div>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleLogout();
              }}
              className="flex items-center gap-2 text-xs font-bold font-display uppercase tracking-wider text-rose-600 bg-rose-50 dark:bg-rose-950/20 px-3.5 py-2 rounded-xl"
            >
              <LogOut className="w-4.5 h-4.5 stroke-[2.2]" />
              <span>{t("auth.logout")}</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
