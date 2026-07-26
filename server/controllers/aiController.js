import prisma from '../db.js';
import {
    callGemini,
    analyzeTransactionsPrompt,
    analyzeBudgetsPrompt,
    generateInsightsPrompt,
} from '../services/geminiService.js';

// Helper to get start and end dates for current month/week
const getPeriodDates = (period) => {
    const now = new Date();
    if (period === 'weekly') {
        const start = new Date(now.setDate(now.getDate() - now.getDay()));
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        return { start, end };
    } else {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        return { start, end };
    }
};

export const getInsights = async (req, res) => {
    try {
        const insights = await prisma.aiInsight.findMany({
            where: { user_id: req.user.id },
            orderBy: { created_at: 'desc' },
        });
        res.json(insights);
    } catch (err) {
        console.error('getInsights error:', err);
        res.status(500).json({ message: 'Failed to retrieve insights' });
    }
};

export const generateInsight = async (req, res) => {
    const { type } = req.body;

    if (!type || (type !== 'monthly_summary' && type !== 'savings_tips')) {
        return res.status(400).json({ message: 'Valid insight type ("monthly_summary" or "savings_tips") is required' });
    }

    try {
        const userId = req.user.id;
        const now = new Date();

        // 1. Gather all necessary dashboard context in parallel
        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        // A. Sum this month's income & expense
        const thisMonthAgg = await prisma.transaction.groupBy({
            by: ['type'],
            where: {
                user_id: userId,
                transaction_date: { gte: startOfThisMonth, lte: endOfThisMonth },
            },
            _sum: { amount: true },
        });

        let incomeThisMonth = 0;
        let expenseThisMonth = 0;
        thisMonthAgg.forEach((agg) => {
            const sum = agg._sum.amount ? parseFloat(agg._sum.amount) : 0;
            if (agg.type === 'income') incomeThisMonth = sum;
            else if (agg.type === 'expense') expenseThisMonth = sum;
        });

        const balance = incomeThisMonth - expenseThisMonth;
        const savingsRate = incomeThisMonth > 0 ? (balance / incomeThisMonth) * 100 : 0;
        const summaryContext = { incomeThisMonth, expenseThisMonth, balance, savingsRate };

        // B. Get active budgets with spent
        const budgets = await prisma.budget.findMany({
            where: { user_id: userId },
            include: { category: true },
        });

        const budgetsContext = await Promise.all(
            budgets.map(async (b) => {
                const { start, end } = getPeriodDates(b.period);
                const agg = await prisma.transaction.aggregate({
                    where: {
                        user_id: userId,
                        category_id: b.category_id,
                        type: 'expense',
                        transaction_date: { gte: start, lte: end },
                    },
                    _sum: { amount: true },
                });
                return {
                    id: b.id,
                    category_name: b.category?.name || 'Uncategorized',
                    amount: b.amount.toString(),
                    spent: agg._sum.amount ? agg._sum.amount.toString() : '0.00',
                    period: b.period,
                };
            })
        );

        // C. Category breakdown
        const expenseTransactions = await prisma.transaction.findMany({
            where: {
                user_id: userId,
                type: 'expense',
                transaction_date: { gte: startOfThisMonth, lte: endOfThisMonth },
            },
            include: { category: true },
        });

        const breakdownMap = {};
        expenseTransactions.forEach((t) => {
            const name = t.category?.name || 'Uncategorized';
            if (!breakdownMap[name]) breakdownMap[name] = 0;
            breakdownMap[name] += parseFloat(t.amount);
        });
        const categoriesBreakdown = Object.entries(breakdownMap).map(([name, total]) => ({
            category_name: name,
            total: total.toFixed(2),
        }));

        // D. Recent transactions
        const transactions = await prisma.transaction.findMany({
            where: { user_id: userId },
            include: { category: true },
            orderBy: [{ transaction_date: 'desc' }, { id: 'desc' }],
            take: 30,
        });
        const transactionsContext = transactions.map((t) => ({
            transaction_date: t.transaction_date.toISOString().split('T')[0],
            amount: t.amount.toString(),
            type: t.type,
            category_name: t.category?.name || null,
            description: t.description,
        }));

        const dataContext = {
            summary: summaryContext,
            budgets: budgetsContext,
            categoriesBreakdown,
            transactions: transactionsContext,
        };

        // 2. Generate prompt and call Gemini API
        const prompt = generateInsightsPrompt(type, dataContext);
        const insightContent = await callGemini(prompt);

        // 3. Save to database
        const createdInsight = await prisma.aiInsight.create({
            data: {
                user_id: userId,
                insight_type: type,
                period_start: type === 'monthly_summary' ? startOfThisMonth : null,
                period_end: type === 'monthly_summary' ? endOfThisMonth : null,
                content_json: insightContent,
            },
        });

        res.json(createdInsight);
    } catch (err) {
        console.error('generateInsight error:', err);
        
        // Return standard structure even on failure so user has visual state
        let fallbackJson = {};
        if (type === 'monthly_summary') {
            fallbackJson = {
                summary: 'AI Engine could not generate a summary right now. Please verify your GEMINI_API_KEY.',
                highlights: ['Check transaction entries', 'Verify category budgets'],
                concerns: ['AI service is temporarily unavailable'],
                recommendations: [{ title: 'Configure API Key', detail: 'Ensure your server .env contains a valid GEMINI_API_KEY.' }],
                topSpendingCategory: 'None',
                estimatedMonthlySavings: 0,
                healthScore: 50,
            };
        } else {
            fallbackJson = {
                overallTip: 'Gemini AI API connection failed. Configure your GEMINI_API_KEY in the backend server env to unlock saving strategies.',
                tips: [
                    { category: 'General', title: 'Verify Gemini Credentials', detail: 'Check the server logs for specific API error messages.', estimatedSavings: 0 }
                ],
            };
        }

        try {
            const savedFallback = await prisma.aiInsight.create({
                data: {
                    user_id: req.user.id,
                    insight_type: type,
                    content_json: fallbackJson,
                },
            });
            return res.json(savedFallback);
        } catch (dbErr) {
            console.error('Failed to create fallback insight:', dbErr);
            return res.status(500).json({ message: 'Failed to generate and store insight' });
        }
    }
};

export const analyzeTransactions = async (req, res) => {
    const { transactionIds } = req.body;

    if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
        return res.status(400).json({ message: 'transactionIds (non-empty array) is required' });
    }

    try {
        const transactions = await prisma.transaction.findMany({
            where: {
                id: { in: transactionIds.map(id => parseInt(id, 10)) },
                user_id: req.user.id,
            },
            include: { category: true },
        });

        if (transactions.length === 0) {
            return res.status(400).json({ message: 'No matching transactions found for analysis' });
        }

        const formatted = transactions.map((t) => ({
            transaction_date: t.transaction_date.toISOString().split('T')[0],
            amount: t.amount.toString(),
            type: t.type,
            category_name: t.category?.name || 'Uncategorized',
            description: t.description,
            notes: t.notes,
        }));

        const prompt = analyzeTransactionsPrompt(formatted);
        const analysis = await callGemini(prompt);

        res.json(analysis);
    } catch (err) {
        console.error('analyzeTransactions error:', err);
        // Fallback response format on API error
        res.json({
            insight: 'Spending analysis is unavailable. Verify that your GEMINI_API_KEY environment variable is configured correctly.',
            highlight: 'API Key Check',
        });
    }
};

export const analyzeBudgets = async (req, res) => {
    try {
        const userId = req.user.id;
        const budgets = await prisma.budget.findMany({
            where: { user_id: userId },
            include: { category: true },
        });

        if (budgets.length === 0) {
            return res.json({ analyses: [] });
        }

        const budgetsContext = await Promise.all(
            budgets.map(async (b) => {
                const { start, end } = getPeriodDates(b.period);
                const agg = await prisma.transaction.aggregate({
                    where: {
                        user_id: userId,
                        category_id: b.category_id,
                        type: 'expense',
                        transaction_date: { gte: start, lte: end },
                    },
                    _sum: { amount: true },
                });
                return {
                    id: b.id,
                    category_name: b.category?.name || 'Uncategorized',
                    amount: b.amount.toString(),
                    spent: agg._sum.amount ? agg._sum.amount.toString() : '0.00',
                    period: b.period,
                };
            })
        );

        const prompt = analyzeBudgetsPrompt(budgetsContext);
        const result = await callGemini(prompt);

        res.json(result);
    } catch (err) {
        console.error('analyzeBudgets error:', err);
        // Fallback budget analyses mapping on API failure
        try {
            const userId = req.user.id;
            const budgets = await prisma.budget.findMany({
                where: { user_id: userId },
                include: { category: true },
            });

            const fallbackAnalyses = await Promise.all(
                budgets.map(async (b) => {
                    const { start, end } = getPeriodDates(b.period);
                    const agg = await prisma.transaction.aggregate({
                        where: {
                            user_id: userId,
                            category_id: b.category_id,
                            type: 'expense',
                            transaction_date: { gte: start, lte: end },
                        },
                        _sum: { amount: true },
                    });
                    const spent = agg._sum.amount ? parseFloat(agg._sum.amount) : 0;
                    const limit = parseFloat(b.amount);
                    const percent = limit > 0 ? (spent / limit) * 100 : 0;
                    
                    let status = 'good';
                    let message = `Spent $${spent} of $${limit} - pacing well.`;
                    if (percent >= 100) {
                        status = 'concerning';
                        message = `Spent $${spent} of $${limit} - budget has been exceeded!`;
                    } else if (percent >= 70) {
                        status = 'caution';
                        message = `Spent $${spent} of $${limit} - approaching budget limit.`;
                    }

                    return {
                        budgetId: b.id,
                        status,
                        message,
                    };
                })
            );

            res.json({ analyses: fallbackAnalyses });
        } catch (dbErr) {
            console.error('Fallback budget analysis also failed:', dbErr);
            res.status(500).json({ message: 'Failed to analyze budgets' });
        }
    }
};
