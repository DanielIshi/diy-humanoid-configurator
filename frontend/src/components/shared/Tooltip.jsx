function Tooltip({ label }) {
  return (
    <span className="inline-flex items-center align-middle ml-1 cursor-help" title={label}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="opacity-60">
        <circle cx="12" cy="12" r="10" strokeWidth="1.5"/>
        <path d="M12 8v1m0 3v4" strokeWidth="1.5"/>
      </svg>
    </span>
  );
}

export default Tooltip;