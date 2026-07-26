import prisma from '../db.js';

export const getCategories = async (req, res) => {
    try {
        const categories = await prisma.category.findMany({
            where: { user_id: req.user.id },
            orderBy: { name: 'asc' },
        });
        res.json(categories);
    } catch (err) {
        console.error('getCategories error:', err);
        res.status(500).json({ message: 'Failed to retrieve categories' });
    }
};

export const createCategory = async (req, res) => {
    const { name, type, icon, color } = req.body;

    if (!name || !type) {
        return res.status(400).json({ message: 'Name and type are required' });
    }

    if (type !== 'income' && type !== 'expense') {
        return res.status(400).json({ message: 'Type must be "income" or "expense"' });
    }

    try {
        const category = await prisma.category.create({
            data: {
                user_id: req.user.id,
                name: name.trim(),
                type,
                icon: icon || 'tag',
                color: color || '#10B981',
            },
        });
        res.status(201).json(category);
    } catch (err) {
        console.error('createCategory error:', err);
        // Handle unique constraint check (P2002 standard Prisma error)
        if (err.code === 'P2002') {
            return res.status(400).json({
                message: `Category "${name}" already exists for type "${type}"`,
            });
        }
        res.status(500).json({ message: 'Failed to create category' });
    }
};

export const updateCategory = async (req, res) => {
    const { id } = req.params;
    const { name, icon, color } = req.body;

    try {
        const catId = parseInt(id, 10);
        // Verify owner
        const category = await prisma.category.findFirst({
            where: { id: catId, user_id: req.user.id },
        });

        if (!category) {
            return res.status(404).json({ message: 'Category not found or access denied' });
        }

        const updated = await prisma.category.update({
            where: { id: catId },
            data: {
                name: name !== undefined ? name.trim() : undefined,
                icon,
                color,
            },
        });

        res.json(updated);
    } catch (err) {
        console.error('updateCategory error:', err);
        if (err.code === 'P2002') {
            return res.status(400).json({
                message: 'A category with this name already exists',
            });
        }
        res.status(500).json({ message: 'Failed to update category' });
    }
};

export const deleteCategory = async (req, res) => {
    const { id } = req.params;

    try {
        const catId = parseInt(id, 10);
        // Verify owner
        const category = await prisma.category.findFirst({
            where: { id: catId, user_id: req.user.id },
        });

        if (!category) {
            return res.status(404).json({ message: 'Category not found or access denied' });
        }

        await prisma.category.delete({
            where: { id: catId },
        });

        res.json({ message: 'Category deleted successfully' });
    } catch (err) {
        console.error('deleteCategory error:', err);
        res.status(500).json({ message: 'Failed to delete category' });
    }
};
