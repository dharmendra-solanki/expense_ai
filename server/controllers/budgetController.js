import prisma from '../db.js';

// Helper to get start and end date for current month and current week
const getPeriodDates = (period) => {
    const now = new Date();
    if (period === 'weekly') {
        // Start of current week (Sunday)
        const start = new Date(now.setDate(now.getDate() - now.getDay()));
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        return { start, end };
    } else {
        // Start of current month
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        return { start, end };
    }
};

export const getBudgets = async (req, res) => {
    try {
        const budgets = await prisma.budget.findMany({
            where: { user_id: req.user.id },
            include: {
                category: true,
            },
        });

        // We will calculate the spent amount for each budget.
        // To be highly efficient, we aggregate matching transactions.
        const formattedBudgets = await Promise.all(
            budgets.map(async (b) => {
                const { start, end } = getPeriodDates(b.period);

                const aggregate = await prisma.transaction.aggregate({
                    where: {
                        user_id: req.user.id,
                        category_id: b.category_id,
                        type: 'expense',
                        transaction_date: {
                            gte: start,
                            lte: end,
                        },
                    },
                    _sum: {
                        amount: true,
                    },
                });

                const spent = aggregate._sum.amount ? aggregate._sum.amount.toString() : '0.00';

                return {
                    id: b.id,
                    user_id: b.user_id,
                    category_id: b.category_id,
                    category_name: b.category?.name || null,
                    category_icon: b.category?.icon || null,
                    category_color: b.category?.color || null,
                    amount: b.amount.toString(),
                    spent,
                    period: b.period,
                    start_date: b.start_date.toISOString().split('T')[0],
                };
            })
        );

        res.json(formattedBudgets);
    } catch (err) {
        console.error('getBudgets error:', err);
        res.status(500).json({ message: 'Failed to retrieve budgets' });
    }
};

export const createBudget = async (req, res) => {
    const { categoryId, amount, period = 'monthly' } = req.body;

    if (!categoryId || amount === undefined) {
        return res.status(400).json({ message: 'CategoryId and amount are required' });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ message: 'Amount must be a positive number' });
    }

    if (period !== 'monthly' && period !== 'weekly') {
        return res.status(400).json({ message: 'Period must be "monthly" or "weekly"' });
    }

    try {
        const catId = parseInt(categoryId, 10);
        // Verify category exists and belongs to user
        const category = await prisma.category.findFirst({
            where: { id: catId, user_id: req.user.id },
        });

        if (!category) {
            return res.status(400).json({ message: 'Invalid category ID or access denied' });
        }

        const { start } = getPeriodDates(period);

        const budget = await prisma.budget.create({
            data: {
                user_id: req.user.id,
                category_id: catId,
                amount: parsedAmount,
                period,
                start_date: start,
            },
            include: {
                category: true,
            },
        });

        res.status(201).json({
            id: budget.id,
            user_id: budget.user_id,
            category_id: budget.category_id,
            category_name: budget.category?.name || null,
            category_icon: budget.category?.icon || null,
            category_color: budget.category?.color || null,
            amount: budget.amount.toString(),
            spent: '0.00',
            period: budget.period,
            start_date: budget.start_date.toISOString().split('T')[0],
        });
    } catch (err) {
        console.error('createBudget error:', err);
        if (err.code === 'P2002') {
            return res.status(400).json({
                message: 'A budget already exists for this category and period',
            });
        }
        res.status(500).json({ message: 'Failed to create budget' });
    }
};

export const updateBudget = async (req, res) => {
    const { id } = req.params;
    const { amount, period } = req.body;

    try {
        const budgetId = parseInt(id, 10);
        const existing = await prisma.budget.findFirst({
            where: { id: budgetId, user_id: req.user.id },
        });

        if (!existing) {
            return res.status(404).json({ message: 'Budget not found or access denied' });
        }

        const parsedAmount = amount !== undefined ? parseFloat(amount) : undefined;
        if (parsedAmount !== undefined && (isNaN(parsedAmount) || parsedAmount <= 0)) {
            return res.status(400).json({ message: 'Amount must be a positive number' });
        }

        if (period && period !== 'monthly' && period !== 'weekly') {
            return res.status(400).json({ message: 'Period must be "monthly" or "weekly"' });
        }

        const updated = await prisma.budget.update({
            where: { id: budgetId },
            data: {
                amount: parsedAmount !== undefined ? parsedAmount : undefined,
                period: period || undefined,
            },
            include: {
                category: true,
            },
        });

        // Recompute spent
        const { start, end } = getPeriodDates(updated.period);
        const aggregate = await prisma.transaction.aggregate({
            where: {
                user_id: req.user.id,
                category_id: updated.category_id,
                type: 'expense',
                transaction_date: {
                    gte: start,
                    lte: end,
                },
            },
            _sum: {
                amount: true,
            },
        });

        const spent = aggregate._sum.amount ? aggregate._sum.amount.toString() : '0.00';

        res.json({
            id: updated.id,
            user_id: updated.user_id,
            category_id: updated.category_id,
            category_name: updated.category?.name || null,
            category_icon: updated.category?.icon || null,
            category_color: updated.category?.color || null,
            amount: updated.amount.toString(),
            spent,
            period: updated.period,
            start_date: updated.start_date.toISOString().split('T')[0],
        });
    } catch (err) {
        console.error('updateBudget error:', err);
        res.status(500).json({ message: 'Failed to update budget' });
    }
};

export const deleteBudget = async (req, res) => {
    const { id } = req.params;

    try {
        const budgetId = parseInt(id, 10);
        const existing = await prisma.budget.findFirst({
            where: { id: budgetId, user_id: req.user.id },
        });

        if (!existing) {
            return res.status(404).json({ message: 'Budget not found or access denied' });
        }

        await prisma.budget.delete({
            where: { id: budgetId },
        });

        res.json({ message: 'Budget deleted successfully' });
    } catch (err) {
        console.error('deleteBudget error:', err);
        res.status(500).json({ message: 'Failed to delete budget' });
    }
};
