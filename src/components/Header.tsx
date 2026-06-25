import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../store";
import { apiRequest } from "../api";
import NotificationsDropdown from "./NotificationsDropdown";
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

  const isRtl = i18n.language === "ar";

  return (
    <>
      {/* 1. Desktop Sidebar */}
      <aside
        className={`hidden md:flex fixed top-0 bottom-0 z-40 w-64 bg-violet-600 text-white flex-col py-6 px-5 justify-between shadow-xl ${
          isRtl ? "right-0 border-l border-violet-500" : "left-0 border-r border-violet-500"
        }`}
      >
        {/* Brand/Logo */}
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 text-white rounded-2xl backdrop-blur-md">
                <Wallet className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span className="font-black text-xl font-display tracking-tight text-white uppercase">
                {t("common.appName")}
              </span>
            </div>
            <NotificationsDropdown />
          </div>

          {/* Navigation links */}
          <nav className="flex flex-col gap-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4.5 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider font-display transition-all ${
                    isActive
                      ? "bg-white text-violet-700 shadow-lg shadow-violet-800/30 font-black scale-[1.02]"
                      : "text-violet-100 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <Icon className="w-4.5 h-4.5 stroke-[2.2] shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Profile and Settings */}
        <div className="space-y-5 pt-6 border-t border-white/15">
          {/* Currency Display */}
          <div className="flex justify-between items-center bg-white/10 px-4 py-2.5 rounded-2xl">
            <span className="text-[10px] uppercase font-bold tracking-widest text-violet-200">
              {t("settings.currency") || "Currency"}
            </span>
            <span className="text-xs font-mono font-black text-white">{currency}</span>
          </div>

          {/* Language selector in sidebar */}
          <div className="relative">
            <button
              onClick={() => setLangDropdownOpen(!langDropdownOpen)}
              className="w-full px-4 py-2.5 bg-white/10 hover:bg-white/15 rounded-2xl transition-all flex items-center justify-between text-white"
            >
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-violet-200" />
                <span className="text-xs font-bold uppercase font-mono tracking-wider">
                  {i18n.language}
                </span>
              </div>
              <span className="text-[10px] text-violet-200 uppercase font-black">⚙</span>
            </button>
            {langDropdownOpen && (
              <div className="absolute bottom-12 left-0 right-0 rounded-2xl bg-white text-stone-900 border border-stone-150 shadow-2xl py-1.5 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
                <button
                  onClick={() => changeLanguage("ar")}
                  className="w-full text-start px-4 py-2.5 text-xs text-stone-700 hover:bg-stone-50 font-bold font-display"
                >
                  العربية (ar)
                </button>
                <button
                  onClick={() => changeLanguage("fr")}
                  className="w-full text-start px-4 py-2.5 text-xs text-stone-700 hover:bg-stone-50 font-bold font-display"
                >
                  Français (fr)
                </button>
                <button
                  onClick={() => changeLanguage("en")}
                  className="w-full text-start px-4 py-2.5 text-xs text-stone-700 hover:bg-stone-50 font-bold font-display"
                >
                  English (en)
                </button>
              </div>
            )}
          </div>

          {/* User Profile Info & Logout */}
          <div className="flex items-center justify-between gap-3 bg-white/10 p-3 rounded-2xl">
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] uppercase tracking-widest text-violet-200 font-bold">
                {t("auth.user") || "User"}
              </span>
              <span className="text-xs font-black truncate max-w-[120px] text-white font-display">
                {user.name}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 bg-rose-500/20 text-rose-200 hover:bg-rose-500 hover:text-white rounded-xl transition-all cursor-pointer"
              title={t("auth.logout")}
            >
              <LogOut className="w-4.5 h-4.5 stroke-[2.2]" />
            </button>
          </div>
        </div>
      </aside>

      {/* 2. Mobile Top Header */}
      <header className="md:hidden sticky top-0 z-40 w-full border-b border-violet-500/30 bg-violet-600 text-white shadow-md">
        <div className="px-4 h-16 flex justify-between items-center">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-display font-extrabold text-lg">
            <div className="p-1.5 bg-white/20 text-white rounded-xl">
              <Wallet className="w-4.5 h-4.5 stroke-[2.2]" />
            </div>
            <span className="font-black text-white">{t("common.appName")}</span>
          </Link>

          {/* Quick Language or Actions */}
          <div className="flex items-center gap-2">
            <NotificationsDropdown />
            <button
              onClick={() => setLangDropdownOpen(!langDropdownOpen)}
              className="p-2 text-violet-100 hover:text-white rounded-xl"
            >
              <Globe className="w-5 h-5 stroke-[2]" />
            </button>
            {langDropdownOpen && (
              <div className="absolute top-14 right-4 rtl:left-4 mt-2 w-40 rounded-2xl bg-white text-stone-900 border border-stone-200 shadow-xl py-1.5 z-50">
                <button
                  onClick={() => changeLanguage("ar")}
                  className="w-full text-start px-4 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50"
                >
                  العربية (ar)
                </button>
                <button
                  onClick={() => changeLanguage("fr")}
                  className="w-full text-start px-4 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50"
                >
                  Français (fr)
                </button>
                <button
                  onClick={() => changeLanguage("en")}
                  className="w-full text-start px-4 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50"
                >
                  English (en)
                </button>
              </div>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-violet-100 hover:text-white rounded-xl transition-all"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="border-b border-violet-500/20 bg-violet-700 px-4 pt-2 pb-5 space-y-1.5 shadow-lg animate-in slide-in-from-top-4 duration-150">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-semibold font-display tracking-wide transition-all ${
                    isActive ? "bg-white text-violet-700 font-bold" : "text-violet-100 hover:bg-white/10"
                  }`}
                >
                  <Icon className="w-5 h-5 stroke-[2]" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <div className="pt-4 mt-2 border-t border-white/15 flex items-center justify-between px-2">
              <div className="flex flex-col">
                <span className="text-[10px] text-violet-200 uppercase font-black tracking-widest">
                  {t("auth.user") || "User"}
                </span>
                <span className="text-sm font-bold font-display text-white">{user.name}</span>
              </div>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="flex items-center gap-2 text-xs font-bold font-display uppercase tracking-wider text-rose-200 bg-rose-500/20 px-3.5 py-2 rounded-xl"
              >
                <LogOut className="w-4 h-4 stroke-[2.2]" />
                <span>{t("auth.logout")}</span>
              </button>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
