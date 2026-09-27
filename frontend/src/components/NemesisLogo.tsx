// Nemesis Graph SVG Logo — dark network graph icon
export function NemesisLogo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Edges */}
      <line x1="20" y1="6" x2="34" y2="22" stroke="#09090b" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="20" y1="6" x2="6" y2="22" stroke="#09090b" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="6" y1="22" x2="20" y2="34" stroke="#09090b" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="34" y1="22" x2="20" y2="34" stroke="#09090b" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="20" y1="6" x2="20" y2="34" stroke="#71717a" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="2 3" />
      <line x1="6" y1="22" x2="34" y2="22" stroke="#71717a" strokeWidth="1.2" strokeLinecap="round" />
      {/* Extra edges for density */}
      <line x1="20" y1="6" x2="6" y2="10" stroke="#a1a1aa" strokeWidth="1" strokeLinecap="round" />
      <line x1="20" y1="6" x2="34" y2="10" stroke="#a1a1aa" strokeWidth="1" strokeLinecap="round" />

      {/* Nodes */}
      <circle cx="20" cy="6" r="4" fill="#09090b" />
      <circle cx="6" cy="22" r="3" fill="white" stroke="#09090b" strokeWidth="2" />
      <circle cx="34" cy="22" r="3" fill="white" stroke="#09090b" strokeWidth="2" />
      <circle cx="20" cy="34" r="4" fill="#09090b" />
      <circle cx="6" cy="10" r="2" fill="#71717a" />
      <circle cx="34" cy="10" r="2" fill="#71717a" />
    </svg>
  );
}
