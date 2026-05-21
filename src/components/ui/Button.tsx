"use client";

import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-semibold transition-all active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none rounded-full",
        variant === "primary" &&
          "bg-cash-green text-black hover:bg-cash-green-dark",
        variant === "secondary" &&
          "bg-cash-gray-2 text-white hover:bg-cash-gray-3",
        variant === "ghost" && "bg-transparent text-cash-muted hover:text-white",
        variant === "danger" && "bg-red-600/20 text-red-400 hover:bg-red-600/30",
        size === "sm" && "h-9 px-4 text-sm",
        size === "md" && "h-12 px-6 text-base",
        size === "lg" && "h-14 px-8 text-lg",
        size === "icon" && "h-12 w-12",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
