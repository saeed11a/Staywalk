import { useEffect, useState } from 'react';
import { api, fmtRs, fmtNum, daysAgo, today } from '../lib/api';
import { downloadCSV } from '../lib/csv';
import { Button, Card, PageHeader, Empty, Badge, Input, StatCard, DateRange } from '../components/ui';
import { Download, Printer } from 'lucide-react';
import { ClickableRow, RecordDialog } from '../components/RecordDialog';

const TABS = [
  { key: 'stock', label: 'Stock' },
  { key: 'purchase', label: 'Purchases' },
  { key: 'sales', label: 'Sales' },
  { key: 'payments', label: 'Payments' },
  { key: 'roznamcha', label: 'Roznamcha' },
  { key: 'kharcha', label: 'Kharcha' },
];

const CONFIG = {
  roznamcha: {
    url: (from, to) => `/roznamcha?from=${from}&to=${to}`,
    columns: ['Date', 'Direction', 'Source', 'Party', 'Description', 'Category', 'Amount', 'Method'],
    toRow: (r) => [r.date, r.direction, r.source, r.party, r.description, r.category, r.amount, r.method],
    head: ['Date', 'Dir', 'Source', 'Party', 'Description', 'Category', 'Amount', 'Method'],
    render: (rows, onOpen) => rows.map((r) => (
      <ClickableRow key={r.id} onOpen={() => onOpen(r)}>
        <td className="num text-mutedfg">{r.date}</td>
        <td><Badge tone={r.direction}>{r.direction}</Badge></td>
        <td>{r.source}</td>
        <td>{r.party || '—'}</td>
        <td>{r.description || '—'}</td>
        <td className="text-mutedfg">{r.category || '—'}</td>
        <td className={`num text-right font-bold ${r.direction === 'in' ? 'text-emerald-700' : 'text-red-600'}`}>{fmtRs(r.amount)}</td>
        <td className="text-mutedfg">{r.method}</td>
      </ClickableRow>
    )),
  },
  payments: {
    url: (from, to) => `/payments?from=${from}&to=${to}`,
    columns: ['Date', 'Party', 'Type', 'Direction', 'Amount', 'Method', 'Reference'],
    toRow: (r) => [r.date, r.party_name, r.party_type, r.direction, r.amount, r.method, r.reference],
    head: ['Date', 'Party', 'Type', 'Dir', 'Amount', 'Method', 'Reference'],
    render: (rows, onOpen) => rows.map((r) => (
      <ClickableRow key={r.id} onOpen={() => onOpen(r)}>
        <td className="num text-mutedfg">{r.date}</td>
        <td className="font-semibold">{r.party_name}</td>
        <td className="text-mutedfg">{r.party_type}</td>
        <td><Badge tone={r.direction}>{r.direction}</Badge></td>
        <td className={`num text-right font-bold ${r.direction === 'in' ? 'text-emerald-700' : 'text-red-600'}`}>{fmtRs(r.amount)}</td>
        <td className="text-mutedfg">{r.method}</td>
        <td className="text-mutedfg">{r.reference || '—'}</td>
      </ClickableRow>
    )),
  },
  kharcha: {
    url: (from, to) => `/kharcha?from=${from}&to=${to}`,
    columns: ['Date', 'Category', 'Description', 'Amount', 'Method'],
    toRow: (r) => [r.date, r.category, r.description, r.amount, r.method],
    head: ['Date', 'Category', 'Description', 'Amount', 'Method'],
    render: (rows, onOpen) => rows.map((r) => (
      <ClickableRow key={r.id} onOpen={() => onOpen(r)}>
        <td className="num text-mutedfg">{r.date}</td>
        <td>{r.category || '—'}</td>
        <td>{r.description || '—'}</td>
        <td className="num text-right font-bold text-red-600">{fmtRs(r.amount)}</td>
        <td className="text-mutedfg">{r.method}</td>
      </ClickableRow>
    )),
  },
  sales: {
    url: (from, to) => `/invoices?items=1&from=${from}&to=${to}`,
    columns: ['Invoice', 'Date', 'Customer', 'Article', 'Cartons', 'Pairs', 'Rate', 'Amount'],
    toRow: (r) => [r.invoice_no, r.date, r.customer_name, `${r.article_code} ${r.article_name}`, r.cartons, r.pairs, r.rate, r.amount],
    head: ['Invoice', 'Date', 'Customer', 'Article', 'Cartons × pairs', 'Pairs', 'Rate', 'Amount'],
    render: (rows, onOpen) => rows.map((r, i) => (
      <ClickableRow key={i} onOpen={() => onOpen(r)}>
        <td className="num font-semibold">{r.invoice_no}</td>
        <td className="num text-mutedfg">{r.date}</td>
        <td>{r.customer_name}</td>
        <td>{r.article_code} <span className="text-mutedfg">{r.article_name}</span></td>
        <td className="num text-right">{r.cartons} × {r.pairs_per_carton}</td>
        <td className="num text-right">{fmtNum(r.pairs)}</td>
        <td className="num text-right">{fmtRs(r.rate)}</td>
        <td className="num text-right font-bold">{fmtRs(r.amount)}</td>
      </ClickableRow>
    )),
  },
  purchase: {
    url: (from, to) => `/purchases?from=${from}&to=${to}`,
    columns: ['Date', 'Supplier', 'Item', 'Category', 'Quantity', 'Total pairs', 'Amount'],
    toRow: (r) => [r.date, r.supplier_name, r.item, r.category_slug, r.quantity, r.total_pairs, r.amount],
    head: ['Date', 'Supplier', 'Item', 'Category', 'Qty', 'Total pairs', 'Amount'],
    render: (rows, onOpen) => rows.map((r) => (
      <ClickableRow key={r.id} onOpen={() => onOpen(r)}>
        <td className="num text-mutedfg">{r.date}</td>
        <td className="font-semibold">{r.supplier_name}</td>
        <td>{r.item}</td>
        <td>{r.category_slug}</td>
        <td className="num text-right">{fmtNum(r.quantity)}</td>
        <td className="num text-right">{fmtNum(r.total_pairs)}</td>
        <td className="num text-right font-bold">{fmtRs(r.amount)}</td>
      </ClickableRow>
    )),
  },
};

export default function Reports() {
  const [tab, setTab] = useState('stock');
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(today());
  const [rows, setRows] = useState([]);
  const [stockReport, setStockReport] = useState(null);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (tab === 'stock') {
      api.get('/reports/stock').then(setStockReport).catch((e) => setError(e.message));
      return;
    }
    const cfg = CONFIG[tab];
    api.get(cfg.url(from, to)).then(setRows).catch((e) => setError(e.message));
  }, [tab, from, to]);

  const cfg = CONFIG[tab];

  // Report rows mirror a module record — show it in the same label/value form view.
  const openDetail = (r) => setDetail({
    title: `${TABS.find((t) => t.key === tab).label} — ${[r.invoice_no, r.item, r.party_name, r.party, r.description, r.category].filter(Boolean)[0] || r.date || 'record'}`,
    subtitle: r.date || '',
    fields: cfg.columns.map((label, i) => [label, cfg.toRow(r)[i]]),
  });

  return (
    <div>
      <PageHeader
        label="Reports"
        title="Reports"
        description="Every module's numbers in one place — pick a tab, filter by date, then export or print."
        actions={
          tab === 'stock' ? (
            <>
              <Button variant="secondary" size="sm" onClick={() => downloadCSV('stock-by-category.csv',
                ['Category', 'Lines', 'Quantity', 'Pairs', 'Value'],
                (stockReport?.byCategory || []).map((c) => [c.category, c.lines, c.quantity, c.pairs, c.value]))}>
                <Download size={13} /> Excel / CSV
              </Button>
              <Button variant="secondary" size="sm" onClick={() => window.print()}><Printer size={13} /> PDF / Print</Button>
            </>
          ) : (
            <>
              <Button variant="secondary" size="sm" onClick={() => downloadCSV(`${tab}-report.csv`, cfg.columns, rows.map(cfg.toRow))}>
                <Download size={13} /> Excel / CSV
              </Button>
              <Button variant="secondary" size="sm" onClick={() => window.print()}><Printer size={13} /> PDF / Print</Button>
            </>
          )
        }
      />

      <div className="no-print mb-4 flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-colors ${
              tab === t.key ? 'bg-ink text-white' : 'border border-borderc bg-card text-mutedfg hover:bg-muted'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <div className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">{error}</div>}

      {tab === 'stock' ? (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Uppers in stock" value={`${fmtNum(stockReport?.totals.uppers_pairs ?? 0)} prs`} accent="copper" />
            <StatCard label="Ready in stock" value={`${fmtNum(stockReport?.totals.ready_pairs ?? 0)} prs`} accent="teal" />
            <StatCard label="Pairs sold" value={`${fmtNum(stockReport?.totals.pairs_sold ?? 0)} prs`} accent="ink" />
            <StatCard label="Sales value" value={fmtRs(stockReport?.totals.sales_value ?? 0)} accent="copper" />
          </div>

          <Card title="Raw stock by category">
            {!stockReport || stockReport.byCategory.length === 0 ? <Empty>No raw stock yet.</Empty> : (
              <div className="overflow-x-auto">
                <table className="tbl">
                  <thead><tr><th>Category</th><th className="text-right">Lines</th><th className="text-right">Quantity</th><th className="text-right">Pairs</th><th className="text-right">Value</th></tr></thead>
                  <tbody>
                    {stockReport.byCategory.map((c) => (
                      <ClickableRow key={c.category} onOpen={() => setDetail({
                        title: `Raw stock — ${c.category}`,
                        subtitle: 'Totals for this category',
                        fields: [
                          ['Category', c.category], ['Lines', fmtNum(c.lines)],
                          ['Quantity', fmtNum(c.quantity)], ['Pairs', fmtNum(c.pairs)], ['Value', fmtRs(c.value)],
                        ],
                      })}>
                        <td className="font-semibold">{c.category}</td>
                        <td className="num text-right">{fmtNum(c.lines)}</td>
                        <td className="num text-right">{fmtNum(c.quantity)}</td>
                        <td className="num text-right">{fmtNum(c.pairs)}</td>
                        <td className="num text-right font-bold">{fmtRs(c.value)}</td>
                      </ClickableRow>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title="Article details" className="mt-4">
            {!stockReport || stockReport.byArticle.length === 0 ? <Empty>No articles yet.</Empty> : (
              <div className="overflow-x-auto">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Article</th><th className="text-right">Uppers bags</th><th className="text-right">Uppers used</th>
                      <th className="text-right">Uppers in stock</th><th className="text-right">Produced</th>
                      <th className="text-right">Sold</th><th className="text-right">Ready in stock</th><th className="text-right">Sales value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockReport.byArticle.map((a) => (
                      <ClickableRow key={a.code} onOpen={() => setDetail({
                        title: `Article — ${a.code}`,
                        subtitle: a.name,
                        fields: [
                          ['Article', a.code], ['Name', a.name],
                          ['Uppers bags', fmtNum(a.uppers_bags)], ['Uppers used', fmtNum(a.uppers_used)],
                          ['Uppers in stock', fmtNum(a.uppers_pairs)], ['Produced', fmtNum(a.produced)],
                          ['Sold', fmtNum(a.sold)], ['Ready in stock', fmtNum(a.ready)], ['Sales value', fmtRs(a.value)],
                        ],
                      })}>
                        <td>
                          <div className="num font-semibold">{a.code}</div>
                          <div className="text-[11px] text-mutedfg">{a.name}</div>
                        </td>
                        <td className="num text-right">{fmtNum(a.uppers_bags)}</td>
                        <td className="num text-right">{fmtNum(a.uppers_used)}</td>
                        <td className="num text-right">{fmtNum(a.uppers_pairs)}</td>
                        <td className="num text-right">{fmtNum(a.produced)}</td>
                        <td className="num text-right">{fmtNum(a.sold)}</td>
                        <td className="num text-right font-bold">{fmtNum(a.ready)}</td>
                        <td className="num text-right font-semibold">{fmtRs(a.value)}</td>
                      </ClickableRow>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      ) : (
        <>
          <DateRange from={from} setFrom={setFrom} to={to} setTo={setTo} onClear={() => { setFrom(daysAgo(30)); setTo(today()); }} />
          <Card title={TABS.find((t) => t.key === tab).label}>
            {rows.length === 0 ? <Empty>No data in this range.</Empty> : (
              <div className="overflow-x-auto">
                <table className="tbl">
                  <thead>
                    <tr>
                      {cfg.head.map((h, i) => (
                        <th key={h} className={i > 0 && ['Amount', 'Total', 'Received', 'Balance', 'Pairs', 'Qty', 'Total pairs', 'Cartons × pairs'].includes(h) ? 'text-right' : ''}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>{cfg.render(rows, openDetail)}</tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {detail && <RecordDialog {...detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
