export function ShareButton({ label, onShare, className = "" }: { label: string; onShare: () => void; className?: string }) {
  return (
    <button type="button" className={`secondary share-button ${className}`.trim()} aria-label={label} onClick={onShare}>
      <span aria-hidden="true">↗</span>
      <span>{label}</span>
    </button>
  );
}
