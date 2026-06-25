import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "motion/react";
import { apiRequest } from "../api";
import { useAppStore } from "../store";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  AlertTriangle,
  Clock,
  TrendingUp,
  Info,
  Calendar,
} from "lucide-react";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

export default function NotificationsDropdown() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { currency } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications
  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: () => apiRequest("/notifications"),
    refetchInterval: 12000, // poll notifications every 12 seconds
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Mark all as read mutation
  const markAllReadMutation = useMutation({
    mutationFn: () => apiRequest("/notifications/read-all", { method: "PUT" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // Mark single as read mutation
  const markReadMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/notifications/${id}/read`, { method: "PUT" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // Delete notification mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/notifications/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // Clear all notifications
  const clearAllMutation = useMutation({
    mutationFn: () => apiRequest("/notifications/clear-all", { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "BUDGET_WARNING":
        return <AlertTriangle className="w-4 h-4 text-rose-500" />;
      case "DEBT_REMINDER":
        return <Clock className="w-4 h-4 text-amber-500" />;
      case "MONTHLY_SUMMARY":
        return <TrendingUp className="w-4 h-4 text-emerald-500" />;
      default:
        return <Info className="w-4 h-4 text-violet-500" />;
    }
  };

  const getNotificationColor = (type: string, read: boolean) => {
    if (read) return "border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900";
    switch (type) {
      case "BUDGET_WARNING":
        return "border-rose-100 dark:border-rose-950/30 bg-rose-50/10 dark:bg-rose-500/5";
      case "DEBT_REMINDER":
        return "border-amber-100 dark:border-amber-950/30 bg-amber-50/10 dark:bg-amber-500/5";
      case "MONTHLY_SUMMARY":
        return "border-emerald-100 dark:border-emerald-950/30 bg-emerald-50/10 dark:bg-emerald-500/5";
      default:
        return "border-violet-100 dark:border-violet-950/30 bg-violet-50/10 dark:bg-violet-500/5";
    }
  };

  const formatNotificationTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return t("dashboard.recent") || "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString(i18n.language, { month: "short", day: "numeric" });
  };

  const isRtl = i18n.language === "ar";

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 bg-white/10 hover:bg-white/15 text-white rounded-2xl transition-all duration-200 cursor-pointer flex items-center justify-center"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-violet-600 shadow-md"
            >
              {unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Notifications Dropdown Container */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`absolute top-full mt-2 left-0 w-[calc(100vw-2rem)] md:w-96 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden z-50`}
          >
            {/* Header */}
            <div className="px-4 py-3.5 border-b border-stone-150 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-stone-900 dark:text-white">
                  {t("settings.notifications")}
                </span>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-violet-100 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 text-[10px] font-black rounded-full">
                    {unreadCount} {t("dashboard.recent") ? "" : "new"}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllReadMutation.mutate()}
                    className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white transition-colors cursor-pointer"
                    title={t("settings.markAllAsRead")}
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={() => clearAllMutation.mutate()}
                    className="p-1.5 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 rounded-lg text-stone-400 hover:text-rose-500 transition-colors cursor-pointer"
                    title={t("settings.clearAll")}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-[340px] overflow-y-auto divide-y divide-stone-100 dark:divide-stone-800/80">
              {notifications.length === 0 ? (
                <div className="py-12 px-4 text-center flex flex-col items-center justify-center space-y-3">
                  <div className="p-3 bg-stone-100 dark:bg-stone-800/50 rounded-2xl text-stone-400 dark:text-stone-600">
                    <Bell className="w-6 h-6 stroke-[1.5]" />
                  </div>
                  <p className="text-xs font-bold text-stone-500 dark:text-stone-400">
                    {t("settings.noNotifications")}
                  </p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-4 transition-colors flex gap-3 relative border-l-3 ${getNotificationColor(
                      notif.type,
                      notif.read
                    )}`}
                  >
                    {/* Icon wrapper */}
                    <div className="mt-0.5 shrink-0 p-2 bg-white dark:bg-stone-800 rounded-xl shadow-sm border border-stone-100 dark:border-stone-750/50 flex items-center justify-center">
                      {getNotificationIcon(notif.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center justify-between gap-1.5 mb-1">
                        <span className="font-extrabold text-xs text-stone-900 dark:text-white truncate">
                          {notif.title}
                        </span>
                        <span className="text-[10px] font-medium text-stone-400 dark:text-stone-500 shrink-0">
                          {formatNotificationTime(notif.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed font-medium break-words">
                        {notif.message}
                      </p>
                    </div>

                    {/* Quick action buttons on hover */}
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 hover:opacity-100 focus-within:opacity-100 group-hover:opacity-100 transition-opacity bg-white dark:bg-stone-900 py-1 pl-1.5 rounded-lg">
                      {!notif.read && (
                        <button
                          onClick={() => markReadMutation.mutate(notif.id)}
                          className="p-1 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-md text-emerald-600 dark:text-emerald-400 transition-colors cursor-pointer"
                          title="Mark as read"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteMutation.mutate(notif.id)}
                        className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-md text-rose-500 transition-colors cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
