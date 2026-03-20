import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Database, FileSpreadsheet, Info, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { useDataSourceToggle } from '@/context/DataSourceContext';
import { DataSource } from '@/core/config/dataSource';

interface DataSourceToggleProps {
  compact?: boolean;
  showHealthStatus?: boolean;
}

export function DataSourceToggle({ compact = false, showHealthStatus = true }: DataSourceToggleProps) {
  const { currentSource, toggle, isLoading, error, clearError, isHealthy } = useDataSourceToggle();

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={toggle}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : currentSource === 'excel' ? (
            <FileSpreadsheet className="w-4 h-4 text-green-600" />
          ) : (
            <Database className="w-4 h-4 text-blue-600" />
          )}
          <span className="hidden sm:inline">
            {currentSource === 'excel' ? 'Excel' : 'Supabase'}
          </span>
          <Badge variant={currentSource === 'excel' ? 'default' : 'secondary'} className="text-xs">
            {currentSource === 'excel' ? 'Excel' : 'Supabase'}
          </Badge>
        </Button>
        
        {showHealthStatus && (
          <div className="flex items-center gap-1">
            {isHealthy ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-500" />
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Data Source Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
            <Button variant="outline" size="sm" onClick={clearError} className="ml-2">
              Dismiss
            </Button>
          </Alert>
        )}

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Choose where the dashboard reads its data from. Excel is read-only, while Supabase allows full CRUD operations.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-6 h-6 text-green-600" />
              <div>
                <h3 className="font-medium">Excel File</h3>
                <p className="text-sm text-gray-500">
                  Reads from "/data/school.xlsx" with automatic refresh
                </p>
                <div className="flex gap-2 mt-1">
                  <Badge variant="outline">Read-only</Badge>
                  <Badge variant="outline">Local File</Badge>
                  <Badge variant="outline">Auto-refresh</Badge>
                </div>
              </div>
            </div>
            <Button
              onClick={() => toggle()}
              disabled={isLoading || currentSource === 'excel'}
              className={currentSource === 'excel' ? 'bg-green-600' : ''}
            >
              {isLoading && currentSource === 'excel' ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {currentSource === 'excel' ? 'Active' : 'Switch to Excel'}
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Database className="w-6 h-6 text-blue-600" />
              <div>
                <h3 className="font-medium">Supabase Database</h3>
                <p className="text-sm text-gray-500">
                  Cloud database with full CRUD operations
                </p>
                <div className="flex gap-2 mt-1">
                  <Badge variant="outline">Read & Write</Badge>
                  <Badge variant="outline">Cloud Storage</Badge>
                  <Badge variant="outline">Multi-user</Badge>
                </div>
              </div>
            </div>
            <Button
              onClick={() => toggle()}
              disabled={isLoading || currentSource === 'supabase'}
              className={currentSource === 'supabase' ? 'bg-blue-600' : ''}
            >
              {isLoading && currentSource === 'supabase' ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {currentSource === 'supabase' ? 'Active' : 'Switch to Supabase'}
            </Button>
          </div>
        </div>

        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              <strong>Current Source:</strong>{' '}
              <Badge variant={currentSource === 'excel' ? 'default' : 'secondary'}>
                {currentSource === 'excel' ? 'Excel File' : 'Supabase Database'}
              </Badge>
            </p>
            {showHealthStatus && (
              <div className="flex items-center gap-1">
                {isHealthy ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-600">Healthy</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <span className="text-sm text-red-600">Error</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="text-xs text-gray-500 space-y-1">
          <p>• Excel mode reads directly from the local Excel file with automatic refresh</p>
          <p>• Supabase mode uses the cloud database with full functionality</p>
          <p>• Switching sources will reload the dashboard with the new data</p>
        </div>
      </CardContent>
    </Card>
  );
}

// Compact version for navbar
export function CompactDataSourceToggle() {
  return <DataSourceToggle compact={true} showHealthStatus={true} />;
}
