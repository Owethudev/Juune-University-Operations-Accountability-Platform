export function NotificationToast({
  message,
  variant,
  persistent = false,
}: {
  message: string;
  variant: "success" | "error";
  persistent?: boolean;
}) {
  const role = variant === "error" ? "alert" : "status";

  return (
    <div
      className={`feedback-message feedback-${variant}`}
      role={role}
      aria-live={variant === "error" ? "assertive" : "polite"}
      data-persistent={persistent ? "true" : "false"}
    >
      {message}
    </div>
  );
}
