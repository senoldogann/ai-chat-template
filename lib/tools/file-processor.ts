import Papa from 'papaparse';
import * as XLSX from 'xlsx';

/**
 * File Processor Tool - Handles CSV and Excel file processing
 * Completely free, no external API needed
 */

export interface FileData {
  headers: string[];
  rows: Record<string, any>[];
  totalRows: number;
  totalColumns: number;
}

/**
 * Process CSV file
 */
export function processCSV(csvContent: string): FileData {
  try {
    const result = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    });

    if (result.errors.length > 0) {
      console.warn('CSV parsing errors:', result.errors);
    }

    const rows = result.data as Record<string, any>[];
    const headers = result.meta.fields || [];

    return {
      headers,
      rows,
      totalRows: rows.length,
      totalColumns: headers.length,
    };
  } catch (error: any) {
    throw new Error(`CSV processing error: ${error.message}`);
  }
}

/**
 * Process Excel file
 */
export function processExcel(excelBuffer: Buffer): FileData {
  try {
    const workbook = XLSX.read(excelBuffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
    }) as any[][];

    if (jsonData.length === 0) {
      return {
        headers: [],
        rows: [],
        totalRows: 0,
        totalColumns: 0,
      };
    }

    // First row as headers
    const headers = (jsonData[0] || []).map((h) => String(h).trim()).filter((h) => h);
    const rows = jsonData.slice(1).map((row) => {
      const rowObj: Record<string, any> = {};
      headers.forEach((header, index) => {
        rowObj[header] = row[index] || '';
      });
      return rowObj;
    });

    return {
      headers,
      rows,
      totalRows: rows.length,
      totalColumns: headers.length,
    };
  } catch (error: any) {
    throw new Error(`Excel processing error: ${error.message}`);
  }
}

/**
 * Convert data to CSV
 */
export function convertToCSV(data: Record<string, any>[]): string {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];
  
  for (const row of data) {
    const values = headers.map((header) => {
      const value = row[header] || '';
      // Escape commas and quotes
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
}

/**
 * Analyze financial data from CSV/Excel
 */
export function analyzeFinancialData(data: FileData): {
  summary: Record<string, any>;
  statistics: Record<string, any>;
} {
  const summary: Record<string, any> = {};
  const statistics: Record<string, any> = {};

  // Find numeric columns
  const numericColumns = data.headers.filter((header) => {
    return data.rows.some((row) => {
      const value = row[header];
      return value !== null && value !== undefined && !isNaN(Number(value));
    });
  });

  // Calculate statistics for numeric columns
  for (const column of numericColumns) {
    const values = data.rows
      .map((row) => Number(row[column]))
      .filter((v) => !isNaN(v));

    if (values.length > 0) {
      statistics[column] = {
        sum: values.reduce((a, b) => a + b, 0),
        average: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        count: values.length,
      };
    }
  }

  summary.totalRows = data.totalRows;
  summary.totalColumns = data.totalColumns;
  summary.numericColumns = numericColumns;

  return { summary, statistics };
}

