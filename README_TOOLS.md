# 🛠️ Tools Documentation

## Overview

This project includes a comprehensive set of **FREE** tools that extend the AI's capabilities without requiring any paid APIs or external services.

## Available Tools

### 1. Calculator Tool (`/api/tools/calculator`)

**Purpose**: Perform mathematical calculations with high precision

**Features**:
- Basic arithmetic operations
- High-precision decimal calculations
- Financial calculations (ROI, compound interest, portfolio value)
- Percentage calculations

**Usage**:
```typescript
POST /api/tools/calculator
{
  "operation": "basic",
  "expression": "123.45 * 67.89"
}
```

**Example**:
```bash
curl -X POST http://localhost:3000/api/tools/calculator \
  -H "Content-Type: application/json" \
  -d '{"operation": "basic", "expression": "15 * 20"}'
```

### 2. Web Search Tool (`/api/tools/search`)

**Purpose**: Search the web using DuckDuckGo (completely free, no API key)

**Features**:
- Free web search (no API key required)
- Returns top search results
- Extracts titles, URLs, and snippets

**Usage**:
```typescript
POST /api/tools/search
{
  "query": "latest Bitcoin news",
  "maxResults": 5
}
```

**Example**:
```bash
curl -X POST http://localhost:3000/api/tools/search \
  -H "Content-Type: application/json" \
  -d '{"query": "Bitcoin price", "maxResults": 5}'
```

### 3. Financial Data Tool (`/api/tools/financial`)

**Purpose**: Get current stock and cryptocurrency prices

**Features**:
- Stock prices (using Alpha Vantage free tier - 500 calls/day)
- Cryptocurrency prices (using CoinGecko free API)
- Financial metrics calculations (ROI, annualized returns)

**Usage**:
```typescript
POST /api/tools/financial
{
  "operation": "stock",
  "symbol": "AAPL"
}
```

**Example**:
```bash
# Stock price
curl -X POST http://localhost:3000/api/tools/financial \
  -H "Content-Type: application/json" \
  -d '{"operation": "stock", "symbol": "AAPL"}'

# Crypto price
curl -X POST http://localhost:3000/api/tools/financial \
  -H "Content-Type: application/json" \
  -d '{"operation": "crypto", "symbol": "bitcoin"}'
```

### 4. File Processing Tool (`/api/tools/upload`)

**Purpose**: Process CSV and Excel files

**Features**:
- CSV parsing
- Excel file processing (.xlsx, .xls)
- Financial data analysis
- Statistics calculation

**Usage**:
```typescript
POST /api/tools/upload
FormData:
  - file: File
  - analyze: boolean (optional)
```

**Example**:
```bash
curl -X POST http://localhost:3000/api/tools/upload \
  -F "file=@portfolio.csv" \
  -F "analyze=true"
```

## Tool Integration

### Automatic Tool Detection

The chat API automatically detects when a tool is needed based on user messages:

- **Calculator**: Detects math expressions and calculation requests
- **Web Search**: Detects search queries
- **Stock Prices**: Detects stock symbol mentions
- **Crypto Prices**: Detects cryptocurrency mentions

### Manual Tool Usage

You can also call tools directly from the frontend:

```typescript
// Calculator
const response = await fetch('/api/tools/calculator', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    operation: 'basic',
    expression: '15 * 20'
  })
});

// Web Search
const response = await fetch('/api/tools/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'Bitcoin price',
    maxResults: 5
  })
});
```

## Environment Variables

Optional environment variables (for enhanced features):

```env
# Alpha Vantage API Key (optional, free tier available)
ALPHA_VANTAGE_API_KEY=your_key_here

# Note: Most tools work without API keys!
```

## Cost Analysis

**All tools are FREE**:
- ✅ Calculator: 100% free (local computation)
- ✅ Web Search: 100% free (DuckDuckGo, no API key)
- ✅ Crypto Prices: 100% free (CoinGecko, no API key)
- ✅ File Processing: 100% free (local processing)
- ⚠️ Stock Prices: Free tier available (500 calls/day)

## Limitations

1. **Web Search**: Rate limiting may apply (DuckDuckGo)
2. **Stock Prices**: Alpha Vantage free tier: 500 calls/day
3. **File Size**: Large files may take longer to process

## Future Enhancements

- [ ] Vector Database for semantic search
- [ ] Code execution sandbox
- [ ] More financial data sources
- [ ] Real-time data streaming

## Support

For issues or questions, check:
- Tool source code: `/lib/tools/`
- API routes: `/app/api/tools/`
- Agent instructions: `AGENT_INSTRUCTIONS.md`

