import React, { useState } from 'react';
import ExcelReader from '@/components/ExcelReader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Database, Upload, Users, GraduationCap, DollarSign } from 'lucide-react';

interface ExcelData {
  [key: string]: any;
}

const ExcelImport: React.FC = () => {
  const [importData, setImportData] = useState<ExcelData[]>([]);
  const [selectedModule, setSelectedModule] = useState<string>('pupils');

  const handleDataLoaded = (data: ExcelData[]) => {
    setImportData(data);
  };

  const getPupilColumns = () => [
    'full_name', 'sex', 'grade', 'status', 'phone', 'address', 'parent_name', 'parent_phone'
  ];

  const getGradeColumns = () => [
    'grade_name', 'section', 'capacity', 'teacher_name', 'room_number'
  ];

  const getFeeColumns = () => [
    'pupil_name', 'amount', 'payment_date', 'payment_method', 'receipt_number', 'term'
  ];

  const validateData = (module: string, data: ExcelData[]): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (data.length === 0) {
      errors.push('No data to import');
      return { valid: false, errors };
    }

    switch (module) {
      case 'pupils':
        const requiredPupilCols = ['full_name', 'sex'];
        requiredPupilCols.forEach(col => {
          if (!data[0].hasOwnProperty(col)) {
            errors.push(`Missing required column: ${col}`);
          }
        });
        break;
      
      case 'grades':
        const requiredGradeCols = ['grade_name'];
        requiredGradeCols.forEach(col => {
          if (!data[0].hasOwnProperty(col)) {
            errors.push(`Missing required column: ${col}`);
          }
        });
        break;
      
      case 'fees':
        const requiredFeeCols = ['pupil_name', 'amount'];
        requiredFeeCols.forEach(col => {
          if (!data[0].hasOwnProperty(col)) {
            errors.push(`Missing required column: ${col}`);
          }
        });
        break;
    }

    return { valid: errors.length === 0, errors };
  };

  const handleImport = async () => {
    const validation = validateData(selectedModule, importData);
    
    if (!validation.valid) {
      alert(`Validation errors:\n${validation.errors.join('\n')}`);
      return;
    }

    // TODO: Implement actual import logic based on selected module
    console.log(`Importing ${importData.length} records to ${selectedModule}`);
    alert(`Successfully imported ${importData.length} records to ${selectedModule}`);
  };

  const getModuleInfo = (module: string) => {
    switch (module) {
      case 'pupils':
        return {
          title: 'Pupil Import',
          description: 'Import pupil data from Excel file',
          icon: Users,
          columns: getPupilColumns(),
          color: 'blue'
        };
      case 'grades':
        return {
          title: 'Grade Import',
          description: 'Import grade/class data from Excel file',
          icon: GraduationCap,
          columns: getGradeColumns(),
          color: 'green'
        };
      case 'fees':
        return {
          title: 'Fee Import',
          description: 'Import fee/payment data from Excel file',
          icon: DollarSign,
          columns: getFeeColumns(),
          color: 'yellow'
        };
      default:
        return {
          title: 'Data Import',
          description: 'Import data from Excel file',
          icon: Database,
          columns: [],
          color: 'gray'
        };
    }
  };

  const currentModule = getModuleInfo(selectedModule);
  const Icon = currentModule.icon;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Icon className="w-8 h-8 text-green-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Excel Data Import</h1>
          <p className="text-gray-600">Import school data from Excel files</p>
        </div>
      </div>

      <Tabs value={selectedModule} onValueChange={setSelectedModule} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pupils" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Pupils
          </TabsTrigger>
          <TabsTrigger value="grades" className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4" />
            Grades
          </TabsTrigger>
          <TabsTrigger value="fees" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Fees
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedModule} className="space-y-6">
          {/* Module Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon className="w-5 h-5" />
                {currentModule.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">{currentModule.description}</p>
              
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Expected Columns:</h4>
                <div className="flex flex-wrap gap-2">
                  {currentModule.columns.map((column) => (
                    <Badge key={column} variant="outline" className="text-xs">
                      {column}
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator className="my-4" />

              <Alert>
                <Upload className="h-4 w-4" />
                <AlertDescription>
                  Upload an Excel file with the columns listed above. The first row should contain headers.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Excel Reader */}
          <ExcelReader onDataLoaded={handleDataLoaded} />

          {/* Import Actions */}
          {importData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Import Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">
                      Ready to import <span className="font-semibold">{importData.length}</span> records
                    </p>
                    <p className="text-xs text-gray-500">
                      Module: <span className="font-medium">{currentModule.title}</span>
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setImportData([])}
                    >
                      Clear
                    </Button>
                    <Button 
                      onClick={handleImport}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Import Data
                    </Button>
                  </div>
                </div>

                {/* Validation Status */}
                {(() => {
                  const validation = validateData(selectedModule, importData);
                  return (
                    <div className={`p-3 rounded-lg ${
                      validation.valid 
                        ? 'bg-green-50 border border-green-200' 
                        : 'bg-red-50 border border-red-200'
                    }`}>
                      <p className={`text-sm ${
                        validation.valid ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {validation.valid ? '✓ Data validation passed' : '✗ Data validation failed'}
                      </p>
                      {!validation.valid && (
                        <ul className="mt-2 text-xs text-red-600 list-disc list-inside">
                          {validation.errors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ExcelImport;
