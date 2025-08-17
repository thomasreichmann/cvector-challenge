"use client";

import { Card, Empty } from "@arco-design/web-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAppStore } from "~/store";
import { averageRTToHourly, formatHourForDisplay } from "~/utils/time";

interface ChartDataPoint {
  hour: string;
  hourDisplay: string;
  daPrice: number | null;
  rtPrice: number | null;
  spread: number | null;
}

export function PriceChart() {
  const { marketData } = useAppStore();

  // Process data for chart
  const chartData: ChartDataPoint[] = [];

  // Create map of DA prices by hour
  const daPricesByHour = new Map<string, number>();
  marketData.daHourly.forEach((price) => {
    daPricesByHour.set(
      price.datetime_beginning_ept,
      price.settlement_point_price,
    );
  });

  // Average RT prices to hourly
  const rtHourlyAverages = averageRTToHourly(marketData.rtFiveMin);
  const rtPricesByHour = new Map<string, number>();
  rtHourlyAverages.forEach((avg) => {
    rtPricesByHour.set(avg.hourStart, avg.avgPrice);
  });

  // Combine all unique hours
  const allHours = new Set<string>();
  marketData.daHourly.forEach((price) =>
    allHours.add(price.datetime_beginning_ept),
  );
  rtHourlyAverages.forEach((avg) => allHours.add(avg.hourStart));

  // Build chart data
  Array.from(allHours)
    .sort()
    .forEach((hourStart) => {
      const daPrice = daPricesByHour.get(hourStart) ?? null;
      const rtPrice = rtPricesByHour.get(hourStart) ?? null;
      const spread =
        daPrice !== null && rtPrice !== null ? rtPrice - daPrice : null;

      chartData.push({
        hour: hourStart,
        hourDisplay: formatHourForDisplay(hourStart),
        daPrice,
        rtPrice,
        spread,
      });
    });

  const hasData =
    chartData.length > 0 &&
    chartData.some((d) => d.daPrice !== null || d.rtPrice !== null);

  if (!hasData) {
    return (
      <Card>
        <Empty
          description="No price data available. Fetch market data to view price comparison chart."
          className="py-8"
        />
      </Card>
    );
  }

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{
      color: string;
      name: string;
      value: number | null;
      dataKey: string;
    }>;
    label?: string;
  }) => {
    if (active && payload?.length) {
      return (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
          <p className="font-semibold">{`Hour: ${label}`}</p>
          {payload.map((entry, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {`${entry.name}: ${entry.value !== null ? `$${entry.value.toFixed(2)}` : "N/A"}`}
            </p>
          ))}
          {(() => {
            const daPriceEntry = payload.find((p) => p.dataKey === "daPrice");
            const rtPriceEntry = payload.find((p) => p.dataKey === "rtPrice");

            if (
              daPriceEntry?.value !== null &&
              rtPriceEntry?.value !== null &&
              daPriceEntry?.value !== undefined &&
              rtPriceEntry?.value !== undefined
            ) {
              return (
                <p className="mt-1 text-sm text-gray-600">
                  Spread: $
                  {(rtPriceEntry.value - daPriceEntry.value).toFixed(2)}
                </p>
              );
            }
            return null;
          })()}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 40,
              bottom: 60,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="hourDisplay"
              angle={-45}
              textAnchor="end"
              height={80}
              interval={0}
              fontSize={12}
            />
            <YAxis
              label={{
                value: "Price ($/MWh)",
                angle: -90,
                position: "insideLeft",
              }}
              fontSize={12}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="daPrice"
              stroke="#1890ff"
              strokeWidth={2}
              dot={{ r: 4 }}
              connectNulls={false}
              name="Day-Ahead Price"
            />
            <Line
              type="monotone"
              dataKey="rtPrice"
              stroke="#52c41a"
              strokeWidth={2}
              dot={{ r: 4 }}
              connectNulls={false}
              name="Real-Time Avg Price"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <strong>Day-Ahead:</strong> Hourly settlement prices from the
            day-ahead market
          </div>
          <div>
            <strong>Real-Time:</strong> 5-minute LMPs averaged to hourly
            intervals
          </div>
          <div>
            <strong>Spread:</strong> Real-Time minus Day-Ahead (basis for P&L
            calculation)
          </div>
        </div>
      </div>
    </Card>
  );
}
