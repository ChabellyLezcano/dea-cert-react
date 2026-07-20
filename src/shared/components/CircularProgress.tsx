interface CircularProgressProps {
  /** 0-100. Values outside that range are clamped. */
  percentage: number;
  size?: number;
  strokeWidth?: number;
  /** Tailwind text-* class controlling the progress arc's color via
   * currentColor (so it can be swapped for pass/fail without a separate
   * color prop system). */
  colorClassName?: string;
  /** Tailwind text-* class for the background track. */
  trackClassName?: string;
  /** Optional small caption shown under the percentage, e.g. "32/45". */
  label?: string;
}

/** SVG ring that fills clockwise from the top as `percentage` increases,
 * with the percentage (and an optional caption) centered inside it. Pure
 * presentational component -- no i18n or domain knowledge, so it's reusable
 * anywhere a circular progress indicator is needed. */
export function CircularProgress({
  percentage,
  size = 96,
  strokeWidth = 8,
  colorClassName = 'text-brand-500',
  trackClassName = 'text-ink-100',
  label,
}: CircularProgressProps) {
  const clamped = Math.max(0, Math.min(100, percentage));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  const center = size / 2;

  return (
    <div
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${Math.round(clamped)}%`}
    >
      {/* Rotated so the arc starts at 12 o'clock instead of the SVG default (3 o'clock). */}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className={trackClassName}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={colorClassName}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-ink-800">{Math.round(clamped)}%</span>
        {label && <span className="text-[10px] text-ink-400">{label}</span>}
      </div>
    </div>
  );
}
