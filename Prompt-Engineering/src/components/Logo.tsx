interface LogoProps {
  size?: number
  className?: string
}

export function LogoMark({ size = 32, className }: LogoProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <circle cx="25" cy="25" r="17" fill="#F2A93B" />
      <polygon points="68,4 84,4 36,96 20,96" fill="#E31C5F" />
      <rect x="56" y="58" width="40" height="38" rx="5" fill="#22A67A" />
    </svg>
  )
}

export function Logo({ size = 32, wordmarkClassName = '' }: LogoProps & { wordmarkClassName?: string }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size} />
      <span className={`font-display text-[19px] font-bold tracking-tight text-text ${wordmarkClassName}`}>
        Zawadie <span className="text-accent">PromptClass</span>
      </span>
    </span>
  )
}
