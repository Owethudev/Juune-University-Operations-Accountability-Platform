export function LoadingState({ label }: { label: string }) {
  return (
    <div className="loading-state" role="status" aria-label={label} aria-busy="true">
      <span className="loading-spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
