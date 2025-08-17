"use client";

import { DateTime } from "luxon";
import { useEffect, useState } from "react";

/**
 * Hook to safely display current time on the client side
 * Prevents hydration mismatches by only showing time after client-side mount
 */
export function useClientTime(
  timezone = "America/Chicago",
  updateInterval = 1000,
) {
  const [currentTime, setCurrentTime] = useState<DateTime | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Mark that we're on the client
    setIsClient(true);

    // Set initial time
    setCurrentTime(DateTime.now().setZone(timezone));

    // Set up interval to update time
    const interval = setInterval(() => {
      setCurrentTime(DateTime.now().setZone(timezone));
    }, updateInterval);

    return () => clearInterval(interval);
  }, [timezone, updateInterval]);

  return {
    currentTime,
    isClient,
    formattedTime: currentTime?.toFormat("HH:mm:ss") ?? "--:--:--",
    formattedDate: currentTime?.toFormat("yyyy-MM-dd") ?? "-------",
  };
}
