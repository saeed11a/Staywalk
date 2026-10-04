import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Printer, ArrowLeft } from 'lucide-react';
import { api } from '../lib/api';
import { Button } from '../components/ui';
import InvoiceSheet from '../components/InvoiceSheet';

export default function InvoicePrint() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/invoices/' + id).then(setInvoice).catch((e) => setError(e.message));
    api.get('/settings').then(setSettings).catch(() => {});
  }, [id]);

  return (
    <div className="min-h-screen bg-bg p-4">
      <div className="no-print mx-auto mb-4 flex max-w-[830px] items-center justify-between">
        <Button variant="secondary" onClick={() => navigate('/invoices')}><ArrowLeft size={14} /> Back</Button>
        <Button onClick={() => window.print()}><Printer size={15} /> Print / Save PDF</Button>
      </div>
      {error && <div className="mx-auto max-w-[830px] rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}
      {invoice && settings && <InvoiceSheet settings={settings} invoice={invoice} />}
      {!invoice && !error && <div className="p-10 text-center text-sm text-mutedfg">Loading…</div>}
    </div>
  );
}
