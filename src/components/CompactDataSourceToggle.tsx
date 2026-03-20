import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Database, FileSpreadsheet, ChevronDown } from 'lucide-react';
import { useDataSourceToggle } from '@/context/DataSourceContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const CompactDataSourceToggle: React.FC = () => {
  const { currentSource, toggle, isLoading, isHealthy } = useDataSourceToggle();

  const getSourceIcon = () => {
    return currentSource === 'excel' ? 
      <FileSpreadsheet className="w-4 h-4 text-green-600" /> : 
      <Database className="w-4 h-4 text-blue-600" />;
  };

  const getSourceLabel = () => {
    return currentSource === 'excel' ? 'Excel' : 'Supabase';
  };

  const getSourceColor = () => {
    return currentSource === 'excel' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800';
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          {getSourceIcon()}
          <span className="hidden sm:inline">{getSourceLabel()}</span>
          <Badge variant="secondary" className={`text-xs ${getSourceColor()}`}>
            {getSourceLabel()}
          </Badge>
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="px-2 py-1.5 text-sm font-medium">
          Data Source
        </div>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem
          onClick={() => toggle()}
          disabled={isLoading || currentSource === 'excel'}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-green-600" />
            <span>Excel File</span>
          </div>
          {currentSource === 'excel' && (
            <Badge variant="default" className="text-xs">Active</Badge>
          )}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => toggle()}
          disabled={isLoading || currentSource === 'supabase'}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-600" />
            <span>Supabase Database</span>
          </div>
          {currentSource === 'supabase' && (
            <Badge variant="default" className="text-xs">Active</Badge>
          )}
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        
        <div className="px-2 py-1.5 text-xs text-gray-500">
          {currentSource === 'excel' 
            ? 'Reading from Excel file (read-only)' 
            : 'Reading from Supabase (full access)'
          }
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default CompactDataSourceToggle;
