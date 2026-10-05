import { useEffect, useState } from 'react';
import { api, fmtRs, fmtNum, today, daysAgo } from '../lib/api';
import { downloadCSV } from '../lib/csv';
import { Button, Card, PageHeader, Empty, Badge, StatCard, DateRange } from '../components/ui';
import { Download, Printer } from 'lucide-react';
import { ClickableRow, RecordDialog } from '../components/RecordDialog';

export default function Sales() {
  const [rows, setRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(today());
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/invoices?items=1&from=${from}&to=${to}`).then(setRows).catch((e) => setError(e.message));
    api.get(`/invoices?from=${from}&to=${to}`).then(setHeaders).catch(() => {});
  }, [from, to]);

  const invoiced = headers.reduce((s, r) => s + (Number(r.total) || 0), 0);
  const received = headers.reduce((s, r) => s + (Number(r.received) || 0), 0);
  const outstanding = headers.reduce((s, r) => s + (Number(r.balance) || 0), 0);
  const pairsSold = rows.reduce((s, r) => s + (Number(r.pairs) || 0), 0);
  const value = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);

  return (
    <div>
      <PageHeader
        label="Sales"
        title="All invoice details"
        description="Every item sold, with the cartons, pairs and value — filtered by date."
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => downloadCSV('sales.csv',
              ['Invoice', 'Date', 'Customer', 'Article', 'Cartons', 'Pairs', 'Rate', 'Amount'],
              rows.map((r) => [r.invoice_no, r.date, r.customer_name, `${r.article_code} ${r.article_name}`, r.cartons, r.pairs, r.rate, r.amount]))}>
              <Download size={13} /> Excel / CSV
            </Button>
            <Button variant="secondary" size="sm" onClick={() => window.print()}><Printer size={13} /> PDF / Print</Button>
          </>
        }
      />
      {error && <div className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">{error}</div>}

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Invoiced" value={fmtRs(invoiced)} sub={`${headers.length} invoice(s)`} accent="copper" />
        <StatCard label="Received" value={fmtRs(received)} accent="teal" />
        <StatCard label="Outstanding" value={fmtRs(outstanding)} sub="Balance on invoices" accent="ink" />
        <StatCard label="Pairs sold" value={`${fmtNum(pairsSold)} prs`} sub={fmtRs(value)} accent="copper" />
      </div>

      <DateRange from={from} setFrom={setFrom} to={to} setTo={setTo} onClear={() => { setFrom(daysAgo(30)); setTo(today()); }} />

      <Card title="Sold items">
        {rows.length === 0 ? <Empty>No sales in this date range.</Empty> : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Invoice</th><th>Date</th><th>Customer</th><th>Article</th><th className="text-right">Cartons × pairs</th><th className="text-right">Pairs</th><th className="text-right">Rate</th><th className="text-right">Amount</th></tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <ClickableRow key={i} onOpen={() => setDetail({
                    title: `Sale — ${r.invoice_no}`,
                    subtitle: `${r.date} · ${r.customer_name}`,
                    fields: [
                      ['Invoice', r.invoice_no], ['Date', r.date], ['Customer', r.customer_name],
                      ['Article', `${r.article_code} — ${r.article_name}`],
                      ['Cartons', fmtNum(r.cartons)], ['Pairs per carton', fmtNum(r.pairs_per_carton)],
                      ['Pairs', fmtNum(r.pairs)], ['Rate', fmtRs(r.rate)], ['Amount', fmtRs(r.amount)],
                    ],
                  })}>
                    <td className="num font-semibold">{r.invoice_no}</td>
                    <td className="num text-mutedfg">{r.date}</td>
                    <td>{r.customer_name}</td>
                    <td>
                      <div className="num font-semibold">{r.article_code}</div>
                      <div className="text-[11px] text-mutedfg">{r.article_name}</div>
                    </td>
                    <td className="num text-right">{fmtNum(r.cartons)} × {fmtNum(r.pairs_per_carton)}</td>
                    <td className="num text-right font-semibold">{fmtNum(r.pairs)}</td>
                    <td className="num text-right">{fmtRs(r.rate)}</td>
                    <td className="num text-right font-bold">{fmtRs(r.amount)}</td>
                  </ClickableRow>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {detail && <RecordDialog {...detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
