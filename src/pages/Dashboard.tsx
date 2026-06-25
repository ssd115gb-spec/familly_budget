import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { useAppStore } from "../store";
import { apiRequest } from "../api";
import {
  formatCurrency,
  getCategoryName,
  getProgressBarColor,
  getProgressBarTextColor,
} from "../utils";
import Dialog from "../components/Dialog";
import {
  ReceiptText,
  Sparkles,
  PiggyBank,
  CreditCard,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit3,
  TrendingUp,
  Loader2,
  Calendar,
  Trash2,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

const iconMap: Record<string, any> = {
  ReceiptText,
  Sparkles,
  PiggyBank,
  CreditCard,
};

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currency } = useAppStore();

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);

  // Modals state
  const [isEditBudgetOpen, setIsEditBudgetOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);

  // Form states
  const [newBudgetAmount, setNewBudgetAmount] = useState("");
  const [newPassiveIncome, setNewPassiveIncome] = useState("");
  const [expenseLabel, setExpenseLabel] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCatId, setExpenseCatId] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0]);

  // Fetch stats
  const { data, isLoading } = useQuery({
    queryKey: ["budget-stats", year, month],
    queryFn: () => apiRequest(`/budgets/stats?year=${year}&month=${month}`),
  });

  // Mutate budget amount
  const updateBudgetMutation = useMutation({
    mutationFn: ({ totalBudgetAmount, passiveIncome }: { totalBudgetAmount: number; passiveIncome: number }) =>
      apiRequest("/budgets/amount", {
        method: "PUT",
        body: JSON.stringify({ year, month, totalBudgetAmount, passiveIncome }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-stats"] });
      setIsEditBudgetOpen(false);
    },
  });

  // Mutate add expense line
  const addExpenseMutation = useMutation({
    mutationFn: (body: any) =>
      apiRequest("/budget-lines", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-stats"] });
      setIsAddExpenseOpen(false);
      // Reset form
      setExpenseLabel("");
      setExpenseAmount("");
      setExpenseCatId("");
    },
  });

  // Passive income modal and form states
  const [isPassiveIncomeModalOpen, setIsPassiveIncomeModalOpen] = useState(false);
  const [editingPassiveIncome, setEditingPassiveIncome] = useState<any>(null);
  const [piName, setPiName] = useState("");
  const [piAmount, setPiAmount] = useState("");

  // Passive income mutations
  const addPassiveIncomeMutation = useMutation({
    mutationFn: (body: { name: string; amount: number; monthlyBudgetId: string }) =>
      apiRequest("/budgets/passive-income", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-stats"] });
      setIsPassiveIncomeModalOpen(false);
      setPiName("");
      setPiAmount("");
    },
  });

  const updatePassiveIncomeMutation = useMutation({
    mutationFn: (body: { id: string; name: string; amount: number }) =>
      apiRequest(`/budgets/passive-income/${body.id}`, {
        method: "PUT",
        body: JSON.stringify({ name: body.name, amount: body.amount }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-stats"] });
      setIsPassiveIncomeModalOpen(false);
      setEditingPassiveIncome(null);
      setPiName("");
      setPiAmount("");
    },
  });

  const deletePassiveIncomeMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/budgets/passive-income/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-stats"] });
    },
  });

  const handleOpenAddPassiveIncome = () => {
    setEditingPassiveIncome(null);
    setPiName("");
    setPiAmount("");
    setIsPassiveIncomeModalOpen(true);
  };

  const handleOpenEditPassiveIncome = (pi: any) => {
    setEditingPassiveIncome(pi);
    setPiName(pi.name);
    setPiAmount(pi.amount.toString());
    setIsPassiveIncomeModalOpen(true);
  };

  const handleSavePassiveIncome = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(piAmount);
    if (!piName.trim() || isNaN(amountNum) || amountNum < 0) return;

    if (editingPassiveIncome) {
      updatePassiveIncomeMutation.mutate({
        id: editingPassiveIncome.id,
        name: piName,
        amount: amountNum,
      });
    } else {
      const budgetId = data?.monthlyBudget?.id;
      if (!budgetId) return;
      addPassiveIncomeMutation.mutate({
        name: piName,
        amount: amountNum,
        monthlyBudgetId: budgetId,
      });
    }
  };

  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear((prev) => prev - 1);
    } else {
      setMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear((prev) => prev + 1);
    } else {
      setMonth((prev) => prev + 1);
    }
  };

  const handleEditBudget = () => {
    if (data?.monthlyBudget) {
      setNewBudgetAmount(data.monthlyBudget.totalBudgetAmount.toString());
      const passiveIncomesList = data.monthlyBudget.passiveIncomes || [];
      const computedPassive = passiveIncomesList.reduce((acc: number, pi: any) => acc + (pi.amount || 0), 0);
      setNewPassiveIncome(computedPassive.toString());
      setIsEditBudgetOpen(true);
    }
  };

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(newBudgetAmount);
    const passiveIncomesList = data?.monthlyBudget?.passiveIncomes || [];
    const computedPassive = passiveIncomesList.reduce((acc: number, pi: any) => acc + (pi.amount || 0), 0);
    if (!isNaN(amount) && amount >= 0) {
      updateBudgetMutation.mutate({ totalBudgetAmount: amount, passiveIncome: computedPassive });
    }
  };

  const handleAddExpenseClick = () => {
    if (data?.categories?.length > 0) {
      setExpenseCatId(data.categories[0].id);
      setIsAddExpenseOpen(true);
    }
  };

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(expenseAmount);
    if (expenseLabel.trim() && !isNaN(amount) && expenseCatId && data?.monthlyBudget) {
      addExpenseMutation.mutate({
        categoryId: expenseCatId,
        monthlyBudgetId: data.monthlyBudget.id,
        label: expenseLabel,
        plannedAmount: 0, // Direct quick spent has 0 planned
        actualAmount: amount,
        date: expenseDate,
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

  if (data?.monthlyBudget === null) {
    return (
      <div className="max-w-md mx-auto py-20 px-6 text-center space-y-6">
        <h2 className="text-2xl font-black text-stone-900 dark:text-white font-display">
          {t("dashboard.noBudgetTitle") || "Create Budget"}
        </h2>
        <p className="text-stone-600 dark:text-slate-400">
          {t("dashboard.noBudgetDescription") || "You don't have a budget for this month yet. You can start fresh or clone from a previous month."}
        </p>
        <div className="space-y-4">
          <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300">
            {t("dashboard.cloneFrom") || "Clone from (Optional)"}
          </label>
          <select 
            id="sourceBudgetSelect"
            className="w-full p-3 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"
          >
            <option value="">{t("dashboard.startFresh") || "Start Fresh"}</option>
            {data.availableBudgets.map((b: any) => (
              <option key={b.id} value={b.id}>
                {t(`history.months.${b.month}`)} {b.year}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              const select = document.getElementById("sourceBudgetSelect") as HTMLSelectElement;
              const sourceMonthlyBudgetId = select.value;
              apiRequest("/budgets/create", {
                method: "POST",
                body: JSON.stringify({ year, month, sourceMonthlyBudgetId: sourceMonthlyBudgetId || null }),
              }).then(() => queryClient.invalidateQueries({ queryKey: ["budget-stats"] }));
            }}
            className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-2xl transition-all"
          >
            {t("common.create")}
          </button>
        </div>
      </div>
    );
  }

  const initBudget = data?.monthlyBudget?.totalBudgetAmount || 0;
  const passiveIncomesList = data?.monthlyBudget?.passiveIncomes || [];
  const passiveIncome = passiveIncomesList.reduce((acc: number, pi: any) => acc + (pi.amount || 0), 0);
  const debtsList = data?.debts || [];
  const totalDebts = debtsList.reduce((acc: number, d: any) => acc + (d.monthlyInstallment || 0), 0);
  const budget = initBudget + passiveIncome - totalDebts;
  const categories = data?.categories || [];

  // Calculate totals
  const totalPlanned = categories.reduce((acc: number, c: any) => acc + c.plannedAmount, 0);
  const totalSpent = categories.reduce((acc: number, c: any) => acc + c.actualAmount, 0);
  const remaining = budget - totalSpent;
  const remainingPercent = budget > 0 ? (remaining / budget) * 100 : 0;

  // Prepare chart data
  const chartData = categories
    .filter((c: any) => c.plannedAmount > 0)
    .map((c: any) => ({
      name: getCategoryName(c.nameKey, t),
      value: c.plannedAmount,
      color: c.colorHex,
    }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Month/Year Picker & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-white tracking-tight flex items-center gap-3 font-display">
            <div className="p-2 bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-300 rounded-xl">
              <Calendar className="w-6 h-6 stroke-[2]" />
            </div>
            <span>{t("dashboard.title")}</span>
          </h1>
        </div>

        {/* Navigation Selector */}
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-stone-200/60 dark:border-slate-800 self-start sm:self-auto shadow-sm">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-xl hover:bg-stone-50 dark:hover:bg-slate-800 text-stone-600 dark:text-slate-400 transition-colors"
          >
            {i18n.language === "ar" ? <ChevronRight className="w-4.5 h-4.5 stroke-[2.2]" /> : <ChevronLeft className="w-4.5 h-4.5 stroke-[2.2]" />}
          </button>
          <span className="text-xs font-black uppercase tracking-wider font-display text-stone-850 dark:text-slate-200 min-w-[120px] text-center">
            {t(`history.months.${month}`)} {year}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-2 rounded-xl hover:bg-stone-50 dark:hover:bg-slate-800 text-stone-600 dark:text-slate-400 transition-colors"
          >
            {i18n.language === "ar" ? <ChevronLeft className="w-4.5 h-4.5 stroke-[2.2]" /> : <ChevronRight className="w-4.5 h-4.5 stroke-[2.2]" />}
          </button>
        </div>
      </div>

      {/* 4 Beautiful Colored Cards matching the Mockup */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Purple (Base Budget) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="relative overflow-hidden bg-gradient-to-br from-indigo-500 to-violet-600 text-white p-6 rounded-3xl shadow-lg shadow-violet-500/10 flex flex-col justify-between h-[140px] group"
        >
          <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-125 transition-transform" />
          <div className="flex justify-between items-start">
            <div className="p-2.5 bg-white/15 rounded-full backdrop-blur-md">
              <PiggyBank className="w-5 h-5 text-white stroke-[2.2]" />
            </div>
            <button
              onClick={handleEditBudget}
              className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all cursor-pointer z-10"
              title={t("dashboard.editBudget")}
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-1">
            <p className="text-violet-100/80 text-[10px] font-extrabold uppercase tracking-widest font-display">
              {t("dashboard.initBudget") || "Base Budget"}
            </p>
            <h4 className="text-xl sm:text-2xl font-black font-display tracking-tight text-white">
              {formatCurrency(initBudget, currency, i18n.language)}
            </h4>
          </div>
        </motion.div>

        {/* Card 2: Blue (Passive Income) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative overflow-hidden bg-gradient-to-br from-sky-400 to-blue-600 text-white p-6 rounded-3xl shadow-lg shadow-blue-500/10 flex flex-col justify-between h-[140px] group"
        >
          <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-125 transition-transform" />
          <div className="flex justify-between items-start">
            <div className="p-2.5 bg-white/15 rounded-full backdrop-blur-md">
              <TrendingUp className="w-5 h-5 text-white stroke-[2.2]" />
            </div>
            <button
              onClick={handleOpenAddPassiveIncome}
              className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all cursor-pointer z-10"
              title={t("dashboard.addPassiveIncome")}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-1">
            <p className="text-blue-100/80 text-[10px] font-extrabold uppercase tracking-widest font-display">
              {t("dashboard.passiveIncome")}
            </p>
            <h4 className="text-xl sm:text-2xl font-black font-display tracking-tight text-white">
              {formatCurrency(passiveIncome, currency, i18n.language)}
            </h4>
          </div>
        </motion.div>

        {/* Card 3: Red (Total Spent) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="relative overflow-hidden bg-gradient-to-br from-rose-400 to-pink-600 text-white p-6 rounded-3xl shadow-lg shadow-rose-500/10 flex flex-col justify-between h-[140px] group"
        >
          <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-125 transition-transform" />
          <div className="flex justify-between items-start">
            <div className="p-2.5 bg-white/15 rounded-full backdrop-blur-md">
              <CreditCard className="w-5 h-5 text-white stroke-[2.2]" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-rose-100/80 text-[10px] font-extrabold uppercase tracking-widest font-display">
              {t("dashboard.totalSpent")}
            </p>
            <h4 className="text-xl sm:text-2xl font-black font-display tracking-tight text-white">
              {formatCurrency(totalSpent, currency, i18n.language)}
            </h4>
          </div>
        </motion.div>

        {/* Card 4: Orange ("Chhal Bqa Lik") */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative overflow-hidden bg-gradient-to-br from-amber-400 to-orange-500 text-white p-6 rounded-3xl shadow-lg shadow-orange-500/10 flex flex-col justify-between h-[140px] group"
        >
          <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-125 transition-transform" />
          <div className="flex justify-between items-start">
            <div className="p-2.5 bg-white/15 rounded-full backdrop-blur-md">
              <Sparkles className="w-5 h-5 text-white stroke-[2.2]" />
            </div>
            <span className="text-[10px] font-black bg-white/20 px-2 py-0.5 rounded-lg font-mono text-white">
              {remainingPercent.toFixed(0)}%
            </span>
          </div>
          <div className="space-y-1">
            <p className="text-amber-100/80 text-[10px] font-extrabold uppercase tracking-widest font-display">
              {i18n.language === "ar" ? "شحال بقى ليك تصرف" : "Chhal Bqa Lik Tasraf"}
            </p>
            <h4 className="text-xl sm:text-2xl font-black font-display tracking-tight text-white">
              {formatCurrency(remaining, currency, i18n.language)}
            </h4>
          </div>
        </motion.div>
      </div>

      {/* Grid: 4 Core Categories + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Categories List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-md font-extrabold uppercase tracking-wider text-stone-500 font-display">
              {t("category_detail.title")}
            </h3>
            <button
              onClick={handleAddExpenseClick}
              className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-2xl text-xs font-bold uppercase tracking-wider font-display transition-all shadow-md shadow-violet-500/10 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.2]" />
              <span>{t("dashboard.addExpense")}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {categories.map((cat: any) => {
              const Icon = iconMap[cat.icon] || HelpCircle;
              const percent = cat.plannedAmount > 0 ? (cat.actualAmount / cat.plannedAmount) * 100 : 0;
              const isOver = cat.actualAmount > cat.plannedAmount;

              return (
                <motion.div
                  key={cat.id}
                  whileHover={{ y: -4, scale: 1.01 }}
                  onClick={() => navigate(`/categories/${cat.id}?year=${year}&month=${month}`)}
                  className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-stone-200/50 dark:border-slate-850 shadow-sm hover:shadow-md cursor-pointer transition-all flex flex-col justify-between h-[165px]"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div
                        className="p-2.5 rounded-xl text-white shadow-sm"
                        style={{ backgroundColor: cat.colorHex }}
                      >
                        <Icon className="w-4.5 h-4.5 stroke-[2.2]" />
                      </div>
                      <span className="font-bold text-stone-800 dark:text-slate-100 text-sm max-w-[130px] line-clamp-2 font-display">
                        {getCategoryName(cat.nameKey, t)}
                      </span>
                    </div>
                    {isOver && (
                      <span className="text-[10px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-full uppercase tracking-wider font-display">
                        {t("dashboard.overBudget")}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-stone-500 dark:text-slate-400">
                        {t("dashboard.spent")}: <strong className="font-mono font-bold text-stone-850 dark:text-slate-200">{formatCurrency(cat.actualAmount, currency, i18n.language)}</strong>
                      </span>
                      <span className="text-stone-450 dark:text-slate-500 font-mono text-[11px]">
                        / {formatCurrency(cat.plannedAmount, currency, i18n.language)}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-stone-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(percent)}`}
                        style={{ width: `${Math.min(100, percent)}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                      <span className={`font-mono text-xs ${getProgressBarTextColor(percent)}`}>
                        {percent.toFixed(0)}%
                      </span>
                      <span className="text-stone-400 dark:text-slate-500 hover:text-stone-900 dark:hover:text-white hover:underline transition-all font-display">
                        {t("common.edit")} &rarr;
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Sidebar: Chart & Passive Incomes */}
        <div className="space-y-8 lg:col-span-1">
          {/* Chart Card */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-stone-200/50 dark:border-slate-850 shadow-sm flex flex-col justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-stone-500 dark:text-slate-400 mb-4 font-display">
              {t("dashboard.budgetDistribution")}
            </h3>

            <div className="h-[230px] w-full flex items-center justify-center">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {chartData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any) => [`${value} ${currency}`, ""]}
                      contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontFamily: "Inter" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center text-center gap-2.5 text-stone-400">
                  <TrendingUp className="w-8 h-8 text-stone-300 stroke-[1.5]" />
                  <span className="text-xs font-display">{t("common.noData")}</span>
                </div>
              )}
            </div>

            {/* Simple Chart Legend */}
            <div className="grid grid-cols-2 gap-2 text-xs pt-4 border-t border-stone-100 dark:border-slate-800 mt-2">
              {categories.map((c: any) => (
                <div key={c.id} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.colorHex }} />
                  <span className="truncate text-stone-600 dark:text-slate-400 font-bold font-display tracking-wide text-[11px]">
                    {getCategoryName(c.nameKey, t)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Passive Incomes Card */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-stone-200/50 dark:border-slate-850 shadow-sm flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-widest text-stone-500 dark:text-slate-400 font-display">
                {t("dashboard.passiveIncome")}
              </h3>
              <button
                onClick={handleOpenAddPassiveIncome}
                className="p-1.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                title="Add Passive Income"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {data?.monthlyBudget?.passiveIncomes && data.monthlyBudget.passiveIncomes.length > 0 ? (
                data.monthlyBudget.passiveIncomes.map((pi: any) => (
                  <div
                    key={pi.id}
                    className="flex justify-between items-center p-3 rounded-2xl bg-stone-50 dark:bg-slate-950/40 border border-stone-100 dark:border-slate-850 hover:bg-stone-100/50 dark:hover:bg-slate-950/65 transition-all group"
                  >
                    <div className="flex flex-col">
                      <span className="font-semibold text-stone-800 dark:text-slate-200 text-sm font-display leading-tight">
                        {pi.name}
                      </span>
                      <span className="text-xs text-stone-400 dark:text-slate-500 font-mono mt-0.5">
                        {formatCurrency(pi.amount, currency, i18n.language)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleOpenEditPassiveIncome(pi)}
                        className="p-1 text-stone-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all cursor-pointer"
                        title={t("common.edit")}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(t("common.confirmDelete") || "Are you sure?")) {
                            deletePassiveIncomeMutation.mutate(pi.id);
                          }
                        }}
                        className="p-1 text-stone-400 hover:text-rose-500 transition-all cursor-pointer"
                        title={t("common.delete")}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-stone-400 dark:text-slate-500 text-xs">
                  {t("dashboard.noPassiveIncome") || "No passive income items registered for this month."}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* DIALOG 1: Edit Total Monthly Budget */}
      <Dialog
        isOpen={isEditBudgetOpen}
        onClose={() => setIsEditBudgetOpen(false)}
        title={t("dashboard.editBudget")}
      >
        <form onSubmit={handleSaveBudget} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 font-display">
              {t("dashboard.initBudget")} ({currency})
            </label>
            <input
              type="number"
              required
              value={newBudgetAmount}
              onChange={(e) => setNewBudgetAmount(e.target.value)}
              className="block w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-950 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="10000"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 font-display">
              {t("dashboard.passiveIncome")} ({currency})
            </label>
            <input
              type="number"
              disabled
              value={newPassiveIncome}
              className="block w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-sm cursor-not-allowed"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              {i18n.language === "fr" 
                ? "Calculé automatiquement à partir de la section des revenus passifs." 
                : i18n.language === "ar" 
                  ? "يتم حسابه تلقائياً من قسم الدخل السلبي." 
                  : "Automatically calculated from the passive income section below."}
            </p>
          </div>
          <button
            type="submit"
            disabled={updateBudgetMutation.isPending}
            className="w-full py-2.5 px-4 bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm rounded-xl transition-colors cursor-pointer"
          >
            {updateBudgetMutation.isPending ? t("common.loading") : t("common.save")}
          </button>
        </form>
      </Dialog>

      {/* DIALOG 2: Quick Add Expense */}
      <Dialog
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        title={t("dashboard.addExpense")}
      >
        <form onSubmit={handleSaveExpense} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              {t("common.label")}
            </label>
            <input
              type="text"
              required
              value={expenseLabel}
              onChange={(e) => setExpenseLabel(e.target.value)}
              className="block w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-950 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="ex: Facture Eau Lydec"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t("common.amount")} ({currency})
              </label>
              <input
                type="number"
                required
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                className="block w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-950 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="400"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t("history.table.category")}
              </label>
              <select
                value={expenseCatId}
                onChange={(e) => setExpenseCatId(e.target.value)}
                className="block w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-950 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {categories.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {getCategoryName(c.nameKey, t)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              {t("common.date")}
            </label>
            <input
              type="date"
              required
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="block w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-950 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <button
            type="submit"
            disabled={addExpenseMutation.isPending}
            className="w-full py-2.5 px-4 bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm rounded-xl transition-colors cursor-pointer"
          >
            {addExpenseMutation.isPending ? t("common.loading") : t("common.add")}
          </button>
        </form>
      </Dialog>

      {/* DIALOG 3: Add/Edit Passive Income */}
      <Dialog
        isOpen={isPassiveIncomeModalOpen}
        onClose={() => setIsPassiveIncomeModalOpen(false)}
        title={editingPassiveIncome ? t("common.edit") : t("dashboard.addPassiveIncome") || "Add Passive Income"}
      >
        <form onSubmit={handleSavePassiveIncome} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              {t("common.name") || "Name"}
            </label>
            <input
              type="text"
              required
              value={piName}
              onChange={(e) => setPiName(e.target.value)}
              className="block w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-950 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="ex: Dividends, Rent, Side Hustle"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              {t("common.amount")} ({currency})
            </label>
            <input
              type="number"
              required
              value={piAmount}
              onChange={(e) => setPiAmount(e.target.value)}
              className="block w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-950 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="2500"
            />
          </div>

          <button
            type="submit"
            disabled={addPassiveIncomeMutation.isPending || updatePassiveIncomeMutation.isPending}
            className="w-full py-2.5 px-4 bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm rounded-xl transition-colors cursor-pointer"
          >
            {addPassiveIncomeMutation.isPending || updatePassiveIncomeMutation.isPending ? t("common.loading") : t("common.save")}
          </button>
        </form>
      </Dialog>
    </div>
  );
}
