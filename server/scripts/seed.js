import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

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

const seed = async () => {
    try {
        console.log('Starting seeding...');

        // 1. Delete all existing data
        console.log('Cleaning existing data...');
        await prisma.aiInsight.deleteMany();
        await prisma.budget.deleteMany();
        await prisma.transaction.deleteMany();
        await prisma.category.deleteMany();
        await prisma.user.deleteMany();

        // 2. Create user Alex
        console.log('Creating demo user...');
        const passwordHash = await bcrypt.hash('password123', 10);
        const user = await prisma.user.create({
            data: {
                name: 'Alex',
                email: 'alex@timetoprogram.com',
                password_hash: passwordHash,
                currency: 'USD',
            },
        });

        // 3. Create categories
        console.log('Seeding default categories...');
        const categories = [];
        for (const cat of DEFAULT_CATEGORIES) {
            const dbCat = await prisma.category.create({
                data: {
                    ...cat,
                    user_id: user.id,
                },
            });
            categories.push(dbCat);
        }

        const catMap = Object.fromEntries(categories.map((c) => [c.name, c]));

        // Helper to get dates
        const today = new Date();
        const dateNDaysAgo = (n) => {
            const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - n);
            d.setHours(12, 0, 0, 0); // avoid timezone roll issues
            return d;
        };

        // 4. Seed Transactions (simulating last 3 months)
        console.log('Seeding transactions...');
        const txsData = [];

        // Income - bi-weekly Salary
        [0, 14, 30, 44, 60, 74, 90].forEach((n) => {
            txsData.push({
                user_id: user.id,
                category_id: catMap['Salary'].id,
                amount: 2750.00,
                type: 'income',
                description: 'Salary deposit',
                transaction_date: dateNDaysAgo(n),
            });
        });

        // Freelance
        txsData.push({
            user_id: user.id,
            category_id: catMap['Freelance'].id,
            amount: 800.00,
            type: 'income',
            description: 'Client project',
            transaction_date: dateNDaysAgo(15),
        });
        txsData.push({
            user_id: user.id,
            category_id: catMap['Freelance'].id,
            amount: 1200.00,
            type: 'income',
            description: 'Client project',
            transaction_date: dateNDaysAgo(75),
        });

        // Rent (monthly)
        [3, 33, 63, 93].forEach((n) => {
            txsData.push({
                user_id: user.id,
                category_id: catMap['Rent'].id,
                amount: 1800.00,
                type: 'expense',
                description: 'Monthly rent',
                transaction_date: dateNDaysAgo(n),
            });
        });

        // Utilities (monthly)
        [7, 37, 67].forEach((n) => {
            txsData.push({
                user_id: user.id,
                category_id: catMap['Utilities'].id,
                amount: 95.00,
                type: 'expense',
                description: 'Electric + Internet',
                transaction_date: dateNDaysAgo(n),
            });
        });

        // Subscriptions
        [4, 34, 64, 94].forEach((n) => {
            txsData.push({
                user_id: user.id,
                category_id: catMap['Entertainment'].id,
                amount: 15.99,
                type: 'expense',
                description: 'Netflix',
                transaction_date: dateNDaysAgo(n),
            });
            txsData.push({
                user_id: user.id,
                category_id: catMap['Entertainment'].id,
                amount: 10.99,
                type: 'expense',
                description: 'Spotify',
                transaction_date: dateNDaysAgo(n),
            });
        });

        // Groceries (weekly)
        [2, 9, 16, 23, 30, 37, 44, 51, 58, 65, 72, 79].forEach((n) => {
            txsData.push({
                user_id: user.id,
                category_id: catMap['Groceries'].id,
                amount: 60.00 + (n % 35),
                type: 'expense',
                description: 'Weekly groceries',
                transaction_date: dateNDaysAgo(n),
            });
        });

        // Food & Dining
        const foodDays = [1, 2, 5, 6, 8, 11, 13, 17, 19, 22, 25, 28, 31, 36, 41, 46, 52, 58, 67, 73, 81];
        foodDays.forEach((n, i) => {
            const amount = 8.00 + (n % 32);
            const desc = i % 4 === 0 ? 'Coffee' : i % 4 === 1 ? 'Lunch' : i % 4 === 2 ? 'Dinner out' : 'Takeout';
            txsData.push({
                user_id: user.id,
                category_id: catMap['Food & Dining'].id,
                amount,
                type: 'expense',
                description: desc,
                transaction_date: dateNDaysAgo(n),
            });
        });

        // Transportation
        [4, 11, 18, 25, 32, 39, 46, 53, 60, 67].forEach((n, i) => {
            txsData.push({
                user_id: user.id,
                category_id: catMap['Transportation'].id,
                amount: 25.00 + (n % 30),
                type: 'expense',
                description: i % 2 === 0 ? 'Gas' : 'Uber',
                transaction_date: dateNDaysAgo(n),
            });
        });

        // Entertainment Outings
        [12, 27, 49, 71].forEach((n) => {
            txsData.push({
                user_id: user.id,
                category_id: catMap['Entertainment'].id,
                amount: 32.00 + (n % 40),
                type: 'expense',
                description: 'Movie / event',
                transaction_date: dateNDaysAgo(n),
            });
        });

        // Shopping
        txsData.push({ user_id: user.id, category_id: catMap['Shopping'].id, amount: 120.00, type: 'expense', description: 'New shoes', transaction_date: dateNDaysAgo(11) });
        txsData.push({ user_id: user.id, category_id: catMap['Shopping'].id, amount: 85.00, type: 'expense', description: 'Home goods', transaction_date: dateNDaysAgo(48) });
        txsData.push({ user_id: user.id, category_id: catMap['Shopping'].id, amount: 65.00, type: 'expense', description: 'Amazon order', transaction_date: dateNDaysAgo(83) });

        // Healthcare
        txsData.push({ user_id: user.id, category_id: catMap['Healthcare'].id, amount: 75.00, type: 'expense', description: 'Pharmacy', transaction_date: dateNDaysAgo(22) });
        txsData.push({ user_id: user.id, category_id: catMap['Healthcare'].id, amount: 45.00, type: 'expense', description: 'Doctor visit', transaction_date: dateNDaysAgo(55) });

        // Personal Care
        [8, 38, 68].forEach((n) => {
            txsData.push({
                user_id: user.id,
                category_id: catMap['Personal Care'].id,
                amount: 38.00,
                type: 'expense',
                description: 'Haircut',
                transaction_date: dateNDaysAgo(n),
            });
        });

        // Travel
        txsData.push({ user_id: user.id, category_id: catMap['Travel'].id, amount: 220.00, type: 'expense', description: 'Weekend trip', transaction_date: dateNDaysAgo(40) });

        await prisma.transaction.createMany({
            data: txsData,
        });

        // 5. Seed Budgets
        console.log('Seeding budgets...');
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const budgetsData = [
            { category_id: catMap['Food & Dining'].id, amount: 400.00, period: 'monthly', start_date: monthStart },
            { category_id: catMap['Groceries'].id, amount: 400.00, period: 'monthly', start_date: monthStart },
            { category_id: catMap['Entertainment'].id, amount: 100.00, period: 'monthly', start_date: monthStart },
            { category_id: catMap['Transportation'].id, amount: 250.00, period: 'monthly', start_date: monthStart },
            { category_id: catMap['Shopping'].id, amount: 100.00, period: 'monthly', start_date: monthStart },
        ];

        for (const bud of budgetsData) {
            await prisma.budget.create({
                data: {
                    ...bud,
                    user_id: user.id,
                },
            });
        }

        console.log('Seeding finished successfully!');
    } catch (err) {
        console.error('Seeding failed:', err);
    } finally {
        await prisma.$disconnect();
    }
};

seed();
