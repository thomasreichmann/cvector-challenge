# Architecture Decision Record (ADR)

## Virtual Energy Trading Platform - Key Design Decisions

🚀 **Live Demo**: [cvector.thomasar.dev](https://cvector.thomasar.dev)

### 1. Why Next.js-Only Architecture (No Separate Backend)

**Decision**: Use Next.js App Router with API routes instead of a separate FastAPI/Express backend.

**Rationale**:

- **Simplicity**: Single repository, single deployment, unified TypeScript codebase
- **Security**: Environment variables and API keys stay server-side only
- **Performance**: Built-in caching, edge functions, and optimized bundling
- **Developer Experience**: Hot reloading, integrated tooling, type safety end-to-end
- **Scope Alignment**: For a take-home project, depth over architectural complexity

**Trade-offs**:

- ✅ Faster development, easier deployment, better security
- ❌ Less flexible for complex business logic or multiple client types
- ❌ Harder to scale different components independently

### 2. Why ERCOT First

**Decision**: Start with ERCOT market only, build architecture to extend to other ISOs.

**Rationale**:

- **Data Quality**: ERCOT has clean, well-documented APIs via GridStatus
- **Clear Semantics**: Simple LMP structure, clear settlement timing
- **Manageable Scope**: Focus on core functionality rather than multi-market complexity
- **Extensible Design**: Domain models support multi-ISO with minimal changes

**Future Path**:

```typescript
// Current: ERCOT-specific
iso: z.literal("ercot");

// Future: Multi-ISO support
iso: z.enum(["ercot", "pjm", "nyiso", "caiso"]);
```

### 3. Data Persistence Strategy

**Decision**: Browser localStorage only, no database.

**Rationale**:

- **Project Scope**: Take-home demo vs. production system
- **User Privacy**: No PII collection, no user accounts needed
- **Simplicity**: Eliminates database setup, migrations, hosting complexity
- **Quick Feedback**: Instant persistence, no network calls for state

**Implementation**:

- Zustand with persistence middleware
- Automatic serialization/deserialization
- Keyed by ISO/date/settlement point for isolation

**Limitations**:

- Data loss on browser clear/different devices
- No sharing between users
- No audit trail or analytics

### 4. P&L Model and Assumptions

**Decision**: Simplified P&L = `Cleared Qty × (RT Avg - DA Price)` per hour.

**Rationale**:

- **Mathematical Equivalence**: Averaging RT prices is equivalent to summing 5-minute legs
- **Pedagogical Clarity**: Easy to understand and verify manually
- **API Alignment**: GridStatus provides both hourly DA and 5-minute RT data
- **No Market Impact**: Assume price-taker behavior (appropriate for demo)

**Formula Derivation**:

```
Traditional: 12 legs of (Q/12) × (RT_5min - DA)
Simplified: Q × (Average(RT_5min) - DA)
Result: Mathematically identical, computationally simpler
```

**Assumptions**:

- Perfect liquidity (all cleared orders settle)
- No basis risk between settlement points
- No transaction costs or market impact
- RT prices available for full trading day

### 5. Time Zone Handling

**Decision**: All calculations in market time (America/Chicago for ERCOT).

**Rationale**:

- **Regulatory Compliance**: Energy markets operate on local time
- **User Mental Model**: Traders think in market time, not UTC
- **Cutoff Logic**: 11:00 CT cutoff is meaningful to users
- **Data Consistency**: GridStatus supports timezone parameters

**Implementation**:

- Luxon for robust timezone calculations
- Server-side timezone conversion in API routes
- Clear UTC vs. market time labeling
- DST-aware cutoff logic

### 6. Component Architecture

**Decision**: Feature-based component structure with co-located state management.

```
components/
├── TradingApp.tsx        # Main container
├── MarketControls.tsx    # ISO/date/settlement selection
├── OrderEntry.tsx        # Bid management
├── PriceChart.tsx        # Data visualization
├── ClearingTable.tsx     # Results display
└── SummaryStats.tsx      # Aggregate metrics
```

**Rationale**:

- **Separation of Concerns**: Each component has a single responsibility
- **Reusability**: Components can be composed into different layouts
- **Testability**: Isolated components easier to unit test
- **Maintainability**: Changes localized to specific features

### 7. State Management Strategy

**Decision**: Zustand with persistence for client state, no global server state cache.

**Rationale**:

- **Simplicity**: Lighter than Redux, more structured than useState
- **Persistence**: Built-in localStorage integration
- **TypeScript**: Excellent type inference and safety
- **Performance**: Selective subscriptions prevent unnecessary re-renders

**State Structure**:

```typescript
{
  marketSelection: { iso, settlementPoint, tradingDate },
  bids: Bid[],
  marketData: { daHourly, rtFiveMin },
  hourlyClears: HourlyClear[],
  // UI state
  isLoading: boolean,
  error: string | null
}
```

### 8. API Integration Pattern

**Decision**: Server-side proxy with caching, client-side error handling.

**Flow**:

```
Client → Next.js API Route → GridStatus API → Response Cache → Client
```

**Benefits**:

- **Security**: API keys never exposed to browser
- **Rate Limiting**: Server-side throttling and caching
- **Error Handling**: Consistent error responses
- **Performance**: Built-in Next.js caching with revalidation

**Cache Strategy**:

- All market data: 5-minute cache (`s-maxage=300`)
- Error responses: No cache
- Server-side caching with revalidation

### 9. Testing Strategy

**Decision**: Focus on business logic unit tests, minimal integration tests.

**Coverage Priorities**:

1. **Core Logic**: Clearing rules, P&L calculations
2. **Time Utilities**: Cutoff logic, timezone handling
3. **Edge Cases**: Missing data, boundary conditions
4. **Type Safety**: Zod schema validation

**Tools**:

- Vitest for test runner (faster than Jest, better ESM support)
- Testing Library for component tests (future)
- Mock objects for API responses

### 10. Future Scalability Considerations

**Design Decisions for Extensions**:

**Multi-ISO Support**:

```typescript
// Extensible settlement point maps
const SETTLEMENT_POINTS = {
  ercot: ERCOT_SETTLEMENT_POINTS,
  pjm: PJM_SETTLEMENT_POINTS,
  // ...
};

// ISO-specific API endpoint mapping (current implementation pattern)
const DATASET_MAPPING = {
  ercot: {
    da: "ercot_spp_day_ahead_hourly",
    rt: "ercot_lmp_by_settlement_point",
  },
  pjm: {
    da: "pjm_spp_day_ahead_hourly",
    rt: "pjm_lmp_by_settlement_point",
  },
  // ...
};
```

**Database Migration**:

```typescript
// Current localStorage schema can directly map to tables
CREATE TABLE bids (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  hour_start TIMESTAMPTZ,
  side bid_side_enum,
  price DECIMAL(10,2),
  qty_mwh DECIMAL(8,1)
);
```

**WebSocket Integration**:

```typescript
// Real-time price updates
const useRealtimePrices = (settlementPoint: string) => {
  // WebSocket connection to live price feed
  // Update store on price changes
};
```

---

## Summary

These decisions prioritize:

1. **Rapid Development**: Get to working demo quickly
2. **Code Quality**: Type safety, testability, maintainability
3. **User Experience**: Responsive UI, clear feedback, intuitive flow
4. **Extensibility**: Clean abstractions for future enhancements

The architecture successfully delivers a production-quality demo while maintaining simplicity and clear upgrade paths for enterprise features.
