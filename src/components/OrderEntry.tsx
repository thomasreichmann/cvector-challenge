"use client";

import {
  Button,
  Card,
  Form,
  InputNumber,
  Message,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "@arco-design/web-react";
import { IconDelete, IconPlus } from "@arco-design/web-react/icon";
import { useState } from "react";
import { useAppStore } from "~/store";
import type { BidSide } from "~/types";
import {
  formatHourForDisplay,
  getCutoffStatus,
  getHourStartsForDate,
} from "~/utils/time";

const { Text } = Typography;

interface BidFormData {
  hourStart: string;
  side: BidSide;
  price: number;
  qtyMWh: number;
}

export function OrderEntry() {
  const { marketSelection, bids, addBid, removeBid, getBidsForHour, error } =
    useAppStore();

  const [form] = Form.useForm<BidFormData>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cutoffStatus = getCutoffStatus(marketSelection.tradingDate);
  const isOrderEntryDisabled = cutoffStatus.isCutoffPassed;

  const hourOptions = getHourStartsForDate(marketSelection.tradingDate).map(
    (hourStart) => ({
      value: hourStart,
      label: formatHourForDisplay(hourStart),
    }),
  );

  const handleSubmit = async (values: BidFormData) => {
    setIsSubmitting(true);

    try {
      // Validate constraints
      const existingBids = getBidsForHour(values.hourStart);
      if (existingBids.length >= 10) {
        Message.error("Maximum 10 bids per hour allowed");
        return;
      }

      addBid({
        hourStart: values.hourStart,
        side: values.side,
        price: values.price,
        qtyMWh: values.qtyMWh,
      });

      Message.success("Bid added successfully");
      form.resetFields();
    } catch {
      Message.error("Failed to add bid");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveBid = (bidId: string) => {
    removeBid(bidId);
    Message.success("Bid removed");
  };

  const getBidCountForHour = (hourStart: string): number => {
    return getBidsForHour(hourStart).length;
  };

  const columns = [
    {
      title: "Hour",
      dataIndex: "hourStart",
      key: "hourStart",
      render: (hourStart: string) => formatHourForDisplay(hourStart),
      width: 100,
    },
    {
      title: "Side",
      dataIndex: "side",
      key: "side",
      render: (side: BidSide) => (
        <Tag color={side === "BUY" ? "green" : "red"}>{side}</Tag>
      ),
      width: 80,
    },
    {
      title: "Price ($/MWh)",
      dataIndex: "price",
      key: "price",
      render: (price: number) => `$${price.toFixed(2)}`,
      width: 120,
    },
    {
      title: "Quantity (MWh)",
      dataIndex: "qtyMWh",
      key: "qtyMWh",
      render: (qty: number) => qty.toFixed(1),
      width: 120,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: unknown, record: { id: string }) => (
        <Popconfirm
          title="Are you sure you want to remove this bid?"
          onOk={() => handleRemoveBid(record.id)}
          disabled={isOrderEntryDisabled}
        >
          <Button
            type="text"
            icon={<IconDelete />}
            status="danger"
            size="small"
            disabled={isOrderEntryDisabled}
          >
            Remove
          </Button>
        </Popconfirm>
      ),
      width: 100,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Order Entry Form */}
      <Card title="Add New Bid" className="h-fit">
        {isOrderEntryDisabled && (
          <div className="mb-4 rounded-md border border-yellow-200 bg-yellow-50 p-3">
            <Text type="warning">
              Order entry is closed. Cutoff time (11:00 CT) has passed for{" "}
              {marketSelection.tradingDate}.
            </Text>
          </div>
        )}

        <Form
          form={form}
          layout="vertical"
          onSubmit={handleSubmit}
          disabled={isOrderEntryDisabled}
        >
          <Form.Item
            field="hourStart"
            label="Hour"
            rules={[{ required: true, message: "Please select an hour" }]}
          >
            <Select
              placeholder="Select hour"
              showSearch
              filterOption={(inputValue, option) => {
                const children = (option as { children?: unknown })?.children;
                return children?.toString().includes(inputValue) ?? false;
              }}
            >
              {hourOptions.map((option) => {
                const bidCount = getBidCountForHour(option.value);
                const isHourFull = bidCount >= 10;

                return (
                  <Select.Option
                    key={option.value}
                    value={option.value}
                    disabled={isHourFull}
                  >
                    <div className="flex items-center justify-between">
                      <span>{option.label}</span>
                      <span className="text-xs text-gray-500">
                        {bidCount}/10 bids
                        {isHourFull && (
                          <Tag color="red" size="small" className="ml-1">
                            FULL
                          </Tag>
                        )}
                      </span>
                    </div>
                  </Select.Option>
                );
              })}
            </Select>
          </Form.Item>

          <Form.Item
            field="side"
            label="Side"
            rules={[{ required: true, message: "Please select buy or sell" }]}
          >
            <Select placeholder="Select side">
              <Select.Option value="BUY">
                <Tag color="green">BUY</Tag>
              </Select.Option>
              <Select.Option value="SELL">
                <Tag color="red">SELL</Tag>
              </Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            field="price"
            label="Price ($/MWh)"
            rules={[
              { required: true, message: "Please enter price" },
              {
                type: "number",
                min: 0.01,
                message: "Price must be positive",
              },
            ]}
          >
            <InputNumber
              placeholder="Enter price"
              precision={2}
              min={0.01}
              max={9999.99}
              className="w-full"
            />
          </Form.Item>

          <Form.Item
            field="qtyMWh"
            label="Quantity (MWh)"
            rules={[
              { required: true, message: "Please enter quantity" },
              {
                type: "number",
                min: 0.1,
                message: "Quantity must be positive",
              },
            ]}
          >
            <InputNumber
              placeholder="Enter quantity"
              precision={1}
              min={0.1}
              max={9999.9}
              className="w-full"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              icon={<IconPlus />}
              loading={isSubmitting}
              className="w-full"
              disabled={isOrderEntryDisabled}
            >
              Add Bid
            </Button>
          </Form.Item>
        </Form>

        {error && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3">
            <Text type="error">{error}</Text>
          </div>
        )}
      </Card>

      {/* Current Bids Table */}
      <Card title={`Current Bids (${bids.length})`}>
        <Table
          data={bids}
          columns={columns}
          rowKey="id"
          pagination={false}
          scroll={{ y: 400 }}
          noDataElement={
            <div className="py-8 text-center text-gray-500">
              No bids entered yet. Add your first bid using the form.
            </div>
          }
        />

        {bids.length > 0 && (
          <div className="mt-4 text-sm text-gray-600">
            <Space>
              <span>
                Total Bids: <strong>{bids.length}</strong>
              </span>
              <span>
                Buy Orders:{" "}
                <strong>{bids.filter((b) => b.side === "BUY").length}</strong>
              </span>
              <span>
                Sell Orders:{" "}
                <strong>{bids.filter((b) => b.side === "SELL").length}</strong>
              </span>
            </Space>
          </div>
        )}
      </Card>
    </div>
  );
}
