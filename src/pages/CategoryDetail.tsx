import { useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { useAppStore } from "../store";
import { apiRequest } from "../api";
import {
  formatCurrency,
  formatDate,
  getCategoryName,
} from "../utils";
import Dialog from "../components/Dialog";
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  HelpCircle,
  ReceiptText,
  Sparkles,
  PiggyBank,
  CreditCard,
} from "lucide-react";

const iconMap: Record<string, any> = {
  ReceiptText,
  Sparkles,
  PiggyBank,
  CreditCard,
};

export default function CategoryDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { currency } = useAppStore();

  const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
  const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString());

  // Modals state
  const [isAddLineOpen, setIsAddLineOpen] = useState(false);
  const [isEditLineOpen, setIsEditLineOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // Forms state
  const [targetLine, setTargetLine] = useState<any | null>(null);
  const [lineLabel, setLineLabel] = useState("");
  const [linePlanned, setLinePlanned] = useState("");
  const [lineActual, setLineActual] = useState("");
  const [lineDate, setLineDate] = useState(new Date().toISOString().split("T")[0]);

  // Fetch Stats (which loads our category lines too)
  const { data, isLoading } = useQuery({
    queryKey: ["budget-stats", year, month],
    queryFn: () => apiRequest(`/budgets/stats?year=${year}&month=${month}`),
  });

  const category = data?.categories?.find((c: any) => c.id === id);
  const monthlyBudget = data?.monthlyBudget;

  // Add line mutation
  const addLineMutation = useMutation({
    mutationFn: (body: any) =>
      apiRequest("/budget-lines", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-stats"] });
      setIsAddLineOpen(false);
      // Reset
      setLineLabel("");
      setLinePlanned("");
      setLineActual("");
    },
  });

  // Edit line mutation
  const editLineMutation = useMutation({
    mutationFn: (body: any) =>
      apiRequest(`/budget-lines/${targetLine?.id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-stats"] });
      setIsEditLineOpen(false);
      setTargetLine(null);
    },
  });

  // Delete line mutation
  const deleteLineMutation = useMutation({
    mutationFn: (lineId: string) =>
      apiRequest(`/budget-lines/${lineId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-stats"] });
      setIsDeleteConfirmOpen(false);
      setTargetLine(null);
    },
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (lineLabel.trim() && monthlyBudget && category) {
      addLineMutation.mutate({
        categoryId: category.id,
        monthlyBudgetId: monthlyBudget.id,
        label: lineLabel,
        plannedAmount: parseFloat(linePlanned || "0"),
        actualAmount: parseFloat(lineActual || "0"),
        date: lineDate,
      });
    }
  };

  const handleEditClick = (line: any) => {
    setTargetLine(line);
    setLineLabel(line.label);
    setLinePlanned(line.plannedAmount.toString());
    setLineActual(line.actualAmount.toString());
    setLineDate(new Date(line.date).toISOString().split("T")[0]);
    setIsEditLineOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (lineLabel.trim() && targetLine) {
      editLineMutation.mutate({
        label: lineLabel,
        plannedAmount: parseFloat(linePlanned || "0"),
        actualAmount: parseFloat(lineActual || "0"),
        date: lineDate,
      });
    }
  };

  const handleDeleteClick = (line: any) => {
    setTargetLine(line);
    setIsDeleteConfirmOpen(true);
  };

  if (isLoading) {
    return (
      <div className="h-[60vh] flex flex-col justify-center items-center gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
        <span className="text-gray-500 font-medium text-sm">{t("common.loading")}</span>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center text-gray-500">
        Category not found.
      </div>
    );
  }

  const lines = category.lines || [];
  const totalPlanned = lines.reduce((acc: number, l: any) => acc + l.plannedAmount, 0);
  const totalSpent = lines.reduce((acc: number, l: any) => acc + l.actualAmount, 0);
  const Icon = iconMap[category.icon] || HelpCircle;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/?year=${year}&month=${month}`)}
            className="p-2.5 rounded-xl border border-stone-200/80 dark:border-slate-800 hover:bg-stone-50 dark:hover:bg-slate-800/60 transition-all text-stone-600 dark:text-slate-400 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 rtl:rotate-180 stroke-[2]" />
          </button>
          <div className="flex items-center gap-3.5">
            <div
              className="p-3 rounded-2xl text-white shadow-lg"
              style={{ backgroundColor: category.colorHex }}
            >
              <Icon className="w-5.5 h-5.5 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white tracking-tight font-display">
                {getCategoryName(category.nameKey, t)}
              </h1>
              <p className="text-[10px] font-black text-stone-400 dark:text-slate-500 uppercase tracking-widest font-display">
                {t(`history.months.${month}`)} {year}
              </p>
            </div>
          </div>
        </div>

        {/* Add Line Action */}
        <button
          onClick={() => setIsAddLineOpen(true)}
          className="flex items-center justify-center gap-2 px-4.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-xs uppercase tracking-wider font-display transition-all shadow-md shadow-emerald-500/10 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4.5 h-4.5 stroke-[2.2]" />
          <span>{t("category_detail.addSubItem")}</span>
        </button>
      </div>

      {/* Stats Summary Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 bg-stone-50/50 dark:bg-slate-900/40 p-6 rounded-[24px] border border-stone-200/50 dark:border-slate-850">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-slate-500 font-display">
            {t("category_detail.plannedAmount")}
          </p>
          <p className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white font-display tracking-tight">
            {formatCurrency(totalPlanned, currency, i18n.language)}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-slate-500 font-display">
            {t("category_detail.actualAmount")}
          </p>
          <p className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white font-display tracking-tight">
            {formatCurrency(totalSpent, currency, i18n.language)}
          </p>
        </div>
        <div className="sm:col-span-2 lg:col-span-1 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-slate-500 font-display">
            {t("history.table.remaining")}
          </p>
          <p
            className={`text-xl sm:text-2xl font-black font-display tracking-tight ${
              totalPlanned - totalSpent >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {formatCurrency(totalPlanned - totalSpent, currency, i18n.language)}
          </p>
        </div>
      </div>

      {/* Category Budget Lines Table */}
      <div className="bg-white dark:bg-slate-900 rounded-[24px] border border-stone-200/60 dark:border-slate-850 shadow-sm overflow-hidden">
        {lines.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-start">
              <thead>
                <tr className="bg-stone-50/40 dark:bg-slate-950/20 border-b border-stone-150 dark:border-slate-850 text-stone-400 font-bold uppercase text-[10px] tracking-wider font-display">
                  <th className="px-6 py-4.5 text-start font-bold">{t("common.appName")} &mdash; {t("common.label")}</th>
                  <th className="px-6 py-4.5 text-start font-bold">{t("category_detail.plannedAmount")}</th>
                  <th className="px-6 py-4.5 text-start font-bold">{t("category_detail.actualAmount")}</th>
                  <th className="px-6 py-4.5 text-start font-bold">{t("common.date")}</th>
                  <th className="px-6 py-4.5 text-center font-bold">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-slate-850">
                {lines.map((line: any) => (
                  <tr
                    key={line.id}
                    className="hover:bg-stone-50/40 dark:hover:bg-slate-850/20 transition-all"
                  >
                    {/* Label */}
                    <td className="px-6 py-4 text-start font-semibold text-stone-850 dark:text-slate-100 font-display text-sm">
                      {line.label}
                    </td>
                    {/* Planned */}
                    <td className="px-6 py-4 text-start text-stone-600 dark:text-slate-300 font-mono text-xs font-semibold">
                      {formatCurrency(line.plannedAmount, currency, i18n.language)}
                    </td>
                    {/* Spent */}
                    <td className="px-6 py-4 text-start text-stone-900 dark:text-white font-mono text-xs font-bold">
                      {formatCurrency(line.actualAmount, currency, i18n.language)}
                    </td>
                    {/* Date */}
                    <td className="px-6 py-4 text-start text-stone-500 dark:text-slate-400 font-mono text-[11px] tracking-wide">
                      {formatDate(line.date, i18n.language)}
                    </td>
                    {/* Actions */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleEditClick(line)}
                          className="p-1.5 text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4 stroke-[2]" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(line)}
                          className="p-1.5 text-stone-400 hover:text-rose-600 dark:hover:text-rose-450 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-all cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4 stroke-[2]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-20 text-center max-w-sm mx-auto flex flex-col items-center gap-4">
            <div className="p-4 bg-stone-50 dark:bg-slate-950 rounded-2xl text-stone-400">
              <Icon className="w-8 h-8 text-stone-300 stroke-[1.5]" />
            </div>
            <p className="text-xs font-bold uppercase tracking-wider font-display text-stone-500 dark:text-slate-400">
              {t("category_detail.emptyLines")}
            </p>
          </div>
        )}
      </div>

      {/* DIALOG 1: Add New Line */}
      <Dialog
        isOpen={isAddLineOpen}
        onClose={() => setIsAddLineOpen(false)}
        title={t("category_detail.addSubItem")}
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider font-display text-stone-500 dark:text-slate-400 mb-1.5">
              {t("common.label")}
            </label>
            <input
              type="text"
              required
              value={lineLabel}
              onChange={(e) => setLineLabel(e.target.value)}
              className="block w-full px-4 py-3 rounded-2xl border border-stone-200 dark:border-slate-800 bg-stone-50/50 dark:bg-slate-950/40 text-stone-950 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-emerald-500 transition-all"
              placeholder="ex: Wifi Fiber"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider font-display text-stone-500 dark:text-slate-400 mb-1.5">
                {t("category_detail.plannedAmount")} ({currency})
              </label>
              <input
                type="number"
                step="any"
                required
                value={linePlanned}
                onChange={(e) => setLinePlanned(e.target.value)}
                className="block w-full px-4 py-3 rounded-2xl border border-stone-200 dark:border-slate-800 bg-stone-50/50 dark:bg-slate-950/40 text-stone-950 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-emerald-500 transition-all"
                placeholder="250"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider font-display text-stone-500 dark:text-slate-400 mb-1.5">
                {t("category_detail.actualAmount")} ({currency})
              </label>
              <input
                type="number"
                step="any"
                required
                value={lineActual}
                onChange={(e) => setLineActual(e.target.value)}
                className="block w-full px-4 py-3 rounded-2xl border border-stone-200 dark:border-slate-800 bg-stone-50/50 dark:bg-slate-950/40 text-stone-950 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-emerald-500 transition-all"
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider font-display text-stone-500 dark:text-slate-400 mb-1.5">
              {t("common.date")}
            </label>
            <input
              type="date"
              required
              value={lineDate}
              onChange={(e) => setLineDate(e.target.value)}
              className="block w-full px-4 py-3 rounded-2xl border border-stone-200 dark:border-slate-800 bg-stone-50/50 dark:bg-slate-950/40 text-stone-950 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-emerald-500 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={addLineMutation.isPending}
            className="w-full py-3.5 px-4 bg-stone-900 hover:bg-stone-850 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white dark:text-slate-950 font-bold text-xs uppercase tracking-wider font-display rounded-2xl transition-all cursor-pointer"
          >
            {addLineMutation.isPending ? t("common.loading") : t("common.add")}
          </button>
        </form>
      </Dialog>

      {/* DIALOG 2: Edit Budget Line */}
      <Dialog
        isOpen={isEditLineOpen}
        onClose={() => setIsEditLineOpen(false)}
        title={t("category_detail.editSubItem")}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider font-display text-stone-500 dark:text-slate-400 mb-1.5">
              {t("common.label")}
            </label>
            <input
              type="text"
              required
              value={lineLabel}
              onChange={(e) => setLineLabel(e.target.value)}
              className="block w-full px-4 py-3 rounded-2xl border border-stone-200 dark:border-slate-800 bg-stone-50/50 dark:bg-slate-950/40 text-stone-950 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-emerald-500 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider font-display text-stone-500 dark:text-slate-400 mb-1.5">
                {t("category_detail.plannedAmount")} ({currency})
              </label>
              <input
                type="number"
                step="any"
                required
                value={linePlanned}
                onChange={(e) => setLinePlanned(e.target.value)}
                className="block w-full px-4 py-3 rounded-2xl border border-stone-200 dark:border-slate-800 bg-stone-50/50 dark:bg-slate-950/40 text-stone-950 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-emerald-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider font-display text-stone-500 dark:text-slate-400 mb-1.5">
                {t("category_detail.actualAmount")} ({currency})
              </label>
              <input
                type="number"
                step="any"
                required
                value={lineActual}
                onChange={(e) => setLineActual(e.target.value)}
                className="block w-full px-4 py-3 rounded-2xl border border-stone-200 dark:border-slate-800 bg-stone-50/50 dark:bg-slate-950/40 text-stone-950 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-emerald-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider font-display text-stone-500 dark:text-slate-400 mb-1.5">
              {t("common.date")}
            </label>
            <input
              type="date"
              required
              value={lineDate}
              onChange={(e) => setLineDate(e.target.value)}
              className="block w-full px-4 py-3 rounded-2xl border border-stone-200 dark:border-slate-800 bg-stone-50/50 dark:bg-slate-950/40 text-stone-950 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-emerald-500 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={editLineMutation.isPending}
            className="w-full py-3.5 px-4 bg-stone-900 hover:bg-stone-850 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white dark:text-slate-950 font-bold text-xs uppercase tracking-wider font-display rounded-2xl transition-all cursor-pointer"
          >
            {editLineMutation.isPending ? t("common.loading") : t("common.save")}
          </button>
        </form>
      </Dialog>

      {/* DIALOG 3: Delete Confirmation */}
      <Dialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        title={t("common.delete")}
      >
        <div className="space-y-5">
          <p className="text-xs font-bold uppercase tracking-wider font-display text-stone-600 dark:text-slate-400">
            {t("category_detail.deleteConfirm")}
          </p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setIsDeleteConfirmOpen(false)}
              className="px-4.5 py-2.5 rounded-xl border border-stone-200 dark:border-slate-800 hover:bg-stone-50 dark:hover:bg-slate-800 text-stone-700 dark:text-slate-300 text-xs font-bold uppercase tracking-wider font-display transition-all cursor-pointer"
            >
              {t("common.cancel")}
            </button>
            <button
              onClick={() => deleteLineMutation.mutate(targetLine?.id)}
              disabled={deleteLineMutation.isPending}
              className="px-4.5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-750 text-white text-xs font-bold uppercase tracking-wider font-display transition-all cursor-pointer animate-pulse"
            >
              {deleteLineMutation.isPending ? t("common.loading") : t("common.confirm")}
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
