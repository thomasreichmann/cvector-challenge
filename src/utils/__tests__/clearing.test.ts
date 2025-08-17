import { describe, expect, it } from "vitest";
import type { Bid, MarketPrice } from "~/types";
import { calculateTotalPnL, clearBids, getClearingSummary } from "../clearing";

describe("Clearing Logic", () => {
  const mockBids: Bid[] = [
    {
      id: "1",
      hourStart: "2024-01-01T08:00:00.000-06:00",
      side: "BUY",
      price: 60, // Will clear since 60 >= 55 DA price
      qtyMWh: 100,
    },
    {
      id: "2",
      hourStart: "2024-01-01T08:00:00.000-06:00",
      side: "SELL",
      price: 50, // Will clear since 50 <= 55 DA price
      qtyMWh: 50,
    },
    {
      id: "3",
      hourStart: "2024-01-01T09:00:00.000-06:00",
      side: "BUY",
      price: 40, // Will clear since 40 >= 35 DA price
      qtyMWh: 75,
    },
  ];

  const mockDAPrices: MarketPrice[] = [
    {
      datetime_beginning_ept: "2024-01-01T08:00:00.000-06:00",
      datetime_beginning_utc: "2024-01-01T14:00:00.000Z",
      settlement_point: "HB_HOUSTON",
      settlement_point_price: 55,
    },
    {
      datetime_beginning_ept: "2024-01-01T09:00:00.000-06:00",
      datetime_beginning_utc: "2024-01-01T15:00:00.000Z",
      settlement_point: "HB_HOUSTON",
      settlement_point_price: 35,
    },
  ];

  const mockRTPrices: MarketPrice[] = [
    {
      datetime_beginning_ept: "2024-01-01T08:00:00.000-06:00",
      datetime_beginning_utc: "2024-01-01T14:00:00.000Z",
      settlement_point: "HB_HOUSTON",
      settlement_point_price: 60,
    },
    {
      datetime_beginning_ept: "2024-01-01T09:00:00.000-06:00",
      datetime_beginning_utc: "2024-01-01T15:00:00.000Z",
      settlement_point: "HB_HOUSTON",
      settlement_point_price: 40,
    },
  ];

  it("should clear BUY bids when limit >= DA price", () => {
    const results = clearBids(mockBids, mockDAPrices, mockRTPrices);

    // Hour 8: BUY at 60 clears (60 >= 55 DA), SELL at 50 clears (50 <= 55 DA)
    // Net: +100 (BUY) - 50 (SELL) = +50 MWh
    const hour8 = results.find(
      (r) => r.hourStart === "2024-01-01T08:00:00.000-06:00",
    );
    expect(hour8?.clearedQty).toBe(50);

    // Hour 9: BUY at 40 clears (40 >= 35 DA)
    const hour9 = results.find(
      (r) => r.hourStart === "2024-01-01T09:00:00.000-06:00",
    );
    expect(hour9?.clearedQty).toBe(75); // BUY bid clears
  });

  it("should calculate P&L correctly", () => {
    const results = clearBids(mockBids, mockDAPrices, mockRTPrices);

    // Hour 8: cleared qty = 50, DA = 55, RT = 60, P&L = 50 * (60 - 55) = 250
    const hour8 = results.find(
      (r) => r.hourStart === "2024-01-01T08:00:00.000-06:00",
    );
    expect(hour8?.pnl).toBe(250);

    // Hour 9: cleared qty = 75, DA = 35, RT = 40, P&L = 75 * (40 - 35) = 375
    const hour9 = results.find(
      (r) => r.hourStart === "2024-01-01T09:00:00.000-06:00",
    );
    expect(hour9?.pnl).toBe(375);
  });

  it("should calculate total P&L", () => {
    const results = clearBids(mockBids, mockDAPrices, mockRTPrices);
    const totalPnL = calculateTotalPnL(results);

    // 250 + 375 = 625
    expect(totalPnL).toBe(625);
  });

  it("should provide correct clearing summary", () => {
    const results = clearBids(mockBids, mockDAPrices, mockRTPrices);
    const summary = getClearingSummary(results);

    expect(summary.totalPnL).toBe(625);
    expect(summary.longQty).toBe(125); // 50 + 75
    expect(summary.shortQty).toBe(0); // No short positions in this scenario
    expect(summary.hoursWithPositions).toBe(2);
  });

  it("should handle missing data gracefully", () => {
    const results = clearBids(mockBids, [], []); // No market data

    results.forEach((result) => {
      expect(result.clearedQty).toBe(0);
      expect(result.pnl).toBe(0);
      expect(result.daPrice).toBeNull();
      expect(result.avgRtPrice).toBeNull();
    });
  });
});
