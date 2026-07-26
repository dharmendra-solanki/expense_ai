import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import MobileNav from './MobileNav.jsx';

const Layout = () => {
    return (
        <div className="h-screen flex bg-slate-50 overflow-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
                <Topbar />
                <main className="flex-1 overflow-y-auto p-4 pb-24 lg:p-8 lg:pb-8">
                    <Outlet />
                </main>
            </div>
            <MobileNav />
        </div>
    );
};

export default Layout;
