import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';

interface ExcelData {
  [key: string]: any;
}

interface ExcelReaderProps {
  onDataLoaded?: (data: ExcelData[]) => void;
  acceptedFormats?: string[];
  maxFileSize?: number; // in MB
}

const ExcelReader: React.FC<ExcelReaderProps> = ({
  onDataLoaded,
  acceptedFormats = ['.xlsx', '.xls', '.csv'],
  maxFileSize = 10
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [preview, setPreview] = useState<ExcelData[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > maxFileSize * 1024 * 1024) {
      setError(`File size exceeds ${maxFileSize}MB limit`);
      return;
    }

    // Validate file format
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedFormats.includes(fileExtension)) {
      setError(`Invalid file format. Accepted formats: ${acceptedFormats.join(', ')}`);
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const data = await readExcelFile(file);
      setPreview(data.slice(0, 5)); // Show first 5 rows as preview
      setSuccess(`Successfully loaded ${data.length} rows from ${file.name}`);
      
      if (onDataLoaded) {
        onDataLoaded(data);
      }
    } catch (err) {
      setError(`Error reading file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const readExcelFile = (file: File): Promise<ExcelData[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });

          // Get the first worksheet
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];

          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: ''
          });

          if (jsonData.length === 0) {
            reject(new Error('Excel file is empty'));
            return;
          }

          // Convert array of arrays to array of objects
          const headers = jsonData[0] as string[];
          const rows = jsonData.slice(1) as any[][];

          const result = rows.map((row, index) => {
            const obj: ExcelData = { _rowNumber: index + 2 }; // Excel row numbers start from 2
            headers.forEach((header, colIndex) => {
              obj[header] = row[colIndex] || '';
            });
            return obj;
          }).filter(row => {
            // Filter out completely empty rows
            return Object.values(row).some(value => value !== '' && value !== null && value !== undefined);
          });

          resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const formatCellValue = (value: any): string => {
    if (value === null || value === undefined || value === '') return '-';
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'string') return value.length > 20 ? value.substring(0, 20) + '...' : value;
    return String(value);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5" />
          Excel Data Reader
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Upload */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedFormats.join(',')}
            onChange={handleFileUpload}
            className="hidden"
          />
          
          <div className="space-y-4">
            <Upload className="w-12 h-12 text-gray-400 mx-auto" />
            <div>
              <p className="text-lg font-medium text-gray-900">
                Upload Excel File
              </p>
              <p className="text-sm text-gray-500">
                Supported formats: {acceptedFormats.join(', ')} (Max: {maxFileSize}MB)
              </p>
            </div>
            
            <Button 
              onClick={handleButtonClick}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? 'Reading...' : 'Choose File'}
            </Button>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-green-700 text-sm">{success}</span>
          </div>
        )}

        {/* Preview */}
        {preview.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Preview (First 5 rows):</h3>
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {Object.keys(preview[0]).map((header) => (
                        <th
                          key={header}
                          className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {preview.map((row, index) => (
                      <tr key={index}>
                        {Object.values(row).map((value, cellIndex) => (
                          <td
                            key={cellIndex}
                            className="px-4 py-2 whitespace-nowrap text-sm text-gray-900"
                          >
                            {formatCellValue(value)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ExcelReader;
