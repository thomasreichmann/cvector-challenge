import { DateTime } from "luxon";
import type { CutoffStatus } from "~/types";

// ERCOT operates in America/Chicago timezone
export const MARKET_TIMEZONE = "America/Chicago";
export const CUTOFF_HOUR = 11; // 11:00 AM market time
export const CUTOFF_MINUTE = 0;

/**
 * Get current time in market timezone
 */
export function getCurrentMarketTime(): DateTime {
  return DateTime.now().setZone(MARKET_TIMEZONE);
}

/**
 * Convert date string to market timezone DateTime
 */
export function toMarketTime(dateStr: string): DateTime {
  return DateTime.fromISO(dateStr).setZone(MARKET_TIMEZONE);
}

/**
 * Get cutoff time for a trading date
 */
export function getCutoffTime(tradingDate: string): DateTime {
  return DateTime.fromISO(tradingDate)
    .setZone(MARKET_TIMEZONE)
    .set({
      hour: CUTOFF_HOUR,
      minute: CUTOFF_MINUTE,
      second: 0,
      millisecond: 0,
    });
}

/**
 * Check if cutoff has passed for a trading date
 */
export function getCutoffStatus(tradingDate: string): CutoffStatus {
  const currentTime = getCurrentMarketTime();
  const cutoffTime = getCutoffTime(tradingDate);
  const isCutoffPassed = currentTime > cutoffTime;

  return {
    isCutoffPassed,
    cutoffTime: cutoffTime.toISO()!,
    currentTime: currentTime.toISO()!,
    timeToString: isCutoffPassed
      ? "Order entry closed"
      : `Order entry open until ${cutoffTime.toFormat("HH:mm")} CT`,
  };
}

/**
 * Generate hour start times for a trading date (24 hours)
 */
export function getHourStartsForDate(tradingDate: string): string[] {
  const startOfDay = DateTime.fromISO(tradingDate)
    .setZone(MARKET_TIMEZONE)
    .startOf("day");

  return Array.from(
    { length: 24 },
    (_, i) => startOfDay.plus({ hours: i }).toISO()!,
  );
}

/**
 * Format hour start for display (e.g., "14:00 CT")
 */
export function formatHourForDisplay(hourStart: string): string {
  return toMarketTime(hourStart).toFormat("HH:mm") + " CT";
}

/**
 * Get today's date in market timezone as YYYY-MM-DD string
 */
export function getTodayInMarketTime(): string {
  return getCurrentMarketTime().toISODate()!;
}

/**
 * Check if a date is today in market timezone
 */
export function isToday(dateStr: string): boolean {
  return dateStr === getTodayInMarketTime();
}

/**
 * Average 5-minute real-time prices to hourly
 * Assumes data is sorted by datetime
 */
export function averageRTToHourly(
  rtData: Array<{
    datetime_beginning_ept: string;
    settlement_point_price: number;
    settlement_point: string;
  }>,
): Array<{ hourStart: string; avgPrice: number; settlement_point: string }> {
  const hourlyGroups = new Map<
    string,
    Array<{ price: number; settlement_point: string }>
  >();

  rtData.forEach((point) => {
    const dt = DateTime.fromISO(point.datetime_beginning_ept).setZone(
      MARKET_TIMEZONE,
    );
    const hourStart = dt.startOf("hour").toISO()!;

    if (!hourlyGroups.has(hourStart)) {
      hourlyGroups.set(hourStart, []);
    }

    hourlyGroups.get(hourStart)!.push({
      price: point.settlement_point_price,
      settlement_point: point.settlement_point,
    });
  });

  const hourlyAverages: Array<{
    hourStart: string;
    avgPrice: number;
    settlement_point: string;
  }> = [];

  hourlyGroups.forEach((points, hourStart) => {
    if (points.length > 0) {
      const avgPrice =
        points.reduce((sum, p) => sum + p.price, 0) / points.length;
      hourlyAverages.push({
        hourStart,
        avgPrice,
        settlement_point: points[0]!.settlement_point, // All should be same settlement point
      });
    }
  });

  return hourlyAverages.sort((a, b) => a.hourStart.localeCompare(b.hourStart));
}
