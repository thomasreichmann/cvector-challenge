# Virtual Energy Trading Platform

A complete ERCOT day-ahead and real-time energy trading simulation platform built with Next.js, TypeScript, and Arco Design.

## Overview

This application enables virtual energy trading for the ERCOT market, allowing users to:

- Enter day-ahead hourly bids (up to 10 per hour) with price and quantity
- Apply 11:00 CT market-time cutoff for bid submission
- Fetch real-time 5-minute and day-ahead hourly settlement prices from GridStatus API
- Clear orders against day-ahead settlement prices
- Calculate P&L based on real-time price offsets
- Visualize prices and P&L through interactive charts and tables

## Features

### Core Functionality

- **Market Selection**: Choose ISO (ERCOT), settlement point, and trading date
- **Order Entry**: Add BUY/SELL bids with price and quantity validation
- **Cutoff Logic**: Automatic order entry lockdown after 11:00 CT
- **Data Fetching**: Real-time integration with GridStatus API
- **Clearing Engine**: Automated bid clearing against day-ahead prices
- **P&L Calculation**: Real-time P&L computation with detailed breakdowns

### Technical Features

- **Persistent State**: Local storage for bids and market selections
- **Time Zone Handling**: Proper ERCOT market time (America/Chicago) support
- **Rate Limiting Protection**: Intelligent API caching and request management
- **Responsive UI**: Mobile-friendly design with modern UX patterns
- **Type Safety**: Full TypeScript implementation with Zod validation

## Tech Stack

- **Framework**: Next.js 15.2.3 with App Router
- **Language**: TypeScript
- **UI Library**: Arco Design Components
- **Charts**: Recharts
- **State Management**: Zustand with persistence
- **Time Handling**: Luxon for timezone operations
- **Styling**: Tailwind CSS
- **Testing**: Vitest with Testing Library
- **Package Manager**: pnpm

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd cvector-challange
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   Create a `.env.local` file in the project root:

   ```bash
   GRIDSTATUS_API_KEY=your_gridstatus_api_key_here
   ```

4. **Start development server**

   ```bash
   pnpm dev
   ```

5. **Open the application**

   Navigate to [http://localhost:3000](http://localhost:3000) (or port shown in terminal output)

## Usage Guide

### 1. Market Configuration

- Select settlement point (default: HB_HOUSTON)
- Choose trading date (cannot be more than 1 day in the future)
- Monitor order entry status (open until 11:00 CT)

### 2. Order Entry

- Add BUY/SELL bids with limit price and quantity
- Maximum 10 bids per hour enforced
- Orders locked after 11:00 CT cutoff

### 3. Data Fetching

- Click "Run Simulation" to fetch market data
- Day-ahead hourly settlement prices
- Real-time 5-minute LMPs (averaged to hourly)

### 4. Results Analysis

- View price comparison chart (DA vs RT)
- Review clearing results table with P&L
- Monitor summary statistics

## Architecture

### Data Flow

```
UI Components → Zustand Store → API Routes → GridStatus API
     ↓              ↓              ↓
Clearing Logic ← Market Data ← Server Proxy
     ↓
P&L Calculation → Charts & Tables
```

### Key Components

- **TradingApp**: Main application container
- **MarketControls**: ISO, settlement point, and date selection
- **OrderEntry**: Bid entry form and management
- **PriceChart**: DA vs RT price visualization
- **ClearingTable**: Detailed clearing results and P&L
- **SummaryStats**: High-level trading statistics

### Business Logic

- **Clearing Rules**:
  - BUY bids clear when limit ≥ DA settlement
  - SELL bids clear when limit ≤ DA settlement
- **P&L Formula**: `Cleared Qty × (RT Avg - DA Price)`
- **Position Types**: LONG (positive qty), SHORT (negative qty), FLAT (zero)

## API Integration

### GridStatus API Endpoints

- **Day-Ahead (SPP Hourly)**: `/api/grid/ercot_spp_day_ahead_hourly`
- **Real-Time (LMP 5-Minute)**: `/api/grid/ercot_spp_real_time_5_minute`

_Note: The implementation uses a dynamic route `/api/grid/[dataset]` that maps to the appropriate GridStatus dataset endpoints._

### Rate Limiting

- Server-side API key management
- Built-in caching with appropriate TTLs
- Error handling with fallback states

## Testing

### Run Tests

```bash
# Run tests in watch mode
pnpm test

# Run tests once
pnpm test:run
```

### Test Coverage

- **Core Logic**: Clearing rules, P&L calculation
- **Time Utilities**: Cutoff logic, timezone handling
- **Edge Cases**: Missing data, boundary conditions

## Development Scripts

```bash
# Development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run linting
pnpm lint

# Format code
pnpm format:write

# Type checking
pnpm typecheck
```

## Deployment

### Vercel (Recommended)

1. Connect repository to Vercel
2. Add `GRIDSTATUS_API_KEY` environment variable
3. Deploy automatically on push

### Environment Variables

- `GRIDSTATUS_API_KEY`: GridStatus API key for market data access

## Business Rules

### Market Mechanics

- **Cutoff Time**: 11:00 CT for each trading date
- **Bid Limits**: Maximum 10 bids per hour
- **Price Validation**: Positive prices and quantities only
- **Settlement**: Based on published DA prices

### P&L Model

- **Long Position**: Profit when RT > DA
- **Short Position**: Profit when RT < DA
- **Flat Position**: No P&L exposure

## Future Enhancements

### Phase 2 Features

- **Multi-ISO Support**: Extend to PJM, NYISO, CAISO
- **Backtesting**: Historical scenario analysis
- **Strategy Templates**: Pre-built bid patterns
- **Risk Analytics**: Exposure metrics and VaR

### Technical Improvements

- **WebSocket Integration**: Live price updates
- **CSV Export**: Data export capabilities
- **Advanced Charting**: Candlestick and volume charts
- **User Accounts**: Personal scenario management
