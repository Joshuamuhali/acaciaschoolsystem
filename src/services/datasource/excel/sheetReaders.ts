import * as XLSX from 'xlsx';
import { ExcelWorkbookManager } from './workbook';
import { ExcelFileError } from '../types';

export interface ExcelRow {
  [key: string]: any;
  _rowNumber: number;
}

export class SheetReader {
  constructor(private workbookManager: ExcelWorkbookManager) {}

  readSheet(sheetName: string, options: {
    headerRow?: number;
    skipEmptyRows?: boolean;
    maxRows?: number;
  } = {}): ExcelRow[] {
    const {
      headerRow = 0,
      skipEmptyRows = true,
      maxRows
    } = options;

    const sheet = this.workbookManager.getSheet(sheetName);
    if (!sheet) {
      throw new ExcelFileError(`Sheet '${sheetName}' not found in workbook`);
    }

    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    const startRow = headerRow;
    const endRow = maxRows ? Math.min(headerRow + maxRows, range.e.r + 1) : range.e.r + 1;

    if (startRow >= endRow) {
      return [];
    }

    // Read headers
    const headers = this.readHeaders(sheet, headerRow);
    if (headers.length === 0) {
      return [];
    }

    // Read data rows
    const rows: ExcelRow[] = [];
    for (let rowIndex = startRow + 1; rowIndex < endRow; rowIndex++) {
      const rowData = this.readRow(sheet, rowIndex, headers);
      
      if (skipEmptyRows && this.isEmptyRow(rowData)) {
        continue;
      }

      rows.push(rowData);
    }

    return rows;
  }

  private readHeaders(sheet: XLSX.WorkSheet, headerRow: number): string[] {
    const headers: string[] = [];
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: headerRow, c: col });
      const cell = sheet[cellAddress];
      const header = cell ? cell.v?.toString().trim() : '';
      headers.push(header || `Column_${col}`);
    }

    return headers;
  }

  private readRow(sheet: XLSX.WorkSheet, rowIndex: number, headers: string[]): ExcelRow {
    const row: ExcelRow = { _rowNumber: rowIndex + 1 };
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');

    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: col });
      const cell = sheet[cellAddress];
      const header = headers[col - range.s.c];
      
      if (cell && cell.v !== undefined && cell.v !== null) {
        row[header] = cell.v;
      } else {
        row[header] = '';
      }
    }

    return row;
  }

  private isEmptyRow(row: ExcelRow): boolean {
    return Object.values(row).every(value => 
      value === '' || value === null || value === undefined || value === 0
    );
  }

  findRowsByColumnValue(
    sheetName: string,
    columnName: string,
    value: any,
    options: {
      caseSensitive?: boolean;
      partialMatch?: boolean;
    } = {}
  ): ExcelRow[] {
    const { caseSensitive = false, partialMatch = false } = options;
    const allRows = this.readSheet(sheetName);

    return allRows.filter(row => {
      const cellValue = row[columnName];
      if (cellValue === undefined || cellValue === null || cellValue === '') {
        return false;
      }

      const cellStr = cellValue.toString();
      const searchStr = value.toString();

      if (partialMatch) {
        return caseSensitive 
          ? cellStr.includes(searchStr)
          : cellStr.toLowerCase().includes(searchStr.toLowerCase());
      } else {
        return caseSensitive
          ? cellStr === searchStr
          : cellStr.toLowerCase() === searchStr.toLowerCase();
      }
    });
  }

  getUniqueValues(sheetName: string, columnName: string): string[] {
    const rows = this.readSheet(sheetName);
    const values = new Set<string>();

    rows.forEach(row => {
      const value = row[columnName];
      if (value !== undefined && value !== null && value !== '') {
        values.add(value.toString());
      }
    });

    return Array.from(values).sort();
  }

  countRows(sheetName: string, filter?: (row: ExcelRow) => boolean): number {
    if (!filter) {
      return this.readSheet(sheetName).length;
    }

    return this.readSheet(sheetName).filter(filter).length;
  }
}
