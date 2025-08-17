"use client";

import { Card, Grid, Statistic, Typography } from "@arco-design/web-react";
import { useAppStore } from "~/store";
import { getClearingSummary } from "~/utils/clearing";

const { Row, Col } = Grid;

const { Text } = Typography;

export function SummaryStats() {
  const { hourlyClears } = useAppStore();

  const summary = getClearingSummary(hourlyClears);

  const formatCurrency = (value: number) => {
    return value >= 0
      ? `$${value.toFixed(2)}`
      : `-$${Math.abs(value).toFixed(2)}`;
  };

  const formatMWh = (value: number) => {
    return `${value.toFixed(1)} MWh`;
  };

  return (
    <Card title="Trading Summary">
      <Row gutter={24}>
        <Col span={6}>
          <Statistic
            title="Total P&L"
            value={formatCurrency(summary.totalPnL)}
            style={{
              color: summary.totalPnL >= 0 ? "#00b42a" : "#f53f3f",
              fontWeight: "bold",
            }}
          />
        </Col>

        <Col span={6}>
          <Statistic
            title="Total Cleared Volume"
            value={formatMWh(summary.totalClearedQty)}
            style={{ color: "#1d2129" }}
          />
        </Col>

        <Col span={6}>
          <Statistic
            title="Long Position"
            value={formatMWh(summary.longQty)}
            style={{ color: "#00b42a" }}
          />
        </Col>

        <Col span={6}>
          <Statistic
            title="Short Position"
            value={formatMWh(summary.shortQty)}
            style={{ color: "#f53f3f" }}
          />
        </Col>
      </Row>

      <Row gutter={24} className="mt-6">
        <Col span={6}>
          <Statistic
            title="Hours with Positions"
            value={summary.hoursWithPositions}
            suffix="/ 24"
            style={{ color: "#1d2129" }}
          />
        </Col>

        <Col span={6}>
          <Statistic
            title="Hours with P&L"
            value={summary.hoursWithPnL}
            suffix="/ 24"
            style={{ color: "#1d2129" }}
          />
        </Col>

        <Col span={6}>
          <Statistic
            title="Avg P&L per Active Hour"
            value={formatCurrency(summary.avgPnLPerHour)}
            style={{
              color: summary.avgPnLPerHour >= 0 ? "#00b42a" : "#f53f3f",
            }}
          />
        </Col>

        <Col span={6}>
          <div className="text-center">
            <div className="mb-1 text-xs text-gray-500">Net Position</div>
            <Text
              className="text-lg font-semibold"
              style={{
                color:
                  summary.longQty - summary.shortQty >= 0
                    ? "#00b42a"
                    : "#f53f3f",
              }}
            >
              {summary.longQty - summary.shortQty >= 0 ? "+" : ""}
              {(summary.longQty - summary.shortQty).toFixed(1)} MWh
            </Text>
          </div>
        </Col>
      </Row>

      {hourlyClears.length === 0 && (
        <div className="mt-6 rounded-md bg-gray-50 p-4 text-center">
          <Text type="secondary">
            No clearing data available. Fetch market data and ensure you have
            bids entered to see summary statistics.
          </Text>
        </div>
      )}
    </Card>
  );
}
