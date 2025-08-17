import { DateTime } from "luxon";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  averageRTToHourly,
  formatHourForDisplay,
  getCutoffTime,
  getHourStartsForDate,
} from "../time";

describe("Time Utilities", () => {
  let mockNow: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockNow = vi.spyOn(DateTime, "now");
  });

  afterEach(() => {
    mockNow?.mockRestore();
  });

  it("should determine cutoff time correctly", () => {
    const cutoffTime = getCutoffTime("2024-01-01");
    expect(cutoffTime.hour).toBe(11);
    expect(cutoffTime.minute).toBe(0);
    // The date might shift due to timezone conversion, but hour should be correct
    expect(cutoffTime.toISO()).toContain("11:00:00");
  });

  it("should generate 24 hour starts for a date", () => {
    const hourStarts = getHourStartsForDate("2024-01-01");
    expect(hourStarts).toHaveLength(24);
    expect(hourStarts[0]).toContain("T00:00:00");
    expect(hourStarts[23]).toContain("T23:00:00");
  });

  it("should format hour for display correctly", () => {
    const formatted = formatHourForDisplay("2024-01-01T14:00:00.000-06:00");
    expect(formatted).toBe("14:00 CT");
  });

  it("should average 5-minute RT data to hourly", () => {
    const rtData = [
      {
        datetime_beginning_ept: "2024-01-01T08:00:00.000-06:00",
        settlement_point_price: 50,
        settlement_point: "HB_HOUSTON",
      },
      {
        datetime_beginning_ept: "2024-01-01T08:05:00.000-06:00",
        settlement_point_price: 60,
        settlement_point: "HB_HOUSTON",
      },
      {
        datetime_beginning_ept: "2024-01-01T08:10:00.000-06:00",
        settlement_point_price: 70,
        settlement_point: "HB_HOUSTON",
      },
    ];

    const hourlyAverages = averageRTToHourly(rtData);
    expect(hourlyAverages).toHaveLength(1);
    expect(hourlyAverages[0]?.avgPrice).toBe(60); // (50 + 60 + 70) / 3
  });
});
