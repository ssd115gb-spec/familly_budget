export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface Category {
  id: string;
  userId: string;
  nameKey: string;
  colorHex: string;
  icon: string;
  isDefault: boolean;
}

export interface MonthlyBudget {
  id: string;
  userId: string;
  year: number;
  month: number;
  totalBudgetAmount: number;
}

export interface BudgetLine {
  id: string;
  categoryId: string;
  monthlyBudgetId: string;
  label: string;
  plannedAmount: number;
  actualAmount: number;
  date: string;
}

export interface CategoryStat {
  id: string;
  nameKey: string;
  colorHex: string;
  icon: string;
  isDefault: boolean;
  plannedAmount: number;
  actualAmount: number;
  lines: BudgetLine[];
}

export interface BudgetStatsResponse {
  monthlyBudget: MonthlyBudget;
  categories: CategoryStat[];
}

export interface Debt {
  id: string;
  userId: string;
  name: string;
  monthlyInstallment: number;
  totalAmount: number | null;
  remainingAmount: number;
  startDate: string;
  estimatedEndDate: string | null;
  payments: DebtPayment[];
}

export interface DebtPayment {
  id: string;
  debtId: string;
  year: number;
  month: number;
  amountPaid: number;
  date: string;
}

export interface HistoryItem {
  month: number;
  totalBudget: number;
  totalSpent: number;
  remaining: number;
  categories: Record<string, { planned: number; spent: number }>;
}
