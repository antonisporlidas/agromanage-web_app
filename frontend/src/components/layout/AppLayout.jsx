import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  MapPin, 
  Sprout, 
  Truck, 
  Receipt, 
  WalletCards, 
  LogOut, 
  Menu, 
  X 
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Επισκόπηση', href: '/', icon: LayoutDashboard },
    { name: 'Χωράφια & Χάρτης', href: '/fields', icon: MapPin },
    { name: 'Καλλιέργειες & Εργασίες', href: '/crops', icon: Sprout },
    { name: 'Δελτία & Πελάτες', href: '/dispatches', icon: Truck },
    { name: 'Εκκαθαρίσεις', href: '/settlements', icon: Receipt },
    { name: 'Οικονομικά & Έξοδα', href: '/finances', icon: WalletCards },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Topbar */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold">
            A
          </div>
          <span className="font-semibold text-slate-800 tracking-tight">AgroManage</span>
        </div>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-slate-600 hover:text-slate-900 focus:outline-none"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between transition-transform duration-200 ease-in-out md:static md:translate-x-0
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div>
          {/* Logo Brand */}
          <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-700 to-emerald-500 flex items-center justify-center text-white font-bold shadow-sm shadow-emerald-500/20">
              <Sprout size={20} />
            </div>
            <div>
              <span className="text-base font-bold text-slate-900 tracking-tight block leading-tight">AgroManage</span>
              <span className="text-[11px] font-medium text-emerald-700 uppercase tracking-wider block">Farm System</span>
            </div>
          </div>

          {/* Links */}
          <nav className="p-4 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all
                    ${isActive 
                      ? 'bg-emerald-50 text-emerald-800 shadow-xs' 
                      : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                    }
                  `}
                >
                  <Icon size={18} className="shrink-0" />
                  {item.name}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User Footer & Logout */}
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
            <div className="truncate pr-2">
              <p className="text-sm font-semibold text-slate-800 truncate">{user?.name || 'Παραγωγός'}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Αποσύνδεση"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  );
}