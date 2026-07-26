import prisma from '../db.js';

export const getSummary = async (req, res) => {
    try {
        const userId = req.user.id;
        const now = new Date();

        // Current Month Dates
        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        // Last Month Dates
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

        // Sum this month's income & expense
        const thisMonthAgg = await prisma.transaction.groupBy({
            by: ['type'],
            where: {
                user_id: userId,
                transaction_date: {
                    gte: startOfThisMonth,
                    lte: endOfThisMonth,
                },
            },
            _sum: {
                amount: true,
            },
        });

        let incomeThisMonth = 0;
        let expenseThisMonth = 0;

        thisMonthAgg.forEach((agg) => {
            const sum = agg._sum.amount ? parseFloat(agg._sum.amount) : 0;
            if (agg.type === 'income') {
                incomeThisMonth = sum;
            } else if (agg.type === 'expense') {
                expenseThisMonth = sum;
            }
        });

        // Sum last month's income & expense
        const lastMonthAgg = await prisma.transaction.groupBy({
            by: ['type'],
            where: {
                user_id: userId,
                transaction_date: {
                    gte: startOfLastMonth,
                    lte: endOfLastMonth,
                },
            },
            _sum: {
                amount: true,
            },
        });

        let incomeLastMonth = 0;
        let expenseLastMonth = 0;

        lastMonthAgg.forEach((agg) => {
            const sum = agg._sum.amount ? parseFloat(agg._sum.amount) : 0;
            if (agg.type === 'income') {
                incomeLastMonth = sum;
            } else if (agg.type === 'expense') {
                expenseLastMonth = sum;
            }
        });

        const balance = incomeThisMonth - expenseThisMonth;
        const savingsRate = incomeThisMonth > 0 ? (balance / incomeThisMonth) * 100 : 0;

        // Delta percentage changes (this month vs last month)
        let incomeDelta = null;
        if (incomeLastMonth > 0) {
            incomeDelta = ((incomeThisMonth - incomeLastMonth) / incomeLastMonth) * 100;
        } else if (incomeThisMonth > 0) {
            incomeDelta = 100.0; // 100% growth from 0
        } else {
            incomeDelta = 0.0;
        }

        let expenseDelta = null;
        if (expenseLastMonth > 0) {
            expenseDelta = ((expenseThisMonth - expenseLastMonth) / expenseLastMonth) * 100;
        } else if (expenseThisMonth > 0) {
            expenseDelta = 100.0;
        } else {
            expenseDelta = 0.0;
        }

        res.json({
            incomeThisMonth,
            expenseThisMonth,
            balance,
            savingsRate,
            incomeDelta: Math.round(incomeDelta * 10) / 10,
            expenseDelta: Math.round(expenseDelta * 10) / 10,
        });
    } catch (err) {
        console.error('getSummary error:', err);
        res.status(500).json({ message: 'Failed to retrieve dashboard summary' });
    }
};

export const getCategoryBreakdown = async (req, res) => {
    try {
        const userId = req.user.id;
        const now = new Date();
        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        // Fetch all expense transactions for the current month and group by category
        const transactions = await prisma.transaction.findMany({
            where: {
                user_id: userId,
                type: 'expense',
                transaction_date: {
                    gte: startOfThisMonth,
                    lte: endOfThisMonth,
                },
            },
            include: {
                category: true,
            },
        });

        // Group in memory
        const breakdownMap = {};
        transactions.forEach((t) => {
            const catId = t.category_id || 0; // 0 for uncategorized
            const catName = t.category?.name || 'Uncategorized';
            const catIcon = t.category?.icon || 'tag';
            const catColor = t.category?.color || '#64748B';

            if (!breakdownMap[catId]) {
                breakdownMap[catId] = {
                    category_id: catId,
                    category_name: catName,
                    category_icon: catIcon,
                    category_color: catColor,
                    total: 0,
                    transaction_count: 0,
                };
            }

            breakdownMap[catId].total += parseFloat(t.amount);
            breakdownMap[catId].transaction_count += 1;
        });

        const breakdownList = Object.values(breakdownMap).map((item) => ({
            ...item,
            total: item.total.toFixed(2),
        }));

        // Sort descending by total spent
        breakdownList.sort((a, b) => parseFloat(b.total) - parseFloat(a.total));

        res.json(breakdownList);
    } catch (err) {
        console.error('getCategoryBreakdown error:', err);
        res.status(500).json({ message: 'Failed to retrieve category breakdown' });
    }
};

export const getMonthlyTrend = async (req, res) => {
    try {
        const userId = req.user.id;
        const now = new Date();

        // Calculate the range for the last 6 months
        // Start date: 5 months ago, on the first day of that month
        const startOfRange = new Date(now.getFullYear(), now.getMonth() - 5, 1);

        const transactions = await prisma.transaction.findMany({
            where: {
                user_id: userId,
                transaction_date: {
                    gte: startOfRange,
                },
            },
        });

        // Generate list of 6 months keys: YYYY-MM
        const monthsList = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            monthsList.push(monthStr);
        }

        // Initialize mapping
        const trendMap = {};
        monthsList.forEach((m) => {
            trendMap[m] = { income: 0, expense: 0 };
        });

        // Accumulate transactions
        transactions.forEach((t) => {
            const date = new Date(t.transaction_date);
            const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (trendMap[monthStr]) {
                const amount = parseFloat(t.amount);
                if (t.type === 'income') {
                    trendMap[monthStr].income += amount;
                } else if (t.type === 'expense') {
                    trendMap[monthStr].expense += amount;
                }
            }
        });

        // Form output array
        const trendList = monthsList.map((month) => ({
            month,
            income: trendMap[month].income.toFixed(2),
            expense: trendMap[month].expense.toFixed(2),
        }));

        res.json(trendList);
    } catch (err) {
        console.error('getMonthlyTrend error:', err);
        res.status(500).json({ message: 'Failed to retrieve monthly trend' });
    }
};
