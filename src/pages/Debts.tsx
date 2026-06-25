import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { useAppStore } from "../store";
import { apiRequest } from "../api";
import { formatCurrency, formatDate } from "../utils";
import Dialog from "../components/Dialog";
import {
  CreditCard,
  Plus,
  TrendingDown,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle,
  PiggyBank,
  ChevronRight,
} from "lucide-react";

export default function Debts() {
  const { t, i18n } = useTranslation();
  const { currency } = useAppStore();
  const queryClient = useQueryClient();

  // Modals state
  const [isAddDebtOpen, setIsAddDebtOpen] = useState(false);
  const [isEditDebtOpen, setIsEditDebtOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);

  // Forms state
  const [targetDebt, setTargetDebt] = useState<any | null>(null);
  const [debtName, setDebtName] = useState("");
  const [debtInstallment, setDebtInstallment] = useState("");
  const [debtTotal, setDebtTotal] = useState("");
  const [debtRemaining, setDebtRemaining] = useState("");
  const [debtStart, setDebtStart] = useState(new Date().toISOString().split("T")[0]);
  const [debtEnd, setDebtEnd] = useState("");

  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentYear, setPaymentYear] = useState(new Date().getFullYear().toString());
  const [paymentMonth, setPaymentMonth] = useState((new Date().getMonth() + 1).toString());

  // Fetch debts
  const { data: debts, isLoading } = useQuery({
    queryKey: ["debts"],
    queryFn: () => apiRequest("/debts"),
  });

  // Add Debt mutation
  const addDebtMutation = useMutation({
    mutationFn: (body: any) =>
      apiRequest("/debts", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debts"] });
      setIsAddDebtOpen(false);
      resetDebtForm();
    },
  });

  // Edit Debt mutation
  const editDebtMutation = useMutation({
    mutationFn: (body: any) =>
      apiRequest(`/debts/${targetDebt?.id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debts"] });
      setIsEditDebtOpen(false);
      setTargetDebt(null);
    },
  });

  // Delete Debt mutation
  const deleteDebtMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/debts/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debts"] });
      setIsDeleteConfirmOpen(false);
      setTargetDebt(null);
    },
  });

  // Record Payment mutation
  const recordPaymentMutation = useMutation({
    mutationFn: (body: any) =>
      apiRequest(`/debts/${targetDebt?.id}/payments`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debts"] });
      queryClient.invalidateQueries({ queryKey: ["budget-stats"] });
      setIsRecordPaymentOpen(false);
      setPaymentAmount("");
      setTargetDebt(null);
    },
  });

  const resetDebtForm = () => {
    setDebtName("");
    setDebtInstallment("");
    setDebtTotal("");
    setDebtRemaining("");
    setDebtStart(new Date().toISOString().split("T")[0]);
    setDebtEnd("");
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (debtName.trim() && debtInstallment && debtRemaining) {
      addDebtMutation.mutate({
        name: debtName,
        monthlyInstallment: parseFloat(debtInstallment),
        totalAmount: debtTotal ? parseFloat(debtTotal) : null,
        remainingAmount: parseFloat(debtRemaining),
        startDate: debtStart,
        estimatedEndDate: debtEnd || null,
      });
    }
  };

  const handleEditClick = (debt: any) => {
    setTargetDebt(debt);
    setDebtName(debt.name);
    setDebtInstallment(debt.monthlyInstallment.toString());
    setDebtTotal(debt.totalAmount?.toString() || "");
    setDebtRemaining(debt.remainingAmount.toString());
    setDebtStart(new Date(debt.startDate).toISOString().split("T")[0]);
    setDebtEnd(debt.estimatedEndDate ? new Date(debt.estimatedEndDate).toISOString().split("T")[0] : "");
    setIsEditDebtOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (debtName.trim() && debtInstallment && debtRemaining && targetDebt) {
      editDebtMutation.mutate({
        name: debtName,
        monthlyInstallment: parseFloat(debtInstallment),
        totalAmount: debtTotal ? parseFloat(debtTotal) : null,
        remainingAmount: parseFloat(debtRemaining),
        startDate: debtStart,
        estimatedEndDate: debtEnd || null,
      });
    }
  };

  const handleDeleteClick = (debt: any) => {
    setTargetDebt(debt);
    setIsDeleteConfirmOpen(true);
  };

  const handleRecordPaymentClick = (debt: any) => {
    setTargetDebt(debt);
    setPaymentAmount(debt.monthlyInstallment.toString());
    setIsRecordPaymentOpen(true);
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentAmount && targetDebt) {
      recordPaymentMutation.mutate({
        year: parseInt(paymentYear),
        month: parseInt(paymentMonth),
        amountPaid: parseFloat(paymentAmount),
      });
    }
  };

  if (isLoading) {
    return (
      <div className="h-[60vh] flex flex-col justify-center items-center gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-violet-600" />
        <span className="text-gray-500 font-medium text-sm">{t("common.loading")}</span>
      </div>
    );
  }

  const items = debts || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-violet-600" />
            <span>{t("debts.title")}</span>
          </h1>
        </div>

        <button
          onClick={() => setIsAddDebtOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-violet-500/15 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-5 h-5" />
          <span>{t("debts.addDebt")}</span>
        </button>
      </div>

      {/* Debts Grid layout */}
      {items.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {items.map((debt: any) => {
            const total = debt.totalAmount || debt.remainingAmount; // fallback if no total
            const paid = Math.max(0, total - debt.remainingAmount);
            const progressPercent = total > 0 ? (paid / total) * 100 : 0;

            return (
              <motion.div
                key={debt.id}
                whileHover={{ y: -2 }}
                className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-between h-[280px]"
              >
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-1">
                      {debt.name}
                    </h3>
                    <p className="text-xs text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider mt-0.5">
                      {t("debts.startDate")} : {formatDate(debt.startDate, i18n.language)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleEditClick(debt)}
                      className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(debt)}
                      className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Progress representation */}
                <div className="space-y-3">
                  <div className="flex justify-between items-end text-xs">
                    <div>
                      <span className="text-gray-400 block mb-0.5">{t("debts.remainingAmount")}</span>
                      <strong className="text-base font-black text-gray-800 dark:text-gray-200 font-sans">
                        {formatCurrency(debt.remainingAmount, currency, i18n.language)}
                      </strong>
                    </div>
                    {debt.totalAmount && (
                      <div className="text-end">
                        <span className="text-gray-400 block mb-0.5">{t("debts.totalAmount")}</span>
                        <span className="font-semibold text-gray-500 dark:text-gray-400 font-sans">
                          {formatCurrency(debt.totalAmount, currency, i18n.language)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Meter bar */}
                  <div className="w-full bg-stone-100 h-3 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-violet-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, progressPercent)}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="font-black text-violet-600">
                      {progressPercent.toFixed(0)}% {t("debts.paymentProgress")}
                    </span>
                    <span className="text-stone-400">
                      {t("debts.monthlyInstallment")}: <strong className="font-bold text-stone-800 font-sans">{formatCurrency(debt.monthlyInstallment, currency, i18n.language)}</strong>
                    </span>
                  </div>
                </div>

                {/* Record payment trigger */}
                <button
                  onClick={() => handleRecordPaymentClick(debt)}
                  className="w-full mt-4 flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-violet-50 text-violet-700 hover:bg-violet-100/70 dark:bg-violet-950/20 dark:text-violet-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  <PiggyBank className="w-4 h-4" />
                  <span>{t("debts.recordPayment")}</span>
                </button>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="py-20 text-center max-w-sm mx-auto flex flex-col items-center gap-3 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-full text-gray-400">
            <TrendingDown className="w-8 h-8 text-gray-300 stroke-[1.5]" />
          </div>
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 px-6">
            {t("debts.emptyDebts")}
          </p>
        </div>
      )}

      {/* DIALOG 1: Add Debt */}
      <Dialog
        isOpen={isAddDebtOpen}
        onClose={() => setIsAddDebtOpen(false)}
        title={t("debts.addDebt")}
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              {t("debts.debtName")}
            </label>
            <input
              type="text"
              required
              value={debtName}
              onChange={(e) => setDebtName(e.target.value)}
              className="block w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-950 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="ex: Crédit Immobilier"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t("debts.monthlyInstallment")} ({currency})
              </label>
              <input
                type="number"
                required
                value={debtInstallment}
                onChange={(e) => setDebtInstallment(e.target.value)}
                className="block w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-950 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="2500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t("debts.remainingAmount")} ({currency})
              </label>
              <input
                type="number"
                required
                value={debtRemaining}
                onChange={(e) => setDebtRemaining(e.target.value)}
                className="block w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-950 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="150000"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              {t("debts.totalAmount")} ({currency} - {t("settings.system")} / Optionnel)
            </label>
            <input
              type="number"
              value={debtTotal}
              onChange={(e) => setDebtTotal(e.target.value)}
              className="block w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-950 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="ex: 200000"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t("debts.startDate")}
              </label>
              <input
                type="date"
                required
                value={debtStart}
                onChange={(e) => setDebtStart(e.target.value)}
                className="block w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-950 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t("debts.estimatedEndDate")}
              </label>
              <input
                type="date"
                value={debtEnd}
                onChange={(e) => setDebtEnd(e.target.value)}
                className="block w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-950 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={addDebtMutation.isPending}
            className="w-full py-2.5 px-4 bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm rounded-xl transition-colors cursor-pointer"
          >
            {addDebtMutation.isPending ? t("common.loading") : t("common.add")}
          </button>
        </form>
      </Dialog>

      {/* DIALOG 2: Edit Debt */}
      <Dialog
        isOpen={isEditDebtOpen}
        onClose={() => setIsEditDebtOpen(false)}
        title={t("debts.editDebt")}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              {t("debts.debtName")}
            </label>
            <input
              type="text"
              required
              value={debtName}
              onChange={(e) => setDebtName(e.target.value)}
              className="block w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-950 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t("debts.monthlyInstallment")} ({currency})
              </label>
              <input
                type="number"
                required
                value={debtInstallment}
                onChange={(e) => setDebtInstallment(e.target.value)}
                className="block w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-950 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t("debts.remainingAmount")} ({currency})
              </label>
              <input
                type="number"
                required
                value={debtRemaining}
                onChange={(e) => setDebtRemaining(e.target.value)}
                className="block w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-950 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              {t("debts.totalAmount")} ({currency})
            </label>
            <input
              type="number"
              value={debtTotal}
              onChange={(e) => setDebtTotal(e.target.value)}
              className="block w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-950 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t("debts.startDate")}
              </label>
              <input
                type="date"
                required
                value={debtStart}
                onChange={(e) => setDebtStart(e.target.value)}
                className="block w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-950 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t("debts.estimatedEndDate")}
              </label>
              <input
                type="date"
                value={debtEnd}
                onChange={(e) => setDebtEnd(e.target.value)}
                className="block w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-950 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={editDebtMutation.isPending}
            className="w-full py-2.5 px-4 bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm rounded-xl transition-colors cursor-pointer"
          >
            {editDebtMutation.isPending ? t("common.loading") : t("common.save")}
          </button>
        </form>
      </Dialog>

      {/* DIALOG 3: Delete Debt Confirmation */}
      <Dialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        title={t("common.delete")}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
            {t("debts.deleteConfirm")}
          </p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setIsDeleteConfirmOpen(false)}
              className="px-4 py-2 rounded-xl border border-gray-250 dark:border-gray-700 hover:bg-gray-50 text-gray-700 dark:text-gray-300 text-sm font-bold transition-colors cursor-pointer"
            >
              {t("common.cancel")}
            </button>
            <button
              onClick={() => deleteDebtMutation.mutate(targetDebt?.id)}
              disabled={deleteDebtMutation.isPending}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold transition-colors cursor-pointer"
            >
              {deleteDebtMutation.isPending ? t("common.loading") : t("common.confirm")}
            </button>
          </div>
        </div>
      </Dialog>

      {/* DIALOG 4: Record Installment Payment */}
      <Dialog
        isOpen={isRecordPaymentOpen}
        onClose={() => setIsRecordPaymentOpen(false)}
        title={t("debts.recordPayment")}
      >
        <form onSubmit={handlePaymentSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              {t("debts.amountPaid")} ({currency})
            </label>
            <input
              type="number"
              required
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              className="block w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-950 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Année
              </label>
              <input
                type="number"
                required
                value={paymentYear}
                onChange={(e) => setPaymentYear(e.target.value)}
                className="block w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-950 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Mois (1-12)
              </label>
              <input
                type="number"
                min="1"
                max="12"
                required
                value={paymentMonth}
                onChange={(e) => setPaymentMonth(e.target.value)}
                className="block w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-950 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={recordPaymentMutation.isPending}
            className="w-full py-2.5 px-4 bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm rounded-xl transition-colors cursor-pointer"
          >
            {recordPaymentMutation.isPending ? t("common.loading") : t("common.save")}
          </button>
        </form>
      </Dialog>
    </div>
  );
}
