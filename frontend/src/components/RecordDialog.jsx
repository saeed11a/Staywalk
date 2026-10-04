import { Button, Dialog } from './ui';

/** Read-only detail view for a record that has no edit form. */
export function RecordDialog({ title, subtitle, fields, onClose, wide = true }) {
  return (
    <Dialog title={title} onClose={onClose} wide={wide}>
      <div className="p-5">
        {subtitle && <div className="mb-3 text-[12px] text-mutedfg">{subtitle}</div>}
        <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
          {fields.map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-3 border-b border-borderc py-2">
              <span className="microlabel">{label}</span>
              <span className="num text-right text-[13px] font-semibold">{value === '' || value == null ? '—' : value}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Dialog>
  );
}

/** Table row that opens its record's detail view when clicked. */
export function ClickableRow({ onOpen, className = '', children, ...rest }) {
  return (
    <tr
      tabIndex={0}
      title="Click to open this record"
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onOpen(); } }}
      className={`cursor-pointer transition-colors hover:bg-muted/60 focus:bg-muted/60 focus:outline-none ${className}`}
      {...rest}
    >
      {children}
    </tr>
  );
}

/** Wrap an in-row action so it does not also open the row's detail view. */
export const rowAction = (fn) => (e) => { e.stopPropagation(); fn(e); };
