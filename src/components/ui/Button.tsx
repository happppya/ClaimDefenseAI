import { cn } from "../../lib/utils";
import { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
};

export function Button({ variant = "primary", size = "md", className, children, ...rest }: Props) {
  const base = "inline-flex items-center justify-center gap-2 font-semibold transition-all rounded-xl disabled:opacity-50 disabled:cursor-not-allowed";
  const variants: Record<string, string> = {
    primary: "bg-accent text-white hover:bg-accentHover shadow-[0_4px_20px_rgba(59,130,246,0.35)] hover:shadow-[0_6px_28px_rgba(59,130,246,0.45)] active:scale-[0.99]",
    secondary: "bg-white text-ink hover:bg-zinc-100",
    ghost: "bg-transparent text-white hover:bg-white/10 border border-white/10",
    outline: "bg-transparent text-white border border-white/15 hover:bg-white/5",
  };
  const sizes: Record<string, string> = {
    sm: "px-3.5 py-2 text-sm",
    md: "px-5 py-3 text-[15px]",
    lg: "px-7 py-4 text-[16px]",
  };
  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...rest}>
      {children}
    </button>
  );
}
