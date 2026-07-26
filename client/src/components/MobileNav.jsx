import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    ArrowLeftRight,
    Folder,
    Target,
    Sparkles,
} from 'lucide-react';

const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
    { to: '/categories', label: 'Categories', icon: Folder },
    { to: '/budgets', label: 'Budgets', icon: Target },
    { to: '/insights', label: 'Insights', icon: Sparkles },
];

const MobileNav = () => {
    return (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-100 safe-area-pb">
            <div className="flex items-center justify-around px-1 py-1">
                {navItems.map(({ to, label, icon: Icon }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={to === '/'}
                        className={({ isActive }) =>
                            `flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl flex-1 transition ${
                                isActive
                                    ? 'text-violet-600'
                                    : 'text-slate-400 hover:text-slate-700'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <div className={`p-1.5 rounded-xl transition ${isActive ? 'bg-violet-50' : ''}`}>
                                    <Icon size={20} strokeWidth={isActive ? 2 : 1.75} />
                                </div>
                                <span className="text-[10px] font-medium leading-none">{label}</span>
                            </>
                        )}
                    </NavLink>
                ))}
            </div>
        </nav>
    );
};

export default MobileNav;
