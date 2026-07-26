import { Router } from 'express';
import { register, login, getMe } from '../controllers/authController.js';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../controllers/categoryController.js';
import { getTransactions, getTransactionById, createTransaction, updateTransaction, deleteTransaction } from '../controllers/transactionController.js';
import { getBudgets, createBudget, updateBudget, deleteBudget } from '../controllers/budgetController.js';
import { getSummary, getCategoryBreakdown, getMonthlyTrend } from '../controllers/dashboardController.js';
import { getInsights, generateInsight, analyzeTransactions, analyzeBudgets } from '../controllers/aiController.js';
import auth from '../middleware/auth.js';

const router = Router();

// Auth Routes (Public)
router.post('/auth/register', register);
router.post('/auth/login', login);

// Protected Routes (Require Auth Middleware)
router.use(auth);

router.get('/auth/me', getMe);

// Category Routes
router.get('/categories', getCategories);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

// Transaction Routes
router.get('/transactions', getTransactions);
router.get('/transactions/:id', getTransactionById);
router.post('/transactions', createTransaction);
router.put('/transactions/:id', updateTransaction);
router.delete('/transactions/:id', deleteTransaction);

// Budget Routes
router.get('/budgets', getBudgets);
router.post('/budgets', createBudget);
router.put('/budgets/:id', updateBudget);
router.delete('/budgets/:id', deleteBudget);

// Dashboard Routes
router.get('/dashboard/summary', getSummary);
router.get('/dashboard/category-breakdown', getCategoryBreakdown);
router.get('/dashboard/monthly-trend', getMonthlyTrend);

// AI & Insights Routes
router.get('/insights', getInsights);
router.post('/insights/generate', generateInsight);
router.post('/transactions/analyze', analyzeTransactions);
router.post('/budgets/analyze', analyzeBudgets);

export default router;
