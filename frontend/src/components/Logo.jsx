// Brand lockup used in the sidebar and login screen — HIKER+ Shoes logo mark.
export default function Logo({ className = '' }) {
  return (
    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white p-1 shadow-sm ${className}`}>
      <img src="/hiker-logo.png" alt="HIKER+ Shoes Factory" className="h-full w-full object-contain" />
    </div>
  );
}
