import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import AppShell from './components/AppShell';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Articles from './pages/Articles';
import RawStock from './pages/RawStock';
import ReadyShoes from './pages/ReadyShoes';
import Production from './pages/Production';
import Purchase from './pages/Purchase';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import Invoices from './pages/Invoices';
import NewInvoice from './pages/NewInvoice';
import InvoicePrint from './pages/InvoicePrint';
import Sales from './pages/Sales';
import Payments from './pages/Payments';
import Roznamcha from './pages/Roznamcha';
import Kharcha from './pages/Kharcha';
import Reports from './pages/Reports';
import SettingsPage from './pages/Settings';
import RecycleBin from './pages/RecycleBin';

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-10 text-center text-sm text-mutedfg">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/invoices/:id/print" element={<RequireAuth><InvoicePrint /></RequireAuth>} />
      <Route element={<RequireAuth><AppShell /></RequireAuth>}>
        <Route index element={<Dashboard />} />
        <Route path="articles" element={<Articles />} />
        <Route path="raw-stock" element={<RawStock />} />
        <Route path="ready-shoes" element={<ReadyShoes />} />
        <Route path="production" element={<Production />} />
        <Route path="purchase" element={<Purchase />} />
        <Route path="customers" element={<Customers />} />
        <Route path="suppliers" element={<Suppliers />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="invoices/new" element={<NewInvoice />} />
        <Route path="sales" element={<Sales />} />
        <Route path="payments" element={<Payments />} />
        <Route path="roznamcha" element={<Roznamcha />} />
        <Route path="kharcha" element={<Kharcha />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="recycle-bin" element={<RecycleBin />} />
      </Route>
    </Routes>
  );
}
