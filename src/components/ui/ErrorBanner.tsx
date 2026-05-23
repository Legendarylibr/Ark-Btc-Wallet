import { cn } from "@/lib/utils";

type ErrorBannerProps = {
  message: string | null | undefined;
  className?: string;
  /** Compact inline form errors vs full-width dashboard banner */
  variant?: "inline" | "banner";
};

export function ErrorBanner({
  message,
  className,
  variant = "inline",
}: ErrorBannerProps) {
  if (!message) return null;

  return (
    <p
      role="alert"
      className={cn(
        "text-red-400",
        variant === "inline" && "text-sm",
        variant === "banner" &&
          "mx-5 mt-2 px-3 py-2 rounded-xl bg-red-500/10 text-xs text-center",
        className,
      )}
    >
      {message}
    </p>
  );
}
