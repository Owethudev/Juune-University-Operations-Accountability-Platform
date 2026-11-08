export function OfflineBanner() {
  const message = "You’re offline. Reconnect to load the latest information.";

  return (
    <div className="offline-banner" role="status" aria-label={message}>
      {message}
    </div>
  );
}
