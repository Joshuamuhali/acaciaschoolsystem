import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileSpreadsheet, Filter, Download, AlertCircle, CheckCircle } from 'lucide-react';

interface ReconciliationData {
  [key: string]: any;
}

const SchoolReconciliationReader: React.FC = () => {
  const [data, setData] = useState<ReconciliationData[]>([]);
  const [term1Data, setTerm1Data] = useState<ReconciliationData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [summary, setSummary] = useState<any>({});

  useEffect(() => {
    loadReconciliationData();
  }, []);

  const loadReconciliationData = async () => {
    setLoading(true);
    setError('');

    try {
      // Fetch the Excel file from public folder
      const response = await fetch('/SCHOOL RECONCILIATION 2025.xlsx');
      if (!response.ok) {
        throw new Error('Failed to load Excel file');
      }

      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      // Get all sheet names
      const sheetNames = workbook.SheetNames;
      console.log('Available sheets:', sheetNames);

      // Read the first sheet (or you can specify a particular sheet)
      const sheetName = sheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,
        defval: ''
      });

      if (jsonData.length === 0) {
        throw new Error('Excel file is empty');
      }

      // Convert array of arrays to array of objects
      const headers = jsonData[0] as string[];
      const rows = jsonData.slice(1) as any[][];

      const result = rows.map((row, index) => {
        const obj: ReconciliationData = { _rowNumber: index + 2 };
        headers.forEach((header, colIndex) => {
          obj[header] = row[colIndex] || '';
        });
        return obj;
      }).filter(row => {
        // Filter out completely empty rows
        return Object.values(row).some(value => value !== '' && value !== null && value !== undefined);
      });

      setData(result);
      
      // Filter for Term 1 2026
      const filtered = result.filter(row => {
        // Look for term-related columns and filter for Term 1 2026
        const termValue = findTermValue(row);
        return termValue && termValue.toLowerCase().includes('term 1') && 
               (termValue.toLowerCase().includes('2026') || termValue.toLowerCase().includes('2025'));
      });

      setTerm1Data(filtered);
      calculateSummary(filtered);

    } catch (err) {
      setError(`Error reading Excel file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const findTermValue = (row: ReconciliationData): string => {
    // Common column names that might contain term information
    const termColumns = ['term', 'term_name', 'academic_term', 'term_id', 'period', 'academic_period'];
    
    for (const col of termColumns) {
      if (row[col] && typeof row[col] === 'string') {
        return row[col];
      }
    }
    
    // If no standard term columns, search all string values
    for (const [key, value] of Object.entries(row)) {
      if (typeof value === 'string' && 
          (value.toLowerCase().includes('term') || 
           value.toLowerCase().includes('2026') ||
           value.toLowerCase().includes('2025'))) {
        return value;
      }
    }
    
    return '';
  };

  const calculateSummary = (termData: ReconciliationData[]) => {
    const summary = {
      totalRecords: termData.length,
      totalAmount: 0,
      uniquePupils: new Set<string>(),
      uniquePupilsCount: 0,
      paymentMethods: {} as Record<string, number>,
      statusCounts: {} as Record<string, number>
    };

    termData.forEach(row => {
      // Count unique pupils
      const pupilName = findPupilName(row);
      if (pupilName) {
        summary.uniquePupils.add(pupilName);
      }

      // Sum amounts
      const amount = findAmount(row);
      if (amount) {
        summary.totalAmount += parseFloat(amount.toString());
      }

      // Count payment methods
      const paymentMethod = findPaymentMethod(row);
      if (paymentMethod) {
        summary.paymentMethods[paymentMethod] = (summary.paymentMethods[paymentMethod] || 0) + 1;
      }

      // Count statuses
      const status = findStatus(row);
      if (status) {
        summary.statusCounts[status] = (summary.statusCounts[status] || 0) + 1;
      }
    });

    summary.uniquePupilsCount = summary.uniquePupils.size;
    setSummary(summary);
  };

  const findPupilName = (row: ReconciliationData): string => {
    const nameColumns = ['pupil_name', 'student_name', 'name', 'full_name', 'pupil'];
    for (const col of nameColumns) {
      if (row[col]) return row[col];
    }
    return '';
  };

  const findAmount = (row: ReconciliationData): number => {
    const amountColumns = ['amount', 'fee', 'payment', 'total', 'balance', 'school_fees'];
    for (const col of amountColumns) {
      if (row[col]) {
        const num = parseFloat(row[col].toString().replace(/[^0-9.-]/g, ''));
        if (!isNaN(num)) return num;
      }
    }
    return 0;
  };

  const findPaymentMethod = (row: ReconciliationData): string => {
    const methodColumns = ['payment_method', 'method', 'payment_type'];
    for (const col of methodColumns) {
      if (row[col]) return row[col];
    }
    return '';
  };

  const findStatus = (row: ReconciliationData): string => {
    const statusColumns = ['status', 'payment_status', 'state'];
    for (const col of statusColumns) {
      if (row[col]) return row[col];
    }
    return '';
  };

  const exportToCSV = (data: ReconciliationData[], filename: string) => {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]).filter(key => key !== '_rowNumber');
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatCellValue = (value: any): string => {
    if (value === null || value === undefined || value === '') return '-';
    if (typeof value === 'number') return value.toLocaleString();
    if (typeof value === 'string') return value.length > 30 ? value.substring(0, 30) + '...' : value;
    return String(value);
  };

  if (loading) {
    return (
      <Card className="w-full max-w-6xl mx-auto">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            <span className="ml-2">Loading reconciliation data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-6xl mx-auto">
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <FileSpreadsheet className="w-8 h-8 text-green-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">School Reconciliation 2025</h1>
          <p className="text-gray-600">Term 1 2026 Data Analysis</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{summary.totalRecords}</div>
            <div className="text-sm text-gray-600">Total Records</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{summary.uniquePupilsCount}</div>
            <div className="text-sm text-gray-600">Unique Pupils</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">
              ZMW {summary.totalAmount.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Total Amount</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              {Object.keys(summary.statusCounts).length}
            </div>
            <div className="text-sm text-gray-600">Status Types</div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button onClick={loadReconciliationData} variant="outline">
          <Filter className="w-4 h-4 mr-2" />
          Refresh Data
        </Button>
        <Button onClick={() => exportToCSV(term1Data, 'term1-2026-reconciliation.csv')}>
          <Download className="w-4 h-4 mr-2" />
          Export Term 1 2026
        </Button>
      </div>

      <Separator />

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Term 1 2026 Data ({term1Data.length} records)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {term1Data.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {Object.keys(term1Data[0])
                      .filter(key => key !== '_rowNumber')
                      .slice(0, 8) // Show first 8 columns
                      .map((header) => (
                        <TableHead key={header} className="whitespace-nowrap">
                          {header}
                        </TableHead>
                      ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {term1Data.slice(0, 20).map((row, index) => (
                    <TableRow key={index}>
                      {Object.entries(row)
                        .filter(([key]) => key !== '_rowNumber')
                        .slice(0, 8)
                        .map(([key, value]) => (
                          <TableCell key={key} className="whitespace-nowrap">
                            {formatCellValue(value)}
                          </TableCell>
                        ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {term1Data.length > 20 && (
                <div className="text-center py-4 text-sm text-gray-500">
                  Showing first 20 of {term1Data.length} records
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No Term 1 2026 data found</p>
              <p className="text-sm text-gray-500">
                Total records in file: {data.length}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Methods Breakdown */}
      {Object.keys(summary.paymentMethods).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(summary.paymentMethods).map(([method, count]) => (
                <Badge key={String(method)} variant="secondary">
                  {String(method)}: {String(count)}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SchoolReconciliationReader;
