import express from "express";
import path from "path";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import { PrismaClient } from "@prisma/client";
import { createServer as createViteServer } from "vite";

const prisma = new PrismaClient();
const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(cookieParser());

// Secrets
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "family-budget-access-key-secret-12345";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "family-budget-refresh-key-secret-54321";

// Helper for generating tokens
function generateAccessToken(userId: string, email: string) {
  return jwt.sign({ userId, email }, JWT_ACCESS_SECRET, { expiresIn: "15m" });
}

function generateRefreshToken(userId: string, email: string) {
  return jwt.sign({ userId, email }, JWT_REFRESH_SECRET, { expiresIn: "7d" });
}

// Authentication Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(101).json({ error: "Access token required" });
  }

  jwt.verify(token, JWT_ACCESS_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired access token" });
    }
    req.user = user;
    next();
  });
};

const DEFAULT_CATEGORIES = [
  { nameKey: "category_bills", colorHex: "#FF9F43", icon: "ReceiptText", isDefault: true },
  { nameKey: "category_expenses", colorHex: "#EC4899", icon: "Sparkles", isDefault: true },
  { nameKey: "category_savings", colorHex: "#14B8A6", icon: "PiggyBank", isDefault: true },
  { nameKey: "category_debts", colorHex: "#8B5CF6", icon: "CreditCard", isDefault: true },
];

// Helper to seed categories
async function seedUserCategories(userId: string) {
  for (const cat of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({
      where: {
        userId_nameKey: {
          userId,
          nameKey: cat.nameKey,
        },
      },
      update: {},
      create: {
        userId,
        nameKey: cat.nameKey,
        colorHex: cat.colorHex,
        icon: cat.icon,
        isDefault: cat.isDefault,
      },
    });
  }
}

// ==========================================
// AUTHENTICATION API ROUTES
// ==========================================

// Register
app.post("/api/auth/register", async (req: any, res: any) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Please provide name, email and password" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
      },
    });

    // Seed default categories
    await seedUserCategories(user.id);

    // Create tokens
    const accessToken = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id, user.email);

    // Set HTTPOnly cookie for refresh token
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json({
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error: any) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Server error during registration" });
  }
});

// Login
app.post("/api/auth/login", async (req: any, res: any) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Please provide email and password" });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    // Ensure default categories are seeded (fallback if not done)
    await seedUserCategories(user.id);

    const accessToken = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id, user.email);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Server error during login" });
  }
});

// Refresh Token
app.post("/api/auth/refresh", async (req: any, res: any) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ error: "Refresh token not found" });
    }

    jwt.verify(refreshToken, JWT_REFRESH_SECRET, (err: any, decoded: any) => {
      if (err) {
        return res.status(403).json({ error: "Invalid refresh token" });
      }

      const accessToken = generateAccessToken(decoded.userId, decoded.email);
      res.json({ accessToken });
    });
  } catch (error: any) {
    console.error("Refresh error:", error);
    res.status(500).json({ error: "Server error during token refresh" });
  }
});

// Logout
app.post("/api/auth/logout", (req: any, res: any) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
  res.json({ message: "Logged out successfully" });
});

// Me (Get current profile)
app.get("/api/auth/me", authenticateToken, async (req: any, res: any) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: "Server error fetching profile" });
  }
});

// ==========================================
// BUDGETS & LINES API ROUTES
// ==========================================

// Get dashboard stats & details for a specific month and year
app.get("/api/budgets/stats", authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const year = parseInt(req.query.year);
    const month = parseInt(req.query.month);

    if (isNaN(year) || isNaN(month)) {
      return res.status(400).json({ error: "Year and month query parameters are required" });
    }

    // Find or create MonthlyBudget record for this month
    let budget = await prisma.monthlyBudget.findUnique({
      where: {
        userId_year_month: { userId, year, month },
      },
      include: {
        passiveIncomes: true,
      },
    });

    // Default configuration: lookup previous month budget or fallback to 10000 DH
    if (!budget) {
      let defaultAmount = 10000;
      let defaultPassiveIncome = 0;
      let prevPassiveIncomes: any[] = [];
      
      const prevBudget = await prisma.monthlyBudget.findFirst({
        where: { userId },
        orderBy: [{ year: "desc" }, { month: "desc" }],
      });
      if (prevBudget) {
        defaultAmount = prevBudget.totalBudgetAmount;
        defaultPassiveIncome = prevBudget.passiveIncome || 0;
        prevPassiveIncomes = await prisma.passiveIncome.findMany({
          where: { monthlyBudgetId: prevBudget.id }
        });
      }

      budget = await prisma.monthlyBudget.create({
        data: {
          userId,
          year,
          month,
          totalBudgetAmount: defaultAmount,
          passiveIncome: defaultPassiveIncome,
          passiveIncomes: {
            create: prevPassiveIncomes.map(pi => ({
              name: pi.name,
              amount: pi.amount
            }))
          }
        },
        include: {
          passiveIncomes: true,
        },
      });
    }

    // Ensure categories are fully created
    await seedUserCategories(userId);

    const categories = await prisma.category.findMany({
      where: { userId },
      include: {
        budgetLines: {
          where: { monthlyBudgetId: budget.id },
        },
      },
    });

    // Compute category details
    const categoryStats = categories.map((cat) => {
      const plannedSum = cat.budgetLines.reduce((acc, line) => acc + line.plannedAmount, 0);
      const spentSum = cat.budgetLines.reduce((acc, line) => acc + line.actualAmount, 0);

      return {
        id: cat.id,
        nameKey: cat.nameKey,
        colorHex: cat.colorHex,
        icon: cat.icon,
        isDefault: cat.isDefault,
        plannedAmount: plannedSum,
        actualAmount: spentSum,
        lines: cat.budgetLines,
      };
    });

    res.json({
      monthlyBudget: budget,
      categories: categoryStats,
    });
  } catch (error: any) {
    console.error("Stats fetching error:", error);
    res.status(500).json({ error: "Server error compiling budget stats" });
  }
});

// Update Monthly Budget total budget amount
app.put("/api/budgets/amount", authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const { year, month, totalBudgetAmount } = req.body;

    if (!year || !month || totalBudgetAmount === undefined) {
      return res.status(400).json({ error: "Year, month, and totalBudgetAmount are required" });
    }

    // Find the existing budget to calculate its passive income items sum
    const existingBudget = await prisma.monthlyBudget.findUnique({
      where: {
        userId_year_month: { userId, year, month },
      },
      include: {
        passiveIncomes: true,
      },
    });

    const computedPassive = existingBudget
      ? existingBudget.passiveIncomes.reduce((sum, pi) => sum + pi.amount, 0)
      : 0.0;

    const budget = await prisma.monthlyBudget.upsert({
      where: {
        userId_year_month: { userId, year, month },
      },
      update: {
        totalBudgetAmount: parseFloat(totalBudgetAmount),
        passiveIncome: computedPassive,
      },
      create: {
        userId,
        year,
        month,
        totalBudgetAmount: parseFloat(totalBudgetAmount),
        passiveIncome: computedPassive,
      },
    });

    res.json(budget);
  } catch (error: any) {
    res.status(500).json({ error: "Server error updating budget amount" });
  }
});

// Add passive income item
app.post("/api/budgets/passive-income", authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const { monthlyBudgetId, name, amount } = req.body;

    if (!monthlyBudgetId || !name || amount === undefined) {
      return res.status(400).json({ error: "Monthly Budget ID, name, and amount are required" });
    }

    // Verify monthlyBudget belongs to this user
    const mb = await prisma.monthlyBudget.findUnique({ where: { id: monthlyBudgetId } });
    if (!mb || mb.userId !== userId) {
      return res.status(403).json({ error: "Unauthorized access to this monthly budget" });
    }

    const item = await prisma.passiveIncome.create({
      data: {
        monthlyBudgetId,
        name,
        amount: parseFloat(amount),
      }
    });

    // Recalculate total passive income for this monthly budget
    const allPassive = await prisma.passiveIncome.findMany({
      where: { monthlyBudgetId }
    });
    const totalPassive = allPassive.reduce((sum, p) => sum + p.amount, 0);

    await prisma.monthlyBudget.update({
      where: { id: monthlyBudgetId },
      data: { passiveIncome: totalPassive }
    });

    res.status(201).json(item);
  } catch (error: any) {
    console.error("Add passive income error:", error);
    res.status(500).json({ error: "Server error creating passive income" });
  }
});

// Update passive income item
app.put("/api/budgets/passive-income/:id", authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { name, amount } = req.body;

    if (!name || amount === undefined) {
      return res.status(400).json({ error: "Name and amount are required" });
    }

    const pi = await prisma.passiveIncome.findUnique({
      where: { id },
      include: { monthlyBudget: true }
    });

    if (!pi || pi.monthlyBudget.userId !== userId) {
      return res.status(403).json({ error: "Unauthorized access to this passive income" });
    }

    const updated = await prisma.passiveIncome.update({
      where: { id },
      data: {
        name,
        amount: parseFloat(amount)
      }
    });

    // Recalculate total passive income
    const allPassive = await prisma.passiveIncome.findMany({
      where: { monthlyBudgetId: pi.monthlyBudgetId }
    });
    const totalPassive = allPassive.reduce((sum, p) => sum + p.amount, 0);

    await prisma.monthlyBudget.update({
      where: { id: pi.monthlyBudgetId },
      data: { passiveIncome: totalPassive }
    });

    res.json(updated);
  } catch (error: any) {
    console.error("Update passive income error:", error);
    res.status(500).json({ error: "Server error updating passive income" });
  }
});

// Delete passive income item
app.delete("/api/budgets/passive-income/:id", authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const pi = await prisma.passiveIncome.findUnique({
      where: { id },
      include: { monthlyBudget: true }
    });

    if (!pi || pi.monthlyBudget.userId !== userId) {
      return res.status(403).json({ error: "Unauthorized access to this passive income" });
    }

    await prisma.passiveIncome.delete({ where: { id } });

    // Recalculate total passive income
    const allPassive = await prisma.passiveIncome.findMany({
      where: { monthlyBudgetId: pi.monthlyBudgetId }
    });
    const totalPassive = allPassive.reduce((sum, p) => sum + p.amount, 0);

    await prisma.monthlyBudget.update({
      where: { id: pi.monthlyBudgetId },
      data: { passiveIncome: totalPassive }
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error("Delete passive income error:", error);
    res.status(500).json({ error: "Server error deleting passive income" });
  }
});

// Add budget line
app.post("/api/budget-lines", authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const { categoryId, monthlyBudgetId, label, plannedAmount, actualAmount, date } = req.body;

    if (!categoryId || !monthlyBudgetId || !label) {
      return res.status(400).json({ error: "Category ID, Monthly Budget ID, and label are required" });
    }

    // Security check: Verify category and monthlyBudget belong to this user
    const cat = await prisma.category.findUnique({ where: { id: categoryId } });
    const mb = await prisma.monthlyBudget.findUnique({ where: { id: monthlyBudgetId } });

    if (!cat || cat.userId !== userId || !mb || mb.userId !== userId) {
      return res.status(403).json({ error: "Unauthorized access to these resources" });
    }

    const line = await prisma.budgetLine.create({
      data: {
        categoryId,
        monthlyBudgetId,
        label,
        plannedAmount: parseFloat(plannedAmount || 0),
        actualAmount: parseFloat(actualAmount || 0),
        date: date ? new Date(date) : new Date(),
      },
    });

    res.status(201).json(line);
  } catch (error: any) {
    console.error("Add line error:", error);
    res.status(500).json({ error: "Server error creating budget line" });
  }
});

// Update budget line
app.put("/api/budget-lines/:id", authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { label, plannedAmount, actualAmount, date } = req.body;

    // Security verification
    const line = await prisma.budgetLine.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!line || line.category.userId !== userId) {
      return res.status(404).json({ error: "Budget line not found or unauthorized" });
    }

    const updatedLine = await prisma.budgetLine.update({
      where: { id },
      data: {
        label: label !== undefined ? label : line.label,
        plannedAmount: plannedAmount !== undefined ? parseFloat(plannedAmount) : line.plannedAmount,
        actualAmount: actualAmount !== undefined ? parseFloat(actualAmount) : line.actualAmount,
        date: date ? new Date(date) : line.date,
      },
    });

    res.json(updatedLine);
  } catch (error: any) {
    res.status(500).json({ error: "Server error updating budget line" });
  }
});

// Delete budget line
app.delete("/api/budget-lines/:id", authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const line = await prisma.budgetLine.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!line || line.category.userId !== userId) {
      return res.status(404).json({ error: "Budget line not found or unauthorized" });
    }

    await prisma.budgetLine.delete({ where: { id } });
    res.json({ message: "Budget line deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ error: "Server error deleting budget line" });
  }
});

// ==========================================
// CATEGORIES API ROUTES
// ==========================================

// Get all categories of a user
app.get("/api/categories", authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const categories = await prisma.category.findMany({
      where: { userId },
    });
    res.json(categories);
  } catch (error: any) {
    res.status(500).json({ error: "Server error fetching categories" });
  }
});

// Create custom category
app.post("/api/categories", authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const { nameKey, colorHex, icon } = req.body;

    if (!nameKey || !colorHex || !icon) {
      return res.status(400).json({ error: "Name, color and icon are required" });
    }

    const existing = await prisma.category.findFirst({
      where: { userId, nameKey },
    });

    if (existing) {
      return res.status(400).json({ error: "A category with this name already exists" });
    }

    const cat = await prisma.category.create({
      data: {
        userId,
        nameKey,
        colorHex,
        icon,
        isDefault: false,
      },
    });

    res.status(201).json(cat);
  } catch (error: any) {
    res.status(500).json({ error: "Server error creating category" });
  }
});

// Edit Category
app.put("/api/categories/:id", authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { nameKey, colorHex, icon } = req.body;

    const cat = await prisma.category.findUnique({ where: { id } });
    if (!cat || cat.userId !== userId) {
      return res.status(404).json({ error: "Category not found or unauthorized" });
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        nameKey: nameKey !== undefined ? nameKey : cat.nameKey,
        colorHex: colorHex !== undefined ? colorHex : cat.colorHex,
        icon: icon !== undefined ? icon : cat.icon,
      },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: "Server error updating category" });
  }
});

// Delete Category
app.delete("/api/categories/:id", authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const cat = await prisma.category.findUnique({ where: { id } });
    if (!cat || cat.userId !== userId) {
      return res.status(404).json({ error: "Category not found or unauthorized" });
    }

    // Do not delete default categories entirely unless user wants to reset, but let them delete if customized
    await prisma.category.delete({ where: { id } });
    res.json({ message: "Category deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ error: "Server error deleting category" });
  }
});

// ==========================================
// DEBTS/CREDITS API ROUTES
// ==========================================

// Get user debts
app.get("/api/debts", authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const debts = await prisma.debt.findMany({
      where: { userId },
      include: { payments: true },
    });
    res.json(debts);
  } catch (error: any) {
    res.status(500).json({ error: "Server error fetching debts" });
  }
});

// Add debt
app.post("/api/debts", authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const { name, monthlyInstallment, totalAmount, remainingAmount, startDate, estimatedEndDate } = req.body;

    if (!name || monthlyInstallment === undefined || remainingAmount === undefined) {
      return res.status(400).json({ error: "Name, installment, and remaining amount are required" });
    }

    const debt = await prisma.debt.create({
      data: {
        userId,
        name,
        monthlyInstallment: parseFloat(monthlyInstallment),
        totalAmount: totalAmount ? parseFloat(totalAmount) : null,
        remainingAmount: parseFloat(remainingAmount),
        startDate: startDate ? new Date(startDate) : new Date(),
        estimatedEndDate: estimatedEndDate ? new Date(estimatedEndDate) : null,
      },
    });

    res.status(201).json(debt);
  } catch (error: any) {
    res.status(500).json({ error: "Server error creating debt" });
  }
});

// Edit debt
app.put("/api/debts/:id", authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { name, monthlyInstallment, totalAmount, remainingAmount, startDate, estimatedEndDate } = req.body;

    const debt = await prisma.debt.findUnique({ where: { id } });
    if (!debt || debt.userId !== userId) {
      return res.status(404).json({ error: "Debt not found or unauthorized" });
    }

    const updated = await prisma.debt.update({
      where: { id },
      data: {
        name: name !== undefined ? name : debt.name,
        monthlyInstallment: monthlyInstallment !== undefined ? parseFloat(monthlyInstallment) : debt.monthlyInstallment,
        totalAmount: totalAmount !== undefined ? (totalAmount ? parseFloat(totalAmount) : null) : debt.totalAmount,
        remainingAmount: remainingAmount !== undefined ? parseFloat(remainingAmount) : debt.remainingAmount,
        startDate: startDate ? new Date(startDate) : debt.startDate,
        estimatedEndDate: estimatedEndDate !== undefined ? (estimatedEndDate ? new Date(estimatedEndDate) : null) : debt.estimatedEndDate,
      },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: "Server error updating debt" });
  }
});

// Delete debt
app.delete("/api/debts/:id", authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const debt = await prisma.debt.findUnique({ where: { id } });
    if (!debt || debt.userId !== userId) {
      return res.status(404).json({ error: "Debt not found or unauthorized" });
    }

    await prisma.debt.delete({ where: { id } });
    res.json({ message: "Debt deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ error: "Server error deleting debt" });
  }
});

// Record debt payment
app.post("/api/debts/:id/payments", authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { year, month, amountPaid } = req.body;

    if (!year || !month || amountPaid === undefined) {
      return res.status(400).json({ error: "Year, month and amountPaid are required" });
    }

    const debt = await prisma.debt.findUnique({ where: { id } });
    if (!debt || debt.userId !== userId) {
      return res.status(404).json({ error: "Debt not found or unauthorized" });
    }

    // Create payment
    const payment = await prisma.debtPayment.upsert({
      where: {
        debtId_year_month: {
          debtId: id,
          year,
          month,
        },
      },
      update: {
        amountPaid: parseFloat(amountPaid),
      },
      create: {
        debtId: id,
        year,
        month,
        amountPaid: parseFloat(amountPaid),
      },
    });

    // Update remainingAmount of debt
    // Let's recalculate based on payments or subtract directly
    const updatedDebt = await prisma.debt.update({
      where: { id },
      data: {
        remainingAmount: Math.max(0, debt.remainingAmount - parseFloat(amountPaid)),
      },
    });

    res.json({ payment, debt: updatedDebt });
  } catch (error: any) {
    console.error("Debt payment recording error:", error);
    res.status(500).json({ error: "Server error recording payment" });
  }
});

// ==========================================
// HISTORY & EXPORT API ROUTES
// ==========================================

// Get annual tracking history
app.get("/api/history", authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    // Get all budgets for the year
    const budgets = await prisma.monthlyBudget.findMany({
      where: { userId, year },
      include: {
        budgetLines: {
          include: { category: true },
        },
      },
      orderBy: { month: "asc" },
    });

    // Create structure for all 12 months
    const monthsData = Array.from({ length: 12 }, (_, i) => {
      const monthIndex = i + 1;
      const budgetForMonth = budgets.find((b) => b.month === monthIndex);

      const monthBudgetAmount = budgetForMonth ? (budgetForMonth.totalBudgetAmount + (budgetForMonth.passiveIncome || 0)) : 0;
      let totalSpent = 0;

      const categoriesSpent: Record<string, { planned: number; spent: number }> = {};

      // Initialize default
      DEFAULT_CATEGORIES.forEach((c) => {
        categoriesSpent[c.nameKey] = { planned: 0, spent: 0 };
      });

      if (budgetForMonth) {
        budgetForMonth.budgetLines.forEach((line) => {
          const nameKey = line.category.nameKey;
          if (!categoriesSpent[nameKey]) {
            categoriesSpent[nameKey] = { planned: 0, spent: 0 };
          }
          categoriesSpent[nameKey].planned += line.plannedAmount;
          categoriesSpent[nameKey].spent += line.actualAmount;
          totalSpent += line.actualAmount;
        });
      }

      return {
        month: monthIndex,
        totalBudget: monthBudgetAmount,
        totalSpent,
        remaining: monthBudgetAmount - totalSpent,
        categories: categoriesSpent,
      };
    });

    res.json(monthsData);
  } catch (error: any) {
    console.error("History fetch error:", error);
    res.status(500).json({ error: "Server error compiling annual history" });
  }
});

// Export CSV route
app.get("/api/export/csv", authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const budgets = await prisma.monthlyBudget.findMany({
      where: { userId, year },
      include: {
        budgetLines: {
          include: { category: true },
        },
      },
      orderBy: { month: "asc" },
    });

    // Generate CSV content
    let csv = "Mois;Budget Total;Depenses Totales;Reste;Factures (Prevu);Factures (Reel);Depenses (Prevu);Depenses (Reel);Epargne (Prevu);Epargne (Reel);Dettes (Prevu);Dettes (Reel)\n";

    for (let m = 1; m <= 12; m++) {
      const b = budgets.find((x) => x.month === m);
      const budgetAmount = b ? (b.totalBudgetAmount + (b.passiveIncome || 0)) : 0;
      let totalSpent = 0;

      const cats = {
        category_bills: { p: 0, s: 0 },
        category_expenses: { p: 0, s: 0 },
        category_savings: { p: 0, s: 0 },
        category_debts: { p: 0, s: 0 },
      } as any;

      if (b) {
        b.budgetLines.forEach((line) => {
          const k = line.category.nameKey;
          if (cats[k]) {
            cats[k].p += line.plannedAmount;
            cats[k].s += line.actualAmount;
          }
          totalSpent += line.actualAmount;
        });
      }

      const rest = budgetAmount - totalSpent;
      csv += `${m};${budgetAmount};${totalSpent};${rest};${cats.category_bills.p};${cats.category_bills.s};${cats.category_expenses.p};${cats.category_expenses.s};${cats.category_savings.p};${cats.category_savings.s};${cats.category_debts.p};${cats.category_debts.s}\n`;
    }

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=budget_history_${year}.csv`);
    res.send(csv);
  } catch (error: any) {
    res.status(500).send("Server error exporting CSV");
  }
});

// ==========================================
// PROFILE, BACKUP & RESTORE API ROUTES
// ==========================================

// Change user password
app.put("/api/user/password", authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current password and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: "Incorrect current password" });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    res.json({ message: "Password updated successfully" });
  } catch (error: any) {
    res.status(500).json({ error: "Server error changing password" });
  }
});

// Delete account entirely (cascade deletion is configured in DB)
app.delete("/api/user/account", authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    await prisma.user.delete({ where: { id: userId } });
    res.clearCookie("refreshToken");
    res.json({ message: "Account deleted successfully along with all data" });
  } catch (error: any) {
    res.status(500).json({ error: "Server error deleting account" });
  }
});

// Backup: Export all database entries for this user as a JSON
app.get("/api/user/backup", authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;

    const categories = await prisma.category.findMany({ where: { userId } });
    const budgets = await prisma.monthlyBudget.findMany({
      where: { userId },
      include: { budgetLines: true },
    });
    const debts = await prisma.debt.findMany({
      where: { userId },
      include: { payments: true },
    });

    res.json({
      categories,
      budgets,
      debts,
    });
  } catch (error: any) {
    res.status(500).json({ error: "Server error generating backup" });
  }
});

// Restore: Re-import user data from an exported JSON backup
app.post("/api/user/restore", authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const { categories, budgets, debts } = req.body;

    if (!categories || !budgets || !debts) {
      return res.status(400).json({ error: "Invalid backup file schema" });
    }

    // We can wipe existing entries and re-insert or gracefully restore. Let's wipe and restore
    await prisma.category.deleteMany({ where: { userId } });
    await prisma.monthlyBudget.deleteMany({ where: { userId } });
    await prisma.debt.deleteMany({ where: { userId } });

    // 1. Restore Categories & make mapping of old IDs to new IDs if IDs change, or just insert them with old IDs!
    // Since we wipe, inserting with their IDs works perfectly and keeps integrity!
    for (const cat of categories) {
      await prisma.category.create({
        data: {
          id: cat.id,
          userId,
          nameKey: cat.nameKey,
          colorHex: cat.colorHex,
          icon: cat.icon,
          isDefault: cat.isDefault,
        },
      });
    }

    // 2. Restore Budgets & Lines
    for (const b of budgets) {
      await prisma.monthlyBudget.create({
        data: {
          id: b.id,
          userId,
          year: b.year,
          month: b.month,
          totalBudgetAmount: b.totalBudgetAmount,
        },
      });

      if (b.budgetLines && b.budgetLines.length > 0) {
        for (const line of b.budgetLines) {
          await prisma.budgetLine.create({
            data: {
              id: line.id,
              categoryId: line.categoryId,
              monthlyBudgetId: line.monthlyBudgetId,
              label: line.label,
              plannedAmount: line.plannedAmount,
              actualAmount: line.actualAmount,
              date: new Date(line.date),
            },
          });
        }
      }
    }

    // 3. Restore Debts & Payments
    for (const d of debts) {
      await prisma.debt.create({
        data: {
          id: d.id,
          userId,
          name: d.name,
          monthlyInstallment: d.monthlyInstallment,
          totalAmount: d.totalAmount,
          remainingAmount: d.remainingAmount,
          startDate: new Date(d.startDate),
          estimatedEndDate: d.estimatedEndDate ? new Date(d.estimatedEndDate) : null,
        },
      });

      if (d.payments && d.payments.length > 0) {
        for (const p of d.payments) {
          await prisma.debtPayment.create({
            data: {
              id: p.id,
              debtId: p.debtId,
              year: p.year,
              month: p.month,
              amountPaid: p.amountPaid,
              date: new Date(p.date),
            },
          });
        }
      }
    }

    res.json({ message: "Backup data restored successfully" });
  } catch (error: any) {
    console.error("Restore backup error:", error);
    res.status(500).json({ error: "Server error restoring data" });
  }
});


// ==========================================
// VITE DEV SERVER / STATIC ASSETS ROUTING
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Error starting express + vite server:", err);
});
