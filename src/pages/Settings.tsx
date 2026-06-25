import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store";
import { apiRequest } from "../api";
import Dialog from "../components/Dialog";
import {
  Settings as SettingsIcon,
  Globe,
  DollarSign,
  Database,
  Lock,
  Trash2,
  Moon,
  Sun,
  Loader2,
  Download,
  Upload,
  AlertTriangle,
  Bell,
} from "lucide-react";

export default function Settings() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { currency, setCurrency, theme, setTheme, clearSession, user, accessToken, setSession } = useAppStore();

  const [initialSalaryInput, setInitialSalaryInput] = useState(user?.initialSalary?.toString() || "10000");
  const [salarySuccess, setSalarySuccess] = useState(false);
  const [salaryError, setSalaryError] = useState<string | null>(null);

  const [notifyBudgetThreshold, setNotifyBudgetThreshold] = useState(user?.notifyBudgetThreshold ?? true);
  const [budgetThresholdPercent, setBudgetThresholdPercent] = useState(user?.budgetThresholdPercent ?? 85);
  const [notifyUpcomingDebts, setNotifyUpcomingDebts] = useState(user?.notifyUpcomingDebts ?? true);
  const [notifyMonthlySummary, setNotifyMonthlySummary] = useState(user?.notifyMonthlySummary ?? true);
  const [notifSuccess, setNotifSuccess] = useState(false);
  const [notifError, setNotifError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.initialSalary !== undefined) {
      setInitialSalaryInput(user.initialSalary.toString());
    }
    if (user) {
      setNotifyBudgetThreshold(user.notifyBudgetThreshold ?? true);
      setBudgetThresholdPercent(user.budgetThresholdPercent ?? 85);
      setNotifyUpcomingDebts(user.notifyUpcomingDebts ?? true);
      setNotifyMonthlySummary(user.notifyMonthlySummary ?? true);
    }
  }, [user]);

  const updateSalaryMutation = useMutation({
    mutationFn: (salary: number) =>
      apiRequest("/user/salary", {
        method: "PUT",
        body: JSON.stringify({ initialSalary: salary }),
      }),
    onSuccess: (data: any) => {
      setSalarySuccess(true);
      setSalaryError(null);
      setSession(data, accessToken);
      setTimeout(() => setSalarySuccess(false), 4000);
    },
    onError: (err: any) => {
      setSalaryError(err.message || t("common.error"));
      setSalarySuccess(false);
    },
  });

  const updateNotifSettingsMutation = useMutation({
    mutationFn: (payload: any) =>
      apiRequest("/user/notification-settings", {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    onSuccess: (data: any) => {
      setNotifSuccess(true);
      setNotifError(null);
      setSession(data, accessToken);
      setTimeout(() => setNotifSuccess(false), 4000);
    },
    onError: (err: any) => {
      setNotifError(err.message || t("common.error"));
      setNotifSuccess(false);
    },
  });

  const handleNotifSettingsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateNotifSettingsMutation.mutate({
      notifyBudgetThreshold,
      budgetThresholdPercent: parseFloat(budgetThresholdPercent.toString()),
      notifyUpcomingDebts,
      notifyMonthlySummary,
    });
  };

  const handleSalarySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(initialSalaryInput);
    if (!isNaN(parsed) && parsed >= 0) {
      updateSalaryMutation.mutate(parsed);
    } else {
      setSalaryError("Invalid salary amount");
    }
  };

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Modals state
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState("");
  const [restoreSuccessMsg, setRestoreSuccessMsg] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  // Change Password mutation
  const changePasswordMutation = useMutation({
    mutationFn: () =>
      apiRequest("/user/password", {
        method: "PUT",
        body: JSON.stringify({ currentPassword, newPassword }),
      }),
    onSuccess: () => {
      setPasswordSuccess(true);
      setPasswordError(null);
      setCurrentPassword("");
      setNewPassword("");
      setTimeout(() => setPasswordSuccess(false), 4000);
    },
    onError: (err: any) => {
      setPasswordError(err.message || t("common.error"));
      setPasswordSuccess(false);
    },
  });

  // Delete Account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: () =>
      apiRequest("/user/account", {
        method: "DELETE",
      }),
    onSuccess: () => {
      clearSession();
      navigate("/login");
    },
  });

  // Handle backup download (Export JSON)
  const handleBackupDownload = async () => {
    try {
      const data = await apiRequest("/user/backup");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `budget_backup_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
      alert("Error exporting backup file");
    }
  };

  // Handle restore upload (Import JSON)
  const handleRestoreUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsRestoring(true);
    setRestoreSuccessMsg(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        await apiRequest("/user/restore", {
          method: "POST",
          body: JSON.stringify(json),
        });
        setRestoreSuccessMsg(t("settings.restoreSuccess"));
        setTimeout(() => setRestoreSuccessMsg(null), 4000);
      } catch (err: any) {
        alert(t("settings.restoreFailed"));
      } finally {
        setIsRestoring(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentPassword && newPassword) {
      changePasswordMutation.mutate();
    }
  };

  const handleDeleteAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteConfirmationInput === user?.email) {
      deleteAccountMutation.mutate();
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
          <SettingsIcon className="w-8 h-8 text-violet-600" />
          <span>{t("settings.title")}</span>
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* System & Localization Section */}
        <div className="space-y-6">
          {/* Theme card */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700">
              <Sun className="w-5 h-5 text-gray-400" />
              <span>{t("settings.theme")}</span>
            </h3>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setTheme("light")}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                  theme === "light"
                    ? "bg-violet-50 dark:bg-violet-950/20 border-violet-500 text-violet-600 dark:text-violet-400"
                    : "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
                }`}
              >
                <Sun className="w-4 h-4" />
                <span>{t("settings.light")}</span>
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                  theme === "dark"
                    ? "bg-violet-50 dark:bg-violet-950/20 border-violet-500 text-violet-600 dark:text-violet-400"
                    : "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
                }`}
              >
                <Moon className="w-4 h-4" />
                <span>{t("settings.dark")}</span>
              </button>
              <button
                onClick={() => setTheme("system")}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                  theme === "system"
                    ? "bg-violet-50 dark:bg-violet-950/20 border-violet-500 text-violet-600 dark:text-violet-400"
                    : "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
                }`}
              >
                <span>{t("settings.system")}</span>
              </button>
            </div>
          </div>

          {/* Localization Card */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700">
              <Globe className="w-5 h-5 text-gray-400" />
              <span>{t("settings.language")}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                onClick={() => changeLanguage("ar")}
                className={`py-2.5 rounded-xl border text-xs font-bold transition-all ${
                  i18n.language === "ar"
                    ? "bg-violet-50 dark:bg-violet-950/20 border-violet-500 text-violet-600 dark:text-violet-400"
                    : "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
                }`}
              >
                العربية (ar)
              </button>
              <button
                onClick={() => changeLanguage("fr")}
                className={`py-2.5 rounded-xl border text-xs font-bold transition-all ${
                  i18n.language === "fr"
                    ? "bg-violet-50 dark:bg-violet-950/20 border-violet-500 text-violet-600 dark:text-violet-400"
                    : "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
                }`}
              >
                Français (fr)
              </button>
              <button
                onClick={() => changeLanguage("en")}
                className={`py-2.5 rounded-xl border text-xs font-bold transition-all ${
                  i18n.language === "en"
                    ? "bg-violet-50 dark:bg-violet-950/20 border-violet-500 text-violet-600 dark:text-violet-400"
                    : "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
                }`}
              >
                English (en)
              </button>
            </div>
          </div>

          {/* Currency Configuration */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700">
              <DollarSign className="w-5 h-5 text-gray-400" />
              <span>{t("settings.currency")}</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {["DH", "د.م.", "MAD", "EUR", "USD", "GBP"].map((curr) => (
                <button
                  key={curr}
                  onClick={() => setCurrency(curr)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                    currency === curr
                      ? "bg-violet-50 dark:bg-violet-950/20 border-violet-500 text-violet-600 dark:text-violet-400"
                      : "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
                  }`}
                >
                  {curr}
                </button>
              ))}
            </div>
          </div>

          {/* Initial Salary Configuration */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700">
              <DollarSign className="w-5 h-5 text-gray-400" />
              <span>{t("settings.initialSalary")}</span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
              {t("settings.initialSalaryDesc")}
            </p>

            <form onSubmit={handleSalarySubmit} className="space-y-4">
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  required
                  value={initialSalaryInput}
                  onChange={(e) => setInitialSalaryInput(e.target.value)}
                  className="block w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-950 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="10000"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                  {currency}
                </span>
              </div>

              {salarySuccess && (
                <p className="text-xs font-bold text-violet-600 dark:text-violet-400">
                  {t("settings.saveSalarySuccess")}
                </p>
              )}
              {salaryError && (
                <p className="text-xs font-bold text-rose-500">
                  {salaryError}
                </p>
              )}

              <button
                type="submit"
                disabled={updateSalaryMutation.isPending}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:bg-violet-500/50"
              >
                {updateSalaryMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span>{t("common.save")}</span>
                )}
              </button>
            </form>
          </div>

          {/* Notification Preferences */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700">
              <Bell className="w-5 h-5 text-gray-400" />
              <span>{t("settings.notificationsTitle")}</span>
            </h3>

            <form onSubmit={handleNotifSettingsSubmit} className="space-y-5">
              {/* Threshold warning */}
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-0.5">
                    <label className="text-xs font-bold text-gray-900 dark:text-white">
                      {t("settings.notifyBudgetThreshold")}
                    </label>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium leading-normal">
                      {t("settings.notifyBudgetThresholdDesc")}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyBudgetThreshold}
                    onChange={(e) => setNotifyBudgetThreshold(e.target.checked)}
                    className="w-4 h-4 text-violet-600 border-gray-300 rounded focus:ring-violet-500 cursor-pointer"
                  />
                </div>

                {notifyBudgetThreshold && (
                  <div className="pl-4 border-l-2 border-violet-100 dark:border-violet-950/40 py-1 space-y-1">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      {t("settings.budgetThresholdPercent")}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={budgetThresholdPercent}
                      onChange={(e) => setBudgetThresholdPercent(parseInt(e.target.value) || 85)}
                      className="block w-24 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-950 dark:text-white text-xs font-bold focus:outline-none focus:ring-1 focus:ring-violet-500"
                    />
                  </div>
                )}
              </div>

              {/* Debt payment reminder */}
              <div className="flex items-start justify-between gap-4 pt-3 border-t border-gray-50 dark:border-gray-750">
                <div className="space-y-0.5">
                  <label className="text-xs font-bold text-gray-900 dark:text-white">
                    {t("settings.notifyUpcomingDebts")}
                  </label>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium leading-normal">
                    {t("settings.notifyUpcomingDebtsDesc")}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notifyUpcomingDebts}
                  onChange={(e) => setNotifyUpcomingDebts(e.target.checked)}
                  className="w-4 h-4 text-violet-600 border-gray-300 rounded focus:ring-violet-500 cursor-pointer"
                />
              </div>

              {/* Monthly insights summary */}
              <div className="flex items-start justify-between gap-4 pt-3 border-t border-gray-50 dark:border-gray-750">
                <div className="space-y-0.5">
                  <label className="text-xs font-bold text-gray-900 dark:text-white">
                    {t("settings.notifyMonthlySummary")}
                  </label>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium leading-normal">
                    {t("settings.notifyMonthlySummaryDesc")}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notifyMonthlySummary}
                  onChange={(e) => setNotifyMonthlySummary(e.target.checked)}
                  className="w-4 h-4 text-violet-600 border-gray-300 rounded focus:ring-violet-500 cursor-pointer"
                />
              </div>

              {notifSuccess && (
                <p className="text-xs font-bold text-violet-600 dark:text-violet-400">
                  {t("settings.saveNotificationsSuccess")}
                </p>
              )}
              {notifError && (
                <p className="text-xs font-bold text-rose-500">
                  {notifError}
                </p>
              )}

              <button
                type="submit"
                disabled={updateNotifSettingsMutation.isPending}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:bg-violet-500/50"
              >
                {updateNotifSettingsMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span>{t("common.save")}</span>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Security & Backup Section */}
        <div className="space-y-6">
          {/* Backup Restore Card */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700">
              <Database className="w-5 h-5 text-gray-400" />
              <span>{t("settings.backupRestore")}</span>
            </h3>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleBackupDownload}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-violet-50 dark:bg-violet-950/20 hover:bg-violet-100/70 text-violet-600 dark:text-violet-400 font-bold text-xs rounded-xl cursor-pointer transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>{t("settings.backup")}</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isRestoring}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-50 dark:bg-indigo-950/20 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 font-bold text-xs rounded-xl cursor-pointer transition-colors disabled:opacity-50"
              >
                {isRestoring ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                <span>{t("settings.restore")}</span>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                onChange={handleRestoreUpload}
                className="hidden"
              />
            </div>
            {restoreSuccessMsg && (
              <p className="text-xs font-bold text-violet-600 dark:text-violet-400 text-center">
                {restoreSuccessMsg}
              </p>
            )}
          </div>

          {/* Change Password Card */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700">
              <Lock className="w-5 h-5 text-gray-400" />
              <span>{t("auth.changePassword")}</span>
            </h3>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <input
                  type="password"
                  required
                  placeholder={t("auth.currentPassword")}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="block w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-950 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <input
                  type="password"
                  required
                  placeholder={t("auth.newPassword")}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="block w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-950 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              {passwordSuccess && (
                <p className="text-xs font-bold text-violet-600 dark:text-violet-400">
                  Mot de passe mis à jour !
                </p>
              )}
              {passwordError && (
                <p className="text-xs font-bold text-rose-500">
                  {passwordError}
                </p>
              )}

              <button
                type="submit"
                disabled={changePasswordMutation.isPending}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:bg-violet-500/50"
              >
                {changePasswordMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span>{t("common.save")}</span>
                )}
              </button>
            </form>
          </div>

          {/* Delete Account Card */}
          <div className="bg-white dark:bg-rose-950/10 p-6 rounded-2xl border border-rose-100 dark:border-rose-950/40 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2 pb-2 border-b border-rose-100 dark:border-rose-950/40">
              <Trash2 className="w-5 h-5" />
              <span>{t("auth.deleteAccount")}</span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
              {t("auth.deleteAccountWarning")}
            </p>
            <button
              onClick={() => setIsDeleteAccountOpen(true)}
              className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors"
            >
              {t("auth.deleteAccount")}
            </button>
          </div>
        </div>
      </div>

      {/* DIALOG: Delete Account Double confirmation gate */}
      <Dialog
        isOpen={isDeleteAccountOpen}
        onClose={() => setIsDeleteAccountOpen(false)}
        title={t("auth.deleteAccount")}
      >
        <form onSubmit={handleDeleteAccountSubmit} className="space-y-4 text-start">
          <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <p className="text-xs text-rose-700 dark:text-rose-400 leading-relaxed font-semibold">
              {t("auth.deleteAccountWarning")}
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Pour confirmer, veuillez saisir votre adresse e-mail de connexion (<strong className="font-sans text-violet-600 dark:text-violet-400">{user?.email}</strong>) :
            </label>
            <input
              type="text"
              required
              value={deleteConfirmationInput}
              onChange={(e) => setDeleteConfirmationInput(e.target.value)}
              className="block w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-950 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
              placeholder="votre@email.com"
            />
          </div>

          <div className="flex gap-3 justify-end pt-2 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setIsDeleteAccountOpen(false)}
              className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 text-gray-700 dark:text-gray-300 text-xs font-bold transition-colors cursor-pointer"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={deleteConfirmationInput !== user?.email || deleteAccountMutation.isPending}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:bg-rose-500/50 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              {deleteAccountMutation.isPending ? t("common.loading") : t("common.confirm")}
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
