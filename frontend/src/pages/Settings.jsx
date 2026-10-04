import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Button, Card, Field, Input, Select, Textarea, PageHeader } from '../components/ui';
import { BAG_SIZES } from '../lib/packs';
import { Save } from 'lucide-react';

export default function SettingsPage() {
  const [s, setS] = useState(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { api.get('/settings').then(setS).catch((e) => setError(e.message)); }, []);

  const set = (k, v) => { setS({ ...s, [k]: v }); setSaved(false); };

  const save = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const body = { ...s };
      ['low_stock_threshold', 'pairs_per_bag', 'pairs_per_carton', 'opening_cash'].forEach((k) => { body[k] = Number(body[k]) || 0; });
      const r = await api.put('/settings', body);
      setS(r);
      setSaved(true);
    } catch (err) { setError(err.message); }
  };

  if (!s) return <div className="text-sm text-mutedfg">{error || 'Loading…'}</div>;

  return (
    <div>
      <PageHeader
        label="Configuration"
        title="Settings"
        description="Company identity, currency, packing defaults and the low stock alert level."
        actions={<Button type="submit" form="settings-form"><Save size={15} /> Save settings</Button>}
      />
      {error && <div className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">{error}</div>}
      {saved && <div className="mb-3 rounded-lg bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">Settings saved.</div>}

      <form id="settings-form" onSubmit={save} className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Company">
          <div className="grid grid-cols-2 gap-x-3 p-4">
            <Field label="Company name" className="col-span-2"><Input value={s.company_name} onChange={(e) => set('company_name', e.target.value)} required /></Field>
            <Field label="Tagline" className="col-span-2"><Input value={s.tagline} onChange={(e) => set('tagline', e.target.value)} placeholder="Manufacturing & Trading" /></Field>
            <Field label="Address" className="col-span-2"><Textarea value={s.address} onChange={(e) => set('address', e.target.value)} /></Field>
            <Field label="Phone"><Input value={s.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
            <Field label="Email"><Input type="email" value={s.email} onChange={(e) => set('email', e.target.value)} /></Field>
            <Field label="Invoice prefix"><Input value={s.invoice_prefix} onChange={(e) => set('invoice_prefix', e.target.value)} /></Field>
            <Field label="Currency symbol"><Input value={s.currency} onChange={(e) => set('currency', e.target.value)} /></Field>
            <Field label="Invoice footer note" className="col-span-2"><Textarea value={s.footer_note} onChange={(e) => set('footer_note', e.target.value)} /></Field>
          </div>
        </Card>

        <Card title="Factory defaults">
          <div className="grid grid-cols-2 gap-x-3 p-4">
            <Field label="Low stock alert level">
              <Input type="number" min="0" value={s.low_stock_threshold} onChange={(e) => set('low_stock_threshold', e.target.value)} />
              <p className="mt-1 text-[11px] text-mutedfg">Pairs</p>
            </Field>
            <Field label="Opening cash">
              <Input type="number" min="0" step="any" value={s.opening_cash} onChange={(e) => set('opening_cash', e.target.value)} />
              <p className="mt-1 text-[11px] text-mutedfg">Starting balance of the roznamcha</p>
            </Field>
            <Field label="Default bag size">
              <Select value={s.pairs_per_bag} onChange={(e) => set('pairs_per_bag', e.target.value)}>
                {BAG_SIZES.map((n) => <option key={n} value={n}>{n}-pair bag</option>)}
              </Select>
            </Field>
            <Field label="Default pairs per carton"><Input type="number" min="0" value={s.pairs_per_carton} onChange={(e) => set('pairs_per_carton', e.target.value)} /></Field>
          </div>
          <p className="px-4 pb-4 text-[11px] text-mutedfg">
            Uppers bags are packed 100 or 150 pairs; ready shoes follow 12 / 18 / {s.pairs_per_carton}-pair cartons.
          </p>
        </Card>

        <Card title="Bank & payment details" className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-x-3 p-4 lg:grid-cols-4">
            <Field label="Bank name"><Input value={s.bank_name} onChange={(e) => set('bank_name', e.target.value)} /></Field>
            <Field label="Account title"><Input value={s.account_title} onChange={(e) => set('account_title', e.target.value)} /></Field>
            <Field label="Account number"><Input value={s.account_no} onChange={(e) => set('account_no', e.target.value)} /></Field>
            <Field label="IBAN"><Input value={s.iban} onChange={(e) => set('iban', e.target.value)} /></Field>
          </div>
          <p className="px-4 pb-4 text-[11px] text-mutedfg">These print inside the Payment info box on account-based invoices.</p>
        </Card>
      </form>
    </div>
  );
}
