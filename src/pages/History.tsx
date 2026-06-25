import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiRequest } from "../api";
import { useAppStore } from "../store";
import { formatCurrency, getCategoryName } from "../utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Calendar, Download, Loader2, BarChart3, ListFilter } from "lucide-react";

export default function History() {
  const { t, i18n } = useTranslation();
  const { currency } = useAppStore();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // Visibility state for the lines
  const [visibleCategories, setVisibleCategories] = useState<Record<string, boolean>>({
    category_bills: true,
    category_expenses: true,
    category_savings: true,
    category_debts: true,
  });

  // Fetch Annual History
  const { data: historyData, isLoading } = useQuery({
    queryKey: ["annual-history", selectedYear],
    queryFn: () => apiRequest(`/history?year=${selectedYear}`),
  });

  const yearsRange = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  // Toggle category line visibility
  const toggleCategoryLine = (key: string) => {
    setVisibleCategories((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  if (isLoading) {
    return (
      <div className="h-[60vh] flex flex-col justify-center items-center gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
        <span className="text-gray-500 font-medium text-sm">{t("common.loading")}</span>
      </div>
    );
  }

  // Pre-configured category properties
  const CATEGORY_PROPS = [
    { key: "category_bills", color: "#FF9F43" },
    { key: "category_expenses", color: "#EC4899" },
    { key: "category_savings", color: "#14B8A6" },
    { key: "category_debts", color: "#8B5CF6" },
  ];

  const monthsList = Array.from({ length: 12 }, (_, i) => i + 1);

  // Format Recharts line chart data
  const chartData = (historyData || []).map((item: any) => {
    const formatted: any = {
      name: t(`history.months.${item.month}`).substring(0, 4),
    };
    CATEGORY_PROPS.forEach((cat) => {
      formatted[getCategoryName(cat.key, t)] = item.categories[cat.key]?.spent || 0;
    });
    return formatted;
  });

  const handleExportCsv = () => {
    window.open(`/api/export/csv?year=${selectedYear}`, "_blank");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-white tracking-tight flex items-center gap-3 font-display">
            <div className="p-2 bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-300 rounded-xl">
              <BarChart3 className="w-6 h-6 stroke-[2]" />
            </div>
            <span>{t("history.title")}</span>
          </h1>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          {/* Year select */}
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3.5 py-2.5 rounded-2xl border border-stone-200/80 dark:border-slate-800 shadow-sm">
            <Calendar className="w-4 h-4 text-stone-400 stroke-[2]" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="text-xs font-bold uppercase tracking-wider font-display text-stone-850 dark:text-slate-200 bg-transparent focus:outline-none cursor-pointer"
            >
              {yearsRange.map((y) => (
                <option key={y} value={y} className="bg-white dark:bg-slate-900 text-stone-900 dark:text-white">
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Export action */}
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-4.5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider font-display rounded-2xl shadow-sm cursor-pointer transition-all shadow-emerald-500/10"
          >
            <Download className="w-4 h-4 stroke-[2.2]" />
            <span>{t("history.exportCsv")}</span>
          </button>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-[28px] border border-stone-200/50 dark:border-slate-850 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 pb-4 border-b border-stone-100 dark:border-slate-800">
          <h3 className="text-sm font-extrabold uppercase tracking-wider font-display text-stone-500 dark:text-slate-400">
            {t("history.chartTitle")}
          </h3>
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wider font-display">
            {CATEGORY_PROPS.map((cat) => {
              const isVisible = visibleCategories[cat.key];
              return (
                <button
                  key={cat.key}
                  onClick={() => toggleCategoryLine(cat.key)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
                    isVisible
                      ? "bg-stone-50 dark:bg-slate-950 border-stone-200 dark:border-slate-800 text-stone-850 dark:text-slate-100 font-bold"
                      : "opacity-40 border-dashed border-stone-200 dark:border-slate-800 text-stone-400"
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <span>
                    {getCategoryName(cat.key, t)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ left: -10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fontFamily: "Inter", fill: "#a8a29e" }} />
              <YAxis tick={{ fontSize: 10, fontFamily: "Inter", fill: "#a8a29e" }} />
              <Tooltip
                formatter={(value: any) => [`${value} ${currency}`, ""]}
                contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontFamily: "Inter" }}
              />
              {CATEGORY_PROPS.map((cat) => {
                const label = getCategoryName(cat.key, t);
                if (!visibleCategories[cat.key]) return null;
                return (
                  <Line
                    key={cat.key}
                    type="monotone"
                    dataKey={label}
                    stroke={cat.color}
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid Comparison Table (Horizontal scroll) */}
      <div className="bg-white dark:bg-slate-900 rounded-[28px] border border-stone-200/50 dark:border-slate-850 shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-stone-100 dark:border-slate-800">
          <h3 className="text-sm font-extrabold uppercase tracking-wider font-display text-stone-500 dark:text-slate-400">
            {t("history.months.12")} - {selectedYear}
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-start whitespace-nowrap">
            <thead>
              <tr className="bg-stone-50/40 dark:bg-slate-950/20 border-b border-stone-150 dark:border-slate-850 text-stone-400 font-bold uppercase text-[10px] tracking-wider font-display">
                <th className="px-6 py-4 text-start font-bold">{t("history.table.category")}</th>
                {monthsList.map((m) => (
                  <th key={m} className="px-5 py-4 text-center font-bold">
                    {t(`history.months.${m}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-slate-850 font-medium">
              {/* Categories */}
              {CATEGORY_PROPS.map((cat) => {
                const label = getCategoryName(cat.key, t);
                return (
                  <tr key={cat.key} className="hover:bg-stone-50/20 dark:hover:bg-slate-850/10">
                    <td className="px-6 py-4.5 text-start font-bold text-stone-850 dark:text-slate-100 flex items-center gap-2 font-display text-[13px]">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <span>{label}</span>
                    </td>
                    {monthsList.map((m) => {
                      const monthData = historyData?.find((x: any) => x.month === m);
                      const spent = monthData?.categories[cat.key]?.spent || 0;
                      return (
                        <td key={m} className="px-5 py-4.5 text-center text-stone-600 dark:text-slate-300 font-mono text-xs">
                          {spent > 0 ? formatCurrency(spent, currency, i18n.language) : "-"}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              {/* Monthly Budget row */}
              <tr className="bg-stone-50/30 dark:bg-slate-950/10 text-emerald-600 dark:text-emerald-400 font-bold">
                <td className="px-6 py-4.5 text-start font-display text-[13px]">{t("history.table.totalBudget")}</td>
                {monthsList.map((m) => {
                  const monthData = historyData?.find((x: any) => x.month === m);
                  const budget = monthData?.totalBudget || 0;
                  return (
                    <td key={m} className="px-5 py-4.5 text-center font-mono text-xs">
                      {budget > 0 ? formatCurrency(budget, currency, i18n.language) : "-"}
                    </td>
                  );
                })}
              </tr>

              {/* Total spent row */}
              <tr className="bg-stone-50/30 dark:bg-slate-950/10 text-rose-600 dark:text-rose-400 font-bold">
                <td className="px-6 py-4.5 text-start font-display text-[13px]">{t("history.table.totalSpent")}</td>
                {monthsList.map((m) => {
                  const monthData = historyData?.find((x: any) => x.month === m);
                  const spent = monthData?.totalSpent || 0;
                  return (
                    <td key={m} className="px-5 py-4.5 text-center font-mono text-xs">
                      {spent > 0 ? formatCurrency(spent, currency, i18n.language) : "-"}
                    </td>
                  );
                })}
              </tr>

              {/* Remaining row */}
              <tr className="bg-stone-50/60 dark:bg-slate-950/20 font-black border-t border-stone-200 dark:border-slate-800">
                <td className="px-6 py-4.5 text-start text-stone-900 dark:text-white font-display text-[13px]">
                  {t("history.table.remaining")}
                </td>
                {monthsList.map((m) => {
                  const monthData = historyData?.find((x: any) => x.month === m);
                  const remaining = monthData?.remaining || 0;
                  return (
                    <td
                      key={m}
                      className={`px-5 py-4.5 text-center font-mono text-xs font-bold ${
                        remaining >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {formatCurrency(remaining, currency, i18n.language)}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
