export function PageSpinner({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-3 bg-canvas">
      <div
        className="h-10 w-10 animate-spin rounded-full border-4 border-ink-100 border-t-brand-600"
        role="status"
        aria-label={label}
      />
      <p className="text-sm text-ink-500">{label}</p>
    </div>
  );
}
