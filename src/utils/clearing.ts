import type { Bid, HourlyClear, MarketPrice } from "~/types";
import { averageRTToHourly } from "./time";

/**
 * Clear bids against day-ahead settlement prices
 */
export function clearBids(
  bids: Bid[],
  daHourlyPrices: MarketPrice[],
  rtFiveMinPrices: MarketPrice[],
): HourlyClear[] {
  // Group bids by hour
  const bidsByHour = new Map<string, Bid[]>();
  bids.forEach((bid) => {
    if (!bidsByHour.has(bid.hourStart)) {
      bidsByHour.set(bid.hourStart, []);
    }
    bidsByHour.get(bid.hourStart)!.push(bid);
  });

  // Convert DA prices to a map by hour for quick lookup
  const daPricesByHour = new Map<string, number>();
  daHourlyPrices.forEach((price) => {
    daPricesByHour.set(
      price.datetime_beginning_ept,
      price.settlement_point_price,
    );
  });

  // Average RT prices to hourly
  const rtHourlyAverages = averageRTToHourly(rtFiveMinPrices);
  const rtPricesByHour = new Map<string, number>();
  rtHourlyAverages.forEach((avg) => {
    rtPricesByHour.set(avg.hourStart, avg.avgPrice);
  });

  // Generate all hours for the trading day (24 hours)
  const hourlyClears: HourlyClear[] = [];

  // Get all unique hours from bids and prices
  const allHours = new Set<string>();
  bidsByHour.forEach((_, hour) => allHours.add(hour));
  daHourlyPrices.forEach((price) => allHours.add(price.datetime_beginning_ept));

  allHours.forEach((hourStart) => {
    const hourBids = bidsByHour.get(hourStart) ?? [];
    const daPrice = daPricesByHour.get(hourStart) ?? null;
    const avgRtPrice = rtPricesByHour.get(hourStart) ?? null;

    // Calculate cleared quantity for this hour
    let clearedQty = 0;

    if (daPrice !== null) {
      hourBids.forEach((bid) => {
        if (shouldBidClear(bid, daPrice)) {
          const qtyContribution = bid.side === "BUY" ? bid.qtyMWh : -bid.qtyMWh;
          clearedQty += qtyContribution;
        }
      });
    }

    // Calculate P&L for this hour
    let pnl = 0;
    if (daPrice !== null && avgRtPrice !== null && clearedQty !== 0) {
      pnl = clearedQty * (avgRtPrice - daPrice);
    }

    hourlyClears.push({
      hourStart,
      daPrice,
      avgRtPrice,
      clearedQty,
      pnl,
    });
  });

  // Sort by hour start
  return hourlyClears.sort((a, b) => a.hourStart.localeCompare(b.hourStart));
}

/**
 * Determine if a bid should clear against DA settlement price
 */
function shouldBidClear(bid: Bid, daPrice: number): boolean {
  switch (bid.side) {
    case "BUY":
      // Buy bid clears if limit price >= DA settlement price
      return bid.price >= daPrice;
    case "SELL":
      // Sell bid clears if limit price <= DA settlement price
      return bid.price <= daPrice;
    default:
      return false;
  }
}

/**
 * Calculate total P&L across all hours
 */
export function calculateTotalPnL(hourlyClears: HourlyClear[]): number {
  return hourlyClears.reduce((total, clear) => total + clear.pnl, 0);
}

/**
 * Calculate total cleared quantity (absolute)
 */
export function calculateTotalClearedQty(hourlyClears: HourlyClear[]): number {
  return hourlyClears.reduce(
    (total, clear) => total + Math.abs(clear.clearedQty),
    0,
  );
}

/**
 * Get clearing summary statistics
 */
export function getClearingSummary(hourlyClears: HourlyClear[]) {
  const totalPnL = calculateTotalPnL(hourlyClears);
  const totalClearedQty = calculateTotalClearedQty(hourlyClears);
  const hoursWithPositions = hourlyClears.filter(
    (c) => c.clearedQty !== 0,
  ).length;
  const hoursWithPnL = hourlyClears.filter((c) => c.pnl !== 0).length;

  const longQty = hourlyClears
    .filter((c) => c.clearedQty > 0)
    .reduce((sum, c) => sum + c.clearedQty, 0);

  const shortQty = hourlyClears
    .filter((c) => c.clearedQty < 0)
    .reduce((sum, c) => sum + Math.abs(c.clearedQty), 0);

  return {
    totalPnL,
    totalClearedQty,
    longQty,
    shortQty,
    hoursWithPositions,
    hoursWithPnL,
    avgPnLPerHour: hoursWithPnL > 0 ? totalPnL / hoursWithPnL : 0,
  };
}
