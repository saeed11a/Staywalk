// Brand mark used in the sidebar and login screen — stylised wordmark matching the HIKER+ Shoes box design.
export default function Logo({ className = '', size = 16 }) {
  return (
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink text-white ${className}`}>
      <span className="font-heading font-black leading-none" style={{ fontSize: size }}>
        H<sup style={{ fontSize: size * 0.56 }}>+</sup>
      </span>
    </div>
  );
}
