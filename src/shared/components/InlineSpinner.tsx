export function InlineSpinner({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-ink-200 bg-surface py-16">
      <div
        className="h-8 w-8 animate-spin rounded-full border-4 border-ink-100 border-t-brand-600"
        role="status"
        aria-label={label}
      />
      <p className="text-sm text-ink-500">{label}</p>
    </div>
  );
}
