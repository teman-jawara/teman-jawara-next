import type { ComponentProps } from "react";
import { cn } from "@/lib/utils/cn";

export type ButtonVariant = "primary" | "accent" | "outline" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-navy-800 text-white hover:bg-navy-700",
  accent: "bg-gold-500 text-navy-900 hover:bg-gold-400",
  outline: "border border-navy-200 bg-white text-navy-800 hover:bg-navy-50",
  ghost: "text-navy-800 hover:bg-navy-100",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
};

type StyleOptions = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
};

/**
 * Class tombol yang bisa dipakai di <Button> maupun <Link>:
 * <Link href="/login" className={buttonStyles({ variant: "outline" })}>Masuk</Link>
 */
export function buttonStyles({
  variant = "primary",
  size = "md",
  fullWidth,
  className,
}: StyleOptions = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors",
    "disabled:cursor-not-allowed disabled:opacity-50",
    variantStyles[variant],
    sizeStyles[size],
    fullWidth && "w-full",
    className,
  );
}

type ButtonProps = ComponentProps<"button"> & Omit<StyleOptions, "className">;

export function Button({
  variant,
  size,
  fullWidth,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonStyles({ variant, size, fullWidth, className })}
      {...props}
    />
  );
}
