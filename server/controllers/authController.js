import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../db.js';

const DEFAULT_CATEGORIES = [
    // Income
    { name: 'Salary', type: 'income', icon: 'briefcase', color: '#10B981', is_default: true },
    { name: 'Freelance', type: 'income', icon: 'laptop', color: '#22C55E', is_default: true },
    { name: 'Investments', type: 'income', icon: 'trending-up', color: '#14B8A6', is_default: true },
    { name: 'Gifts', type: 'income', icon: 'gift', color: '#06B6D4', is_default: true },
    { name: 'Other Income', type: 'income', icon: 'plus-circle', color: '#0EA5E9', is_default: true },
    // Expense
    { name: 'Food & Dining', type: 'expense', icon: 'utensils', color: '#F59E0B', is_default: true },
    { name: 'Groceries', type: 'expense', icon: 'shopping-cart', color: '#EAB308', is_default: true },
    { name: 'Transportation', type: 'expense', icon: 'car', color: '#EF4444', is_default: true },
    { name: 'Rent', type: 'expense', icon: 'home', color: '#F43F5E', is_default: true },
    { name: 'Utilities', type: 'expense', icon: 'zap', color: '#EC4899', is_default: true },
    { name: 'Entertainment', type: 'expense', icon: 'film', color: '#A855F7', is_default: true },
    { name: 'Shopping', type: 'expense', icon: 'shopping-bag', color: '#8B5CF6', is_default: true },
    { name: 'Healthcare', type: 'expense', icon: 'heart', color: '#3B82F6', is_default: true },
    { name: 'Education', type: 'expense', icon: 'book-open', color: '#6366F1', is_default: true },
    { name: 'Travel', type: 'expense', icon: 'plane', color: '#F97316', is_default: true },
    { name: 'Personal Care', type: 'expense', icon: 'sparkles', color: '#D946EF', is_default: true },
    { name: 'Other Expense', type: 'expense', icon: 'more-horizontal', color: '#64748B', is_default: true },
];

export const register = async (req, res) => {
    const { name, email, password, currency = 'USD' } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    try {
        const normalizedEmail = email.toLowerCase().trim();
        const existingUser = await prisma.user.findUnique({
            where: { email: normalizedEmail },
        });

        if (existingUser) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        // Transaction to ensure user and categories are created together
        const result = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    name,
                    email: normalizedEmail,
                    password_hash: passwordHash,
                    currency,
                },
            });

            await tx.category.createMany({
                data: DEFAULT_CATEGORIES.map((c) => ({
                    ...c,
                    user_id: user.id,
                })),
            });

            return user;
        });

        const token = jwt.sign(
            { id: result.id, email: result.email },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '7d' }
        );

        res.status(201).json({
            token,
            user: {
                id: result.id,
                name: result.name,
                email: result.email,
                currency: result.currency,
            },
        });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ message: 'Failed to register user' });
    }
};

export const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
        const normalizedEmail = email.toLowerCase().trim();
        const user = await prisma.user.findUnique({
            where: { email: normalizedEmail },
        });

        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                currency: user.currency,
            },
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Failed to log in' });
    }
};

export const getMe = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                name: true,
                email: true,
                currency: true,
                created_at: true,
            },
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (err) {
        console.error('getMe error:', err);
        res.status(500).json({ message: 'Failed to retrieve profile' });
    }
};
