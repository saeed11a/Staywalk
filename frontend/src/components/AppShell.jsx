import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Boxes, Footprints, Layers, Factory, ShoppingCart,
  FileText, TrendingUp, Users, Truck, Wallet, BookOpenText, Receipt,
  BarChart3, Settings2, Trash2, Menu, X, Sun, Moon, LogOut,
} from 'lucide-react';
import { useAuth } from '../auth';
import { api } from '../lib/api';

const NAV = [
  { group: 'Overview', items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true }] },
  { group: 'Stock', items: [
    { to: '/raw-stock', label: 'Raw Stock', icon: Boxes },
    { to: '/ready-shoes', label: 'Ready Shoes', icon: Footprints },
    { to: '/articles', label: 'Articles', icon: Layers },
  ] },
  { group: 'Production', items: [
    { to: '/production', label: 'Production', icon: Factory },
    { to: '/purchase', label: 'Purchase', icon: ShoppingCart },
  ] },
  { group: 'Sales', items: [
    { to: '/invoices', label: 'Invoices', icon: FileText },
    { to: '/sales', label: 'Sales', icon: TrendingUp },
    { to: '/customers', label: 'Customers', icon: Users },
  ] },
  { group: 'Accounts', items: [
    { to: '/suppliers', label: 'Suppliers', icon: Truck },
    { to: '/payments', label: 'Payments', icon: Wallet },
    { to: '/roznamcha', label: 'Roznamcha', icon: BookOpenText },
    { to: '/kharcha', label: 'Kharcha', icon: Receipt },
  ] },
  { group: 'System', items: [
    { to: '/reports', label: 'Reports', icon: BarChart3 },
    { to: '/settings', label: 'Settings', icon: Settings2 },
    { to: '/recycle-bin', label: 'Recycle Bin', icon: Trash2 },
  ] },
];

function SidebarContent({ company, onNavigate }) {
  return (
    <>
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-copper font-heading text-lg font-extrabold text-white">H</div>
        <div className="min-w-0">
          <div className="truncate font-heading text-[15px] font-extrabold text-white">{company}</div>
          <div className="microlabel !text-white/50">Shoes Factory ERP</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {NAV.map((g) => (
          <div key={g.group} className="mb-4">
            <div className="microlabel px-2 !text-white/40">{g.group}</div>
            {g.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `mt-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors ${
                    isActive ? 'bg-copper text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'}`
                }
              >
                <item.icon size={16} strokeWidth={2.2} />
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </>
  );
}

export default function AppShell() {
  const { user, logout } = useAuth();
  const [company, setCompany] = useState('HIKER Shoes');
  const [drawer, setDrawer] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem('hiker_theme') === 'dark');
  const location = useLocation();

  useEffect(() => {
    api.get('/settings').then((s) => setCompany(s.company_name)).catch(() => {});
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('hiker_theme', dark ? 'dark' : 'light');
  }, [dark]);

  useEffect(() => setDrawer(false), [location.pathname]);

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-navy md:flex">
        <SidebarContent company={company} />
        <div className="border-t border-white/10 px-5 py-3 text-[12px] text-white/50">{user?.email}</div>
      </aside>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setDrawer(false)}>
          <div className="absolute inset-0 bg-navy/60 backdrop-blur-sm" />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col bg-navy" onClick={(e) => e.stopPropagation()}>
            <SidebarContent company={company} onNavigate={() => setDrawer(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex h-12 items-center justify-between border-b border-borderc bg-card/90 px-4 backdrop-blur">
          <button className="flex items-center gap-2 text-mutedfg md:hidden" onClick={() => setDrawer(true)}>
            <Menu size={20} />
          </button>
          <div className="hidden md:block" />
          <div className="flex items-center gap-1">
            <button className="flex h-8 w-8 items-center justify-center rounded-lg text-mutedfg hover:bg-muted hover:text-fg" onClick={() => setDark(!dark)} title="Toggle theme">
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button className="flex h-8 w-8 items-center justify-center rounded-lg text-mutedfg hover:bg-muted hover:text-fg" onClick={logout} title="Sign out">
              <LogOut size={16} />
            </button>
          </div>
        </header>
        <main className="min-w-0 flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
