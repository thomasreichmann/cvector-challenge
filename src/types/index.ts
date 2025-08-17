import { z } from "zod";

// Market Selection Types
export const MarketSelectionSchema = z.object({
  iso: z.literal("ercot"), // Start with ERCOT only
  settlementPoint: z.string(),
  tradingDate: z.string(), // YYYY-MM-DD format
});

export type MarketSelection = z.infer<typeof MarketSelectionSchema>;

// Bid Types
export const BidSideSchema = z.enum(["BUY", "SELL"]);
export type BidSide = z.infer<typeof BidSideSchema>;

export const BidSchema = z.object({
  id: z.string(),
  hourStart: z.string(), // ISO string, market time, top of hour
  side: BidSideSchema,
  price: z.number().positive(), // USD/MWh
  qtyMWh: z.number().positive(), // MWh
});

export type Bid = z.infer<typeof BidSchema>;

// Market Data Types
export const MarketPriceSchema = z.object({
  datetime_beginning_ept: z.string(),
  datetime_beginning_utc: z.string(),
  settlement_point: z.string(),
  settlement_point_price: z.number(),
});

export type MarketPrice = z.infer<typeof MarketPriceSchema>;

// GridStatus API raw response data types (actual API response structure)
export const GridStatusPriceDataSchema = z.object({
  interval_start_local: z.string(),
  interval_start_utc: z.string(),
  interval_end_local: z.string(),
  interval_end_utc: z.string(),
  location: z.string(),
  location_type: z.string(),
  market: z.string(),
  spp: z.number(),
});

export type GridStatusPriceData = z.infer<typeof GridStatusPriceDataSchema>;

// Partial type for API responses that might have missing fields
export type PartialGridStatusPriceData = Partial<GridStatusPriceData>;

// Hourly Clear Types
export const HourlyClearSchema = z.object({
  hourStart: z.string(),
  daPrice: z.number().nullable(),
  avgRtPrice: z.number().nullable(),
  clearedQty: z.number(), // signed: +long, -short
  pnl: z.number(),
});

export type HourlyClear = z.infer<typeof HourlyClearSchema>;

// ERCOT Settlement Points
export const ERCOT_SETTLEMENT_POINTS = [
  { value: "HB_HOUSTON", label: "Houston Hub" },
  { value: "HB_NORTH", label: "North Hub" },
  { value: "HB_SOUTH", label: "South Hub" },
  { value: "HB_WEST", label: "West Hub" },
  { value: "LZ_HOUSTON", label: "Houston Load Zone" },
  { value: "LZ_NORTH", label: "North Load Zone" },
  { value: "LZ_SOUTH", label: "South Load Zone" },
  { value: "LZ_WEST", label: "West Load Zone" },
] as const;

export type ERCOTSettlementPoint =
  (typeof ERCOT_SETTLEMENT_POINTS)[number]["value"];

// App State Types
export interface AppState {
  marketSelection: MarketSelection;
  bids: Bid[];
  marketData: {
    daHourly: MarketPrice[];
    rtFiveMin: MarketPrice[];
  };
  hourlyClears: HourlyClear[];
  isLoading: boolean;
  error: string | null;
}

// API Response Types
export interface GridStatusResponse<T = unknown> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
}

// GridStatus API raw response format
export interface GridStatusApiResponse {
  status_code: number;
  data: PartialGridStatusPriceData[] | null;
  meta: {
    page: number;
    limit: number | null;
    page_size: number;
    hasNextPage: boolean;
    cursor: string | null;
  };
  dataset_metadata?: {
    id: string;
    name: string;
    time_index_column: string;
    publish_time_column: string | null;
    subseries_index_column: string;
    data_timezone: string;
    all_columns: Array<{
      name: string;
      type: string;
      is_datetime: boolean;
      is_numeric: boolean;
    }>;
  };
}

// Time Utils Types
export interface CutoffStatus {
  isCutoffPassed: boolean;
  cutoffTime: string; // ISO string
  currentTime: string; // ISO string
  timeToString: string; // Human readable
}
