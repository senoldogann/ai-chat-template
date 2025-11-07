/**
 * Tools Index - Central export for all tools
 * All tools are free, no paid APIs required
 */

export * from './calculator';
export * from './web-search';
export * from './file-processor';
export * from './financial-apis';

/**
 * Tool registry - Maps tool names to functions
 */
export const TOOLS = {
  calculate: {
    name: 'calculate',
    description: 'Performs mathematical calculations with high precision',
    execute: async (args: { expression: string; precision?: number }) => {
      const { calculate } = await import('./calculator');
      return calculate(args.expression, args.precision);
    },
  },
  searchWeb: {
    name: 'searchWeb',
    description: 'Searches the web using DuckDuckGo (free, no API key)',
    execute: async (args: { query: string; maxResults?: number }) => {
      const { searchWeb } = await import('./web-search');
      return searchWeb(args.query, args.maxResults);
    },
  },
  processCSV: {
    name: 'processCSV',
    description: 'Processes CSV files and extracts data',
    execute: async (args: { csvContent: string }) => {
      const { processCSV } = await import('./file-processor');
      return processCSV(args.csvContent);
    },
  },
  getStockPrice: {
    name: 'getStockPrice',
    description: 'Gets current stock price (free API)',
    execute: async (args: { symbol: string }) => {
      const { getStockPrice } = await import('./financial-apis');
      return getStockPrice(args.symbol);
    },
  },
  getCryptoPrice: {
    name: 'getCryptoPrice',
    description: 'Gets current cryptocurrency price (free API)',
    execute: async (args: { symbol: string }) => {
      const { getCryptoPrice } = await import('./financial-apis');
      return getCryptoPrice(args.symbol);
    },
  },
} as const;

export type ToolName = keyof typeof TOOLS;

