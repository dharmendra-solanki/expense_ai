import prisma from '../db.js';

export const getTransactions = async (req, res) => {
    const { search, categoryId, type, limit } = req.query;

    try {
        const whereClause = {
            user_id: req.user.id,
        };

        if (categoryId) {
            whereClause.category_id = parseInt(categoryId, 10);
        }

        if (type) {
            whereClause.type = type;
        }

        if (search) {
            whereClause.OR = [
                { description: { contains: search, mode: 'insensitive' } },
                { notes: { contains: search, mode: 'insensitive' } },
            ];
        }

        const limitParsed = limit ? parseInt(limit, 10) : undefined;

        const transactions = await prisma.transaction.findMany({
            where: whereClause,
            include: {
                category: true,
            },
            orderBy: [
                { transaction_date: 'desc' },
                { id: 'desc' },
            ],
            take: limitParsed,
        });

        // Map to flat structure expected by frontend
        const formatted = transactions.map((t) => ({
            id: t.id,
            user_id: t.user_id,
            category_id: t.category_id,
            category_name: t.category?.name || null,
            category_icon: t.category?.icon || null,
            category_color: t.category?.color || null,
            amount: t.amount.toString(), // Convert Decimal to string
            type: t.type,
            description: t.description,
            notes: t.notes,
            transaction_date: t.transaction_date.toISOString().split('T')[0],
            created_at: t.created_at,
        }));

        res.json(formatted);
    } catch (err) {
        console.error('getTransactions error:', err);
        res.status(500).json({ message: 'Failed to retrieve transactions' });
    }
};

export const getTransactionById = async (req, res) => {
    const { id } = req.params;

    try {
        const txnId = parseInt(id, 10);
        const transaction = await prisma.transaction.findFirst({
            where: { id: txnId, user_id: req.user.id },
            include: {
                category: true,
            },
        });

        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found or access denied' });
        }

        const formatted = {
            id: transaction.id,
            user_id: transaction.user_id,
            category_id: transaction.category_id,
            category_name: transaction.category?.name || null,
            category_icon: transaction.category?.icon || null,
            category_color: transaction.category?.color || null,
            amount: transaction.amount.toString(),
            type: transaction.type,
            description: transaction.description,
            notes: transaction.notes,
            transaction_date: transaction.transaction_date.toISOString().split('T')[0],
            created_at: transaction.created_at,
        };

        res.json(formatted);
    } catch (err) {
        console.error('getTransactionById error:', err);
        res.status(500).json({ message: 'Failed to retrieve transaction' });
    }
};

export const createTransaction = async (req, res) => {
    const { type, amount, categoryId, description, notes, transactionDate } = req.body;

    if (!type || amount === undefined || !transactionDate) {
        return res.status(400).json({ message: 'Type, amount, and transactionDate are required' });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ message: 'Amount must be a positive number' });
    }

    try {
        const parsedCategoryId = categoryId ? parseInt(categoryId, 10) : null;

        // If category is provided, verify it exists and belongs to user
        if (parsedCategoryId) {
            const category = await prisma.category.findFirst({
                where: { id: parsedCategoryId, user_id: req.user.id },
            });
            if (!category) {
                return res.status(400).json({ message: 'Invalid category ID' });
            }
        }

        const transaction = await prisma.transaction.create({
            data: {
                user_id: req.user.id,
                category_id: parsedCategoryId,
                amount: parsedAmount,
                type,
                description: description || null,
                notes: notes || null,
                transaction_date: new Date(transactionDate),
            },
            include: {
                category: true,
            },
        });

        const formatted = {
            id: transaction.id,
            user_id: transaction.user_id,
            category_id: transaction.category_id,
            category_name: transaction.category?.name || null,
            category_icon: transaction.category?.icon || null,
            category_color: transaction.category?.color || null,
            amount: transaction.amount.toString(),
            type: transaction.type,
            description: transaction.description,
            notes: transaction.notes,
            transaction_date: transaction.transaction_date.toISOString().split('T')[0],
            created_at: transaction.created_at,
        };

        res.status(201).json(formatted);
    } catch (err) {
        console.error('createTransaction error:', err);
        res.status(500).json({ message: 'Failed to create transaction' });
    }
};

export const updateTransaction = async (req, res) => {
    const { id } = req.params;
    const { type, amount, categoryId, description, notes, transactionDate } = req.body;

    try {
        const txnId = parseInt(id, 10);
        // Verify owner
        const existing = await prisma.transaction.findFirst({
            where: { id: txnId, user_id: req.user.id },
        });

        if (!existing) {
            return res.status(404).json({ message: 'Transaction not found or access denied' });
        }

        const parsedCategoryId = categoryId ? parseInt(categoryId, 10) : null;
        if (parsedCategoryId) {
            const category = await prisma.category.findFirst({
                where: { id: parsedCategoryId, user_id: req.user.id },
            });
            if (!category) {
                return res.status(400).json({ message: 'Invalid category ID' });
            }
        }

        const parsedAmount = amount !== undefined ? parseFloat(amount) : undefined;
        if (parsedAmount !== undefined && (isNaN(parsedAmount) || parsedAmount <= 0)) {
            return res.status(400).json({ message: 'Amount must be a positive number' });
        }

        const updated = await prisma.transaction.update({
            where: { id: txnId },
            data: {
                type: type || undefined,
                amount: parsedAmount !== undefined ? parsedAmount : undefined,
                category_id: categoryId !== undefined ? parsedCategoryId : undefined,
                description: description !== undefined ? description : undefined,
                notes: notes !== undefined ? notes : undefined,
                transaction_date: transactionDate ? new Date(transactionDate) : undefined,
            },
            include: {
                category: true,
            },
        });

        const formatted = {
            id: updated.id,
            user_id: updated.user_id,
            category_id: updated.category_id,
            category_name: updated.category?.name || null,
            category_icon: updated.category?.icon || null,
            category_color: updated.category?.color || null,
            amount: updated.amount.toString(),
            type: updated.type,
            description: updated.description,
            notes: updated.notes,
            transaction_date: updated.transaction_date.toISOString().split('T')[0],
            created_at: updated.created_at,
        };

        res.json(formatted);
    } catch (err) {
        console.error('updateTransaction error:', err);
        res.status(500).json({ message: 'Failed to update transaction' });
    }
};

export const deleteTransaction = async (req, res) => {
    const { id } = req.params;

    try {
        const txnId = parseInt(id, 10);
        // Verify owner
        const existing = await prisma.transaction.findFirst({
            where: { id: txnId, user_id: req.user.id },
        });

        if (!existing) {
            return res.status(404).json({ message: 'Transaction not found or access denied' });
        }

        await prisma.transaction.delete({
            where: { id: txnId },
        });

        res.json({ message: 'Transaction deleted successfully' });
    } catch (err) {
        console.error('deleteTransaction error:', err);
        res.status(500).json({ message: 'Failed to delete transaction' });
    }
};
