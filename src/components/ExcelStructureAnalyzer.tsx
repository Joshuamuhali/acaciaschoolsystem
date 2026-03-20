import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileSpreadsheet, Database, Eye, Filter, Users, DollarSign } from 'lucide-react';

interface ExcelStructure {
  columns: string[];
  sampleData: any[];
  totalRows: number;
  term1Data: any[];
  summary: {
    totalRecords: number;
    term1Records: number;
    uniquePupils: number;
    totalAmount: number;
    paymentMethods: Record<string, number>;
    grades: Record<string, number>;
  };
}

const ExcelStructureAnalyzer: React.FC = () => {
  const [structure, setStructure] = useState<ExcelStructure | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    analyzeExcelStructure();
  }, []);

  const analyzeExcelStructure = async () => {
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

      // Read the first sheet
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

      const allData = rows.map((row, index) => {
        const obj: any = { _rowNumber: index + 2 };
        headers.forEach((header, colIndex) => {
          obj[header] = row[colIndex] || '';
        });
        return obj;
      }).filter(row => {
        // Filter out completely empty rows
        return Object.values(row).some(value => value !== '' && value !== null && value !== undefined);
      });

      // Filter for Term 1 2026 data
      const term1Data = allData.filter(row => {
        const termValue = findTermValue(row);
        return termValue && (
          termValue.toLowerCase().includes('term 1') || 
          termValue.toLowerCase().includes('2026')
        );
      });

      // Calculate summary
      const summary = {
        totalRecords: allData.length,
        term1Records: term1Data.length,
        uniquePupils: new Set(term1Data.map(row => findPupilName(row))).size,
        totalAmount: term1Data.reduce((sum, row) => {
          const amount = findAmount(row);
          return sum + (amount || 0);
        }, 0),
        paymentMethods: {} as Record<string, number>,
        grades: {} as Record<string, number>
      };

      // Analyze payment methods
      term1Data.forEach(row => {
        const method = findPaymentMethod(row);
        if (method) {
          summary.paymentMethods[method] = (summary.paymentMethods[method] || 0) + 1;
        }
      });

      // Analyze grades
      term1Data.forEach(row => {
        const grade = findGrade(row);
        if (grade) {
          summary.grades[grade] = (summary.grades[grade] || 0) + 1;
        }
      });

      setStructure({
        columns: headers,
        sampleData: allData.slice(0, 5),
        totalRows: allData.length,
        term1Data: term1Data.slice(0, 10),
        summary
      });

    } catch (err) {
      setError(`Error analyzing Excel file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const findTermValue = (row: any): string => {
    const termColumns = ['term', 'term_name', 'academic_term', 'term_id', 'period', 'academic_period'];
    
    for (const col of termColumns) {
      if (row[col] && typeof row[col] === 'string') {
        return row[col];
      }
    }
    
    // Search all string values
    for (const [key, value] of Object.entries(row)) {
      if (typeof value === 'string' && 
          (value.toLowerCase().includes('term') || 
           value.toLowerCase().includes('2026'))) {
        return value;
      }
    }
    
    return '';
  };

  const findPupilName = (row: any): string => {
    const nameColumns = ['pupil_name', 'student_name', 'name', 'full_name', 'pupil'];
    for (const col of nameColumns) {
      if (row[col]) return row[col];
    }
    return '';
  };

  const findAmount = (row: any): number => {
    const amountColumns = ['amount', 'fee', 'payment', 'total', 'balance', 'school_fees'];
    for (const col of amountColumns) {
      if (row[col]) {
        const num = parseFloat(row[col].toString().replace(/[^0-9.-]/g, ''));
        if (!isNaN(num)) return num;
      }
    }
    return 0;
  };

  const findPaymentMethod = (row: any): string => {
    const methodColumns = ['payment_method', 'method', 'payment_type'];
    for (const col of methodColumns) {
      if (row[col]) return row[col];
    }
    return '';
  };

  const findGrade = (row: any): string => {
    const gradeColumns = ['grade', 'grade_name', 'class', 'section'];
    for (const col of gradeColumns) {
      if (row[col]) return row[col];
    }
    return '';
  };

  const formatCellValue = (value: any): string => {
    if (value === null || value === undefined || value === '') return '-';
    if (typeof value === 'number') return value.toLocaleString();
    if (typeof value === 'string') return value.length > 20 ? value.substring(0, 20) + '...' : value;
    return String(value);
  };

  if (loading) {
    return (
      <Card className="w-full max-w-6xl mx-auto">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            <span className="ml-2">Analyzing Excel structure...</span>
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
            <Database className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!structure) return null;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <FileSpreadsheet className="w-8 h-8 text-green-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Excel Structure Analysis</h1>
          <p className="text-gray-600">SCHOOL RECONCILIATION 2025 - Term 1 2026 Data</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{structure.summary.totalRecords}</div>
            <div className="text-sm text-gray-600">Total Records</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{structure.summary.term1Records}</div>
            <div className="text-sm text-gray-600">Term 1 Records</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">{structure.summary.uniquePupils}</div>
            <div className="text-sm text-gray-600">Unique Pupils</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              ZMW {structure.summary.totalAmount.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Total Amount</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-cyan-600">{structure.columns.length}</div>
            <div className="text-sm text-gray-600">Columns</div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Column Structure */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Excel Column Structure ({structure.columns.length} columns)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {structure.columns.map((column) => (
              <Badge key={column} variant="outline" className="text-xs">
                {column}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payment Methods Breakdown */}
      {Object.keys(structure.summary.paymentMethods).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Payment Methods Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(structure.summary.paymentMethods).map(([method, count]) => (
                <div key={method} className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{count}</div>
                  <div className="text-sm text-gray-600">{String(method)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grades Breakdown */}
      {Object.keys(structure.summary.grades).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Grades Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(structure.summary.grades).map(([grade, count]) => (
                <div key={grade} className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{count}</div>
                  <div className="text-sm text-gray-600">{String(grade)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sample Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Sample Raw Data (First 5 rows)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {structure.columns.slice(0, 10).map((header) => (
                    <TableHead key={header} className="whitespace-nowrap text-xs">
                      {header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {structure.sampleData.map((row, index) => (
                  <TableRow key={index}>
                    {structure.columns.slice(0, 10).map((header) => (
                      <TableCell key={header} className="whitespace-nowrap text-xs">
                        {formatCellValue(row[header])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Term 1 Sample Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Term 1 2026 Sample Data (First 10 rows)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {structure.columns.slice(0, 10).map((header) => (
                    <TableHead key={header} className="whitespace-nowrap text-xs">
                      {header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {structure.term1Data.map((row, index) => (
                  <TableRow key={index}>
                    {structure.columns.slice(0, 10).map((header) => (
                      <TableCell key={header} className="whitespace-nowrap text-xs">
                        {formatCellValue(row[header])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button onClick={analyzeExcelStructure} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Re-analyze
        </Button>
      </div>
    </div>
  );
};

export default ExcelStructureAnalyzer;
