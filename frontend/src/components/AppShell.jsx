import { useEffect, useState } from 'react';

import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Boxes, Footprints, Layers, Factory, ShoppingCart,
  FileText, TrendingUp, Users, Truck, Wallet, BookOpenText, Receipt,
  BarChart3, Settings2, Trash2, Menu, X, Sun, Moon, LogOut,
} from 'lucide-react';
import { useAuth } from '../auth';
import { api } from '../lib/api';
import Logo from './Logo';

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
      <div className="flex items-center gap-3 px-5 py-5">
        <Logo />
        <div className="min-w-0">
          <div className="truncate font-heading text-[15px] font-extrabold text-white">{company}</div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-white/45">Shoes Factory ERP</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-3">
        {NAV.map((g) => (
          <div key={g.group} className="mb-4">
            <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-white/35">{g.group}</div>
            {g.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `mt-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors ${
                    isActive ? 'bg-accent text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'}`
                }
              >
                <item.icon size={16} strokeWidth={2.2} />
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="m-3 rounded-xl bg-white/5 p-3.5">
        <div className="text-[10px] font-bold uppercase tracking-wider text-white/40">Automatic postings</div>
        <div className="mt-1 text-[12px] font-bold text-white">Stock · Kata · Roznamcha</div>
        <div className="mt-1 text-[11px] leading-snug text-white/45">Production, purchases, invoices and payments update every module.</div>
      </div>
    </>
  );
}

export default function AppShell() {
  const { user, logout } = useAuth();
  const [company, setCompany] = useState('HIKER Shoes Factory');
  const [drawer, setDrawer] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem('hiker_theme') === 'dark');
  const [now, setNow] = useState(() => new Date());
  
  const location = useLocation();

  useEffect(() => {
    api.get('/settings').then((s) => setCompany(s.company_name)).catch(() => {});
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('hiker_theme', dark ? 'dark' : 'light');
  }, [dark]);
useEffect(() => {
  const id = setInterval(() => setNow(new Date()), 1000);
  return () => clearInterval(id);
}, []);
  useEffect(() => setDrawer(false), [location.pathname]);

  const name = user?.name || 'Admin';
  const initial = (name[0] || 'A').toUpperCase();

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto flex w-full max-w-[1280px]">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-navy md:flex">
          <SidebarContent company={company} />
        </aside>

        {/* Mobile drawer */}
        {drawer && (
          <div className="fixed inset-0 z-40 md:hidden" onClick={() => setDrawer(false)}>
            <div className="absolute inset-0 bg-black/50" />
            <aside className="absolute left-0 top-0 flex h-full w-64 flex-col bg-navy" onClick={(e) => e.stopPropagation()}>
              <button className="absolute right-3 top-3 text-white/70 hover:text-white" onClick={() => setDrawer(false)} aria-label="Close menu">
                <X size={18} />
              </button>
              <SidebarContent company={company} onNavigate={() => setDrawer(false)} />
            </aside>
          </div>
        )}

        <div className="min-w-0 flex-1 p-3 md:p-4">
          <div className="overflow-hidden rounded-2xl border border-borderc bg-card shadow-card">
            <header className="no-print flex h-12 items-center justify-between gap-3 border-b border-borderc px-3 md:px-5">
              <div className="flex min-w-0 items-center gap-2">
                <button className="flex items-center text-mutedfg md:hidden" onClick={() => setDrawer(true)} aria-label="Open menu">
                  <Menu size={20} />
                </button>
                <span className="truncate text-[10px] font-bold uppercase tracking-[0.18em] text-mutedfg">Manufacturing Control</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-mutedfg hover:bg-muted hover:text-fg"
                  onClick={() => setDark(!dark)}
                  title="Toggle dark mode"
                >
                  {dark ? <Sun size={16} /> : <Moon size={16} />}
                </button>
                <div className="flex items-center gap-2 rounded-full border border-borderc px-2 py-1">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-[11px] font-bold text-white">{initial}</span>
                  <div className="hidden leading-tight sm:block">
                    <div className="max-w-[130px] truncate text-[11px] font-semibold">{name}</div>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-mutedfg">Admin</div>
                  </div>
                </div>
                <button
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-mutedfg hover:bg-muted hover:text-fg"
                  onClick={logout}
                  title="Sign out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </header>

            <main className="min-w-0 p-4 md:p-6">
              <Outlet />
            </main>

            <footer className="border-t border-borderc px-4 py-3 text-center text-[11px] text-mutedfg">
              {company} ERP · Stock · Production · Sales · Accounts
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
