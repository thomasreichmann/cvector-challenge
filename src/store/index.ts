import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AppState,
  Bid,
  HourlyClear,
  MarketPrice,
  MarketSelection,
} from "~/types";
interface AppActions {
  // Market selection actions
  setMarketSelection: (selection: Partial<MarketSelection>) => void;

  // Bid actions
  addBid: (bid: Omit<Bid, "id">) => void;
  removeBid: (bidId: string) => void;
  clearBids: () => void;
  getBidsForHour: (hourStart: string) => Bid[];

  // Market data actions
  setMarketData: (data: {
    daHourly?: MarketPrice[];
    rtFiveMin?: MarketPrice[];
  }) => void;
  setHourlyClears: (clears: HourlyClear[]) => void;

  // UI state actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Reset actions
  resetForNewDate: () => void;

  // Hydration actions
  initializeClientDate: () => void;
}

type AppStore = AppState & AppActions;

// Use a safe default date that won't cause hydration issues
// Always return the same static date for both server and client initial state
// The client will update to the current date after hydration
const getDefaultTradingDate = (): string => {
  // Always use the same static date to prevent hydration mismatch
  return "2024-12-01"; // Use a recent date that's more likely to have data
};

const initialState: AppState = {
  marketSelection: {
    iso: "ercot",
    settlementPoint: "HB_HOUSTON",
    tradingDate: getDefaultTradingDate(),
  },
  bids: [],
  marketData: {
    daHourly: [],
    rtFiveMin: [],
  },
  hourlyClears: [],
  isLoading: false,
  error: null,
};

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Market selection actions
      setMarketSelection: (selection) =>
        set((state) => ({
          marketSelection: { ...state.marketSelection, ...selection },
          // Clear data when market selection changes
          marketData: { daHourly: [], rtFiveMin: [] },
          hourlyClears: [],
          error: null,
        })),

      // Bid actions
      addBid: (bidData) =>
        set((state) => {
          const bid: Bid = {
            ...bidData,
            id: crypto.randomUUID(),
          };

          // Check constraint: max 10 bids per hour
          const existingBidsForHour = state.bids.filter(
            (b) => b.hourStart === bid.hourStart,
          );

          if (existingBidsForHour.length >= 10) {
            return {
              ...state,
              error: "Maximum 10 bids per hour allowed",
            };
          }

          return {
            ...state,
            bids: [...state.bids, bid],
            error: null,
          };
        }),

      removeBid: (bidId) =>
        set((state) => ({
          bids: state.bids.filter((bid) => bid.id !== bidId),
        })),

      clearBids: () =>
        set((_state) => ({
          bids: [],
        })),

      getBidsForHour: (hourStart) => {
        const state = get();
        return state.bids.filter((bid) => bid.hourStart === hourStart);
      },

      // Market data actions
      setMarketData: (data) =>
        set((state) => ({
          marketData: {
            ...state.marketData,
            ...data,
          },
        })),

      setHourlyClears: (clears) =>
        set((_state) => ({
          hourlyClears: clears,
        })),

      // UI state actions
      setLoading: (loading) =>
        set((_state) => ({
          isLoading: loading,
        })),

      setError: (error) =>
        set((_state) => ({
          error,
        })),

      // Reset actions
      resetForNewDate: () =>
        set((_state) => ({
          bids: [],
          marketData: { daHourly: [], rtFiveMin: [] },
          hourlyClears: [],
          error: null,
        })),

      // Hydration actions
      initializeClientDate: () => {
        if (typeof window !== "undefined") {
          // Dynamic import to avoid SSR issues
          import("~/utils/time")
            .then(({ getCurrentMarketTime }) => {
              const today = getCurrentMarketTime();
              // Use yesterday as default since today's data might not be available yet
              const clientDate =
                today.minus({ days: 1 }).toISODate() ?? "2024-12-01";

              // Only update if the current date is still the default static date
              const currentState = get();
              if (currentState.marketSelection.tradingDate === "2024-12-01") {
                set((state) => ({
                  marketSelection: {
                    ...state.marketSelection,
                    tradingDate: clientDate,
                  },
                }));
              }
            })
            .catch(() => {
              // Fallback if import fails
              console.warn("Failed to initialize client date");
            });
        }
      },
    }),
    {
      name: "energy-trading-app",
      // Only persist market selection and bids
      partialize: (state) => ({
        marketSelection: state.marketSelection,
        bids: state.bids,
        marketData: state.marketData,
        hourlyClears: state.hourlyClears,
      }),
    },
  ),
);

// Selector hooks for performance
export const useMarketSelection = () =>
  useAppStore((state) => state.marketSelection);
export const useBids = () => useAppStore((state) => state.bids);
export const useMarketData = () => useAppStore((state) => state.marketData);
export const useHourlyClears = () => useAppStore((state) => state.hourlyClears);
export const useAppLoading = () => useAppStore((state) => state.isLoading);
export const useAppError = () => useAppStore((state) => state.error);
