"use client";

import { Button, Card, Table, Tag, Typography } from "@arco-design/web-react";
import { IconRefresh } from "@arco-design/web-react/icon";
import { useEffect } from "react";
import { useAppStore } from "~/store";
import type { HourlyClear } from "~/types";
import { clearBids } from "~/utils/clearing";
import { formatHourForDisplay } from "~/utils/time";

const { Text } = Typography;

export function ClearingTable() {
  const { bids, marketData, hourlyClears, setHourlyClears } = useAppStore();

  // Auto-calculate clearing when bids or market data changes
  useEffect(() => {
    if (
      bids.length > 0 &&
      (marketData.daHourly.length > 0 || marketData.rtFiveMin.length > 0)
    ) {
      const clears = clearBids(bids, marketData.daHourly, marketData.rtFiveMin);
      setHourlyClears(clears);
    }
  }, [bids, marketData, setHourlyClears]);

  const handleRecalculate = () => {
    if (
      bids.length > 0 &&
      (marketData.daHourly.length > 0 || marketData.rtFiveMin.length > 0)
    ) {
      const clears = clearBids(bids, marketData.daHourly, marketData.rtFiveMin);
      setHourlyClears(clears);
    }
  };

  const columns = [
    {
      title: "Hour",
      dataIndex: "hourStart",
      key: "hourStart",
      render: (hourStart: string) => formatHourForDisplay(hourStart),
      width: 100,
      fixed: "left" as const,
    },
    {
      title: "DA Price ($/MWh)",
      dataIndex: "daPrice",
      key: "daPrice",
      render: (price: number | null) =>
        price !== null ? (
          `$${price.toFixed(2)}`
        ) : (
          <Text type="secondary">N/A</Text>
        ),
      width: 130,
    },
    {
      title: "RT Avg Price ($/MWh)",
      dataIndex: "avgRtPrice",
      key: "avgRtPrice",
      render: (price: number | null) =>
        price !== null ? (
          `$${price.toFixed(2)}`
        ) : (
          <Text type="secondary">N/A</Text>
        ),
      width: 150,
    },
    {
      title: "Spread ($/MWh)",
      dataIndex: "spread",
      key: "spread",
      render: (_: unknown, record: HourlyClear) => {
        if (record.daPrice === null || record.avgRtPrice === null) {
          return <Text type="secondary">N/A</Text>;
        }
        const spread = record.avgRtPrice - record.daPrice;
        return (
          <Text style={{ color: spread >= 0 ? "#00b42a" : "#f53f3f" }}>
            {spread >= 0 ? "+" : ""}${spread.toFixed(2)}
          </Text>
        );
      },
      width: 130,
    },
    {
      title: "Cleared Qty (MWh)",
      dataIndex: "clearedQty",
      key: "clearedQty",
      render: (qty: number) => {
        if (qty === 0) {
          return <Text type="secondary">0.0</Text>;
        }
        return (
          <Text style={{ color: qty > 0 ? "#00b42a" : "#f53f3f" }}>
            {qty > 0 ? "+" : ""}
            {qty.toFixed(1)}
          </Text>
        );
      },
      width: 130,
    },
    {
      title: "Position",
      dataIndex: "clearedQty",
      key: "position",
      render: (qty: number) => {
        if (qty === 0) {
          return <Tag color="gray">FLAT</Tag>;
        }
        return (
          <Tag color={qty > 0 ? "green" : "red"}>
            {qty > 0 ? "LONG" : "SHORT"}
          </Tag>
        );
      },
      width: 100,
    },
    {
      title: "P&L ($)",
      dataIndex: "pnl",
      key: "pnl",
      render: (pnl: number) => {
        if (pnl === 0) {
          return <Text type="secondary">$0.00</Text>;
        }
        return (
          <Text
            style={{
              color: pnl >= 0 ? "#00b42a" : "#f53f3f",
              fontWeight: "bold",
            }}
          >
            {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
          </Text>
        );
      },
      width: 120,
      fixed: "right" as const,
    },
  ];

  const filteredClears = hourlyClears.filter(
    (clear) =>
      clear.daPrice !== null ||
      clear.avgRtPrice !== null ||
      clear.clearedQty !== 0,
  );

  const totalPnL = hourlyClears.reduce((sum, clear) => sum + clear.pnl, 0);

  return (
    <Card
      title="Hourly Clearing Results"
      extra={
        <Button
          type="text"
          icon={<IconRefresh />}
          onClick={handleRecalculate}
          size="small"
        >
          Recalculate
        </Button>
      }
    >
      {filteredClears.length === 0 ? (
        <div className="py-8 text-center">
          <Text type="secondary">
            No clearing data available. Add bids and fetch market data to see
            clearing results.
          </Text>
        </div>
      ) : (
        <>
          <Table
            data={filteredClears}
            columns={columns}
            rowKey="hourStart"
            pagination={false}
            scroll={{ x: 900, y: 400 }}
            summary={(_data) => (
              <Table.Summary.Row>
                <Table.Summary.Cell colSpan={6}>
                  <Text className="font-semibold">Total P&L:</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell>
                  <Text
                    className="text-lg font-bold"
                    style={{ color: totalPnL >= 0 ? "#00b42a" : "#f53f3f" }}
                  >
                    {totalPnL >= 0 ? "+" : ""}${totalPnL.toFixed(2)}
                  </Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            )}
          />

          <div className="mt-4 text-sm text-gray-600">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <strong>Clearing Logic:</strong>
                <ul className="mt-1 list-inside list-disc">
                  <li>BUY bids clear when limit price ≥ DA settlement</li>
                  <li>SELL bids clear when limit price ≤ DA settlement</li>
                </ul>
              </div>
              <div>
                <strong>P&L Calculation:</strong>
                <ul className="mt-1 list-inside list-disc">
                  <li>P&L = Cleared Qty × (RT Avg - DA Price)</li>
                  <li>Positive = profit, Negative = loss</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
