export function ProgressBar({
  value,
  className = '',
}: {
  value: number
  className?: string
}) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div
      className={`h-2 w-full overflow-hidden rounded-full bg-accent-soft ${className}`}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-accent transition-all duration-500 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
