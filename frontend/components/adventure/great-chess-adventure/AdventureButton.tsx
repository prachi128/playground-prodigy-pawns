import { type ButtonHTMLAttributes } from "react"
import { clsx } from "clsx"

type Variant = "default" | "ghost"
type Size = "default" | "sm" | "lg"

interface AdventureButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const variantClasses: Record<Variant, string> = {
  default:
    "bg-[oklch(0.75_0.18_85)] text-[oklch(0.15_0.02_85)] hover:bg-[oklch(0.75_0.18_85)]/90",
  ghost: "bg-transparent text-[oklch(0.95_0.01_85)]/80 hover:bg-white/10 hover:text-[oklch(0.95_0.01_85)]",
}

const sizeClasses: Record<Size, string> = {
  default: "h-9 px-4 py-2 text-sm",
  sm: "h-8 px-3 text-sm",
  lg: "h-14 px-6 text-lg",
}

export function AdventureButton({
  className,
  variant = "default",
  size = "default",
  ...props
}: AdventureButtonProps) {
  return (
    <button
      type="button"
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  )
}
