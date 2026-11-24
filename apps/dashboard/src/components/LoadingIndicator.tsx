import { useEffect, useState } from "react";

export function LoadingIndicator({ message }: { message: string }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const startedAt = performance.now();
    const timer = window.setInterval(() => {
      setSeconds(Math.floor((performance.now() - startedAt) / 1000));
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="loading-indicator" data-list-loading="true">
      <span className="loading-indicator__spinner" aria-hidden="true" />
      <p role="status" aria-live="polite">{message}</p>
      <span className="loading-indicator__elapsed">{seconds} s</span>
    </div>
  );
}
