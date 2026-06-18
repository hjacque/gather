'use client';

import { useEffect, useState } from 'react';

// Renders the live "time left" until an auction's end, ticking every second.
// Driven purely by the immutable endTime, so it stays accurate regardless of how
// stale the auction's stored current bid is. Shows the largest two units
// (1d 4h / 4h 30m / 30m 12s / 12s) and switches to "Ended" once time runs out.
function formatRemaining(ms: number): string {
  if (ms <= 0) return 'Ended';
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function AuctionCountdown({ endTime }: { endTime: string | Date }) {
  const end = new Date(endTime).getTime();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = end - now;
  // Under an hour is the urgent window: highlight it so closing auctions stand
  // out in a feed already ordered ending-soonest.
  const urgent = remaining > 0 && remaining < 60 * 60 * 1000;

  return (
    <span
      className={
        urgent ? 'text-destructive font-medium tabular-nums' : 'tabular-nums'
      }
      title={new Date(end).toLocaleString()}
    >
      {formatRemaining(remaining)}
    </span>
  );
}
