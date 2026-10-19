export function Brand({ onClick }: { onClick: () => void }) {
  return (
    <button className="wordmark brand" onClick={onClick} aria-label="IDReady home">
      <svg className="brand-emblem" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <rect x="5" y="4" width="34" height="40" rx="7" fill="currentColor" />
        <path d="M12 16v-5h5M27 11h5v5M12 31v6h5" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <circle cx="22" cy="20" r="5" fill="white" />
        <path d="M14 32c0-5 3-8 8-8s8 3 8 8" fill="white" />
        <rect x="28" y="29" width="18" height="16" rx="5" fill="#a7f3d0" stroke="white" strokeWidth="2" />
        <path d="m33 37 3 3 5-6" stroke="#145b46" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="brand-lockup">
        <span className="brand-name"><span className="brand-id">ID</span>Ready<span className="brand-period">.</span></span>
        <span className="brand-caption">YOUR PHOTO. PRINT READY.</span>
      </span>
    </button>
  )
}
