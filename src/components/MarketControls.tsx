"use client";

import {
  Button,
  Card,
  DatePicker,
  Message,
  Select,
  Space,
  Tag,
} from "@arco-design/web-react";
import { IconRefresh } from "@arco-design/web-react/icon";
import { DateTime } from "luxon";
import { useEffect, useState } from "react";
import { useClientTime } from "~/hooks/useClientTime";
import { useAppStore } from "~/store";
import {
  ERCOT_SETTLEMENT_POINTS,
  type GridStatusResponse,
  type MarketPrice,
} from "~/types";
import { getCutoffStatus } from "~/utils/time";

export function MarketControls() {
  const {
    marketSelection,
    setMarketSelection,
    setLoading,
    setError,
    setMarketData,
    setHourlyClears,
    isLoading,
    error,
  } = useAppStore();

  const { formattedTime, isClient } = useClientTime("America/Chicago", 1000);

  const [cutoffStatus, setCutoffStatus] = useState(
    getCutoffStatus(marketSelection.tradingDate),
  );

  // Update cutoff status when trading date changes
  useEffect(() => {
    setCutoffStatus(getCutoffStatus(marketSelection.tradingDate));
  }, [marketSelection.tradingDate]);

  // Update cutoff status every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCutoffStatus(getCutoffStatus(marketSelection.tradingDate));
    }, 60000);

    return () => clearInterval(interval);
  }, [marketSelection.tradingDate]);

  const handleDateChange = (dateString: string) => {
    if (dateString) {
      setMarketSelection({ tradingDate: dateString });
      // Clear existing data when date changes
      setMarketData({ daHourly: [], rtFiveMin: [] });
      setHourlyClears([]);
      setError(null);
    }
  };

  const handleSettlementPointChange = (value: string) => {
    setMarketSelection({ settlementPoint: value });
    // Clear existing data when settlement point changes
    setMarketData({ daHourly: [], rtFiveMin: [] });
    setHourlyClears([]);
    setError(null);
  };

  const fetchMarketData = async () => {
    setLoading(true);
    setError(null);

    try {
      const startTime = marketSelection.tradingDate + "T00:00:00";
      const endTime =
        DateTime.fromISO(marketSelection.tradingDate)
          .plus({ days: 1 })
          .toISODate() + "T00:00:00";

      // Try different parameter approaches to get data
      const daParams = new URLSearchParams({
        start_time: startTime,
        end_time: endTime,
        timezone: "US/Central",
        location: marketSelection.settlementPoint,
        limit: "100", // Reasonable limit for daily data (24 hours + buffer)
      });

      console.log("Fetching DA data with params:", {
        start_time: startTime,
        end_time: endTime,
        timezone: "US/Central",
        location: marketSelection.settlementPoint,
        url: `/api/grid/ercot_spp_day_ahead_hourly?${daParams}`,
      });

      // Fetch Day-Ahead hourly data (SPP)
      const daResponse = await fetch(
        `/api/grid/ercot_spp_day_ahead_hourly?${daParams}`,
      );

      if (!daResponse.ok) {
        throw new Error(`Failed to fetch DA data: ${daResponse.statusText}`);
      }

      const daData =
        (await daResponse.json()) as GridStatusResponse<MarketPrice>;

      console.log("DA data received:", {
        dataLength: daData.data?.length || 0,
        sampleData: daData.data?.slice(0, 2) || [],
        total: daData.total,
      });

      // If no data, log for diagnostic purposes
      if (!daData.data || daData.data.length === 0) {
        console.log("No DA data found, checking RT data results...");
      }

      console.log("Fetching RT data with params:", {
        start_time: startTime,
        end_time: endTime,
        timezone: "US/Central",
        location: marketSelection.settlementPoint,
      });

      // Fetch Real-Time 5-minute data (SPP)
      const rtParams = new URLSearchParams({
        start_time: startTime,
        end_time: endTime,
        timezone: "US/Central",
        location: marketSelection.settlementPoint,
        limit: "500", // Higher limit for 5-min data (288 intervals per day + buffer)
      });

      const rtResponse = await fetch(
        `/api/grid/ercot_spp_real_time_5_minute?${rtParams}`,
      );

      if (!rtResponse.ok) {
        throw new Error(`Failed to fetch RT data: ${rtResponse.statusText}`);
      }

      const rtData =
        (await rtResponse.json()) as GridStatusResponse<MarketPrice>;

      console.log("RT data received:", {
        dataLength: rtData.data?.length || 0,
        sampleData: rtData.data?.slice(0, 2) || [],
        total: rtData.total,
      });

      // Update store with fetched data
      setMarketData({
        daHourly: daData.data ?? [],
        rtFiveMin: rtData.data ?? [],
      });

      // Check if using mock data and inform user
      const usingMockData =
        daResponse.headers.get("X-Data-Source")?.includes("mock") ??
        rtResponse.headers.get("X-Data-Source")?.includes("mock");

      const totalDataPoints =
        (daData.data?.length || 0) + (rtData.data?.length || 0);

      if (usingMockData) {
        Message.info(
          "Using demonstration data - GridStatus API integration pending",
        );
      } else if (totalDataPoints === 0) {
        console.log("Diagnostic info for empty data:", {
          selectedDate: marketSelection.tradingDate,
          selectedPoint: marketSelection.settlementPoint,
          daDataLength: daData.data?.length || 0,
          rtDataLength: rtData.data?.length || 0,
          daParams: daParams.toString(),
          rtParams: rtParams.toString(),
        });

        Message.warning({
          content: (
            <div>
              <div>
                No data found for {marketSelection.tradingDate} at{" "}
                {marketSelection.settlementPoint}.
              </div>
              <div className="mt-2 text-sm">
                Suggestions:
                <ul className="mt-1 list-disc pl-4">
                  <li>Try a different date (data availability varies)</li>
                  <li>
                    Try a different settlement point (Houston Hub, North Hub,
                    etc.)
                  </li>
                  <li>Check browser console for detailed API response</li>
                </ul>
              </div>
            </div>
          ),
          duration: 8000,
        });
      } else {
        Message.success(
          `Market data fetched successfully from GridStatus (${totalDataPoints} data points)`,
        );
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch market data";
      setError(errorMessage);
      Message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <Space direction="vertical" size="medium" className="w-full">
        {/* Market Selection Controls */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              ISO Market
            </label>
            <Select
              value="ercot"
              disabled
              className="w-full"
              placeholder="Select ISO"
            >
              <Select.Option value="ercot">ERCOT</Select.Option>
            </Select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Settlement Point
            </label>
            <Select
              value={marketSelection.settlementPoint}
              onChange={handleSettlementPointChange}
              className="w-full"
              placeholder="Select settlement point"
            >
              {ERCOT_SETTLEMENT_POINTS.map((sp) => (
                <Select.Option key={sp.value} value={sp.value}>
                  {sp.label}
                </Select.Option>
              ))}
            </Select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Trading Date
            </label>
            <DatePicker
              value={marketSelection.tradingDate}
              onChange={handleDateChange}
              className="w-full"
              format="YYYY-MM-DD"
              disabledDate={(date) => {
                // Disable future dates beyond tomorrow
                // Use a static date calculation to avoid hydration issues
                if (!date || !(date instanceof Date)) return false;
                const dateToCheck = DateTime.fromJSDate(date);
                const today = DateTime.fromISO(
                  new Date().toISOString().split("T")[0] ?? "",
                );
                const tomorrow = today.plus({ days: 1 });
                return dateToCheck > tomorrow;
              }}
            />
          </div>

          <div className="flex items-end">
            <Button
              type="primary"
              icon={<IconRefresh />}
              onClick={fetchMarketData}
              loading={isLoading}
              className="w-full"
            >
              Run Simulation
            </Button>
          </div>
        </div>

        {/* Status Information */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">
              Order Entry Status:
            </span>
            <Tag
              color={cutoffStatus.isCutoffPassed ? "red" : "green"}
              className="ml-1"
            >
              {cutoffStatus.timeToString}
            </Tag>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">
              Market Time:
            </span>
            <span className="text-sm text-gray-600">
              {isClient ? formattedTime : "--:--:--"} CT
            </span>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-4">
            <div className="flex">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          </div>
        )}
      </Space>
    </Card>
  );
}
