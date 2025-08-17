"use client";

import { Divider, Layout, Space, Typography } from "@arco-design/web-react";
import { useEffect } from "react";
import { ClearingTable } from "~/components/ClearingTable";
import { MarketControls } from "~/components/MarketControls";
import { OrderEntry } from "~/components/OrderEntry";
import { PriceChart } from "~/components/PriceChart";
import { SummaryStats } from "~/components/SummaryStats";
import { useAppStore } from "~/store";

const { Header, Content } = Layout;
const { Title } = Typography;

export function TradingApp() {
  const { initializeClientDate } = useAppStore();

  // Initialize client date after hydration to prevent hydration mismatch
  useEffect(() => {
    initializeClientDate();
  }, [initializeClientDate]);

  return (
    <Layout className="min-h-screen">
      <Header className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Title heading={3} style={{ margin: 0, color: "#1d2129" }}>
              Virtual Energy Trading Platform
            </Title>
            <div className="text-sm text-gray-500">
              ERCOT Day-Ahead & Real-Time Markets
            </div>
          </div>
        </div>
      </Header>

      <Content className="bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Space direction="vertical" size="large" className="w-full">
            {/* Market Selection Controls */}
            <MarketControls />

            <Divider />

            {/* Order Entry Section */}
            <div>
              <Title heading={4} className="mb-4">
                Order Entry
              </Title>
              <OrderEntry />
            </div>

            <Divider />

            {/* Summary Statistics */}
            <SummaryStats />

            <Divider />

            {/* Price Visualization */}
            <div>
              <Title heading={4} className="mb-4">
                Price Comparison (Day-Ahead vs Real-Time)
              </Title>
              <PriceChart />
            </div>

            <Divider />

            {/* Clearing Results Table */}
            <div>
              <Title heading={4} className="mb-4">
                Clearing Results & P&L
              </Title>
              <ClearingTable />
            </div>
          </Space>
        </div>
      </Content>
    </Layout>
  );
}
