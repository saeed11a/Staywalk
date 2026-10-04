import { NavLink, Outlet } from 'react-router-dom';

const NAV = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/orders', label: 'Orders' },
  { to: '/customers', label: 'Customers' },
  { to: '/products', label: 'Products' },
  { to: '/production', label: 'Production' },
  { to: '/inventory', label: 'Inventory' },
  { to: '/invoices', label: 'Invoices' },
  { to: '/employees', label: 'Employees' },
];

export default function Layout() {
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon">👟</span>
          <div>
            <div className="brand-name">Hiker ERP</div>
            <div className="brand-sub">Shoes Factory</div>
          </div>
        </div>
        <nav>
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
