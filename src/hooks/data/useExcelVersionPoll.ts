import { useEffect, useRef, useCallback } from 'react';
import { useDataSource } from '@/context/DataSourceContext';
import { DEFAULT_DATA_SOURCE_CONFIG } from '@/core/config/dataSource';

interface UseExcelVersionPollOptions {
  enabled?: boolean;
  interval?: number;
  onVersionChange?: () => void;
}

export function useExcelVersionPoll(options: UseExcelVersionPollOptions = {}) {
  const { source, healthCheck } = useDataSource();
  const { enabled = true, interval = DEFAULT_DATA_SOURCE_CONFIG.versionCheckInterval, onVersionChange } = options;
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastVersionRef = useRef<string | null>(null);

  const checkVersion = useCallback(async () => {
    if (source !== 'excel') return;

    try {
      // Try version.json first, fallback to file HEAD request
      let currentVersion: string;
      
      try {
        const response = await fetch('/data/version.json');
        if (response.ok) {
          const version = await response.json();
          currentVersion = version.lastUpdated;
        } else {
          throw new Error('Version file not found');
        }
      } catch {
        // Fallback: use file modification time
        const fileResponse = await fetch(DEFAULT_DATA_SOURCE_CONFIG.excelFilePath, { method: 'HEAD' });
        if (fileResponse.ok) {
          const lastModified = fileResponse.headers.get('last-modified');
          currentVersion = lastModified || new Date().toISOString();
        } else {
          throw new Error('Excel file not found');
        }
      }

      if (lastVersionRef.current && lastVersionRef.current !== currentVersion) {
        // Version changed
        lastVersionRef.current = currentVersion;
        
        // Trigger health check which will refresh Excel data
        await healthCheck();
        
        // Call custom callback
        if (onVersionChange) {
          onVersionChange();
        }
      } else if (!lastVersionRef.current) {
        // First time seeing version
        lastVersionRef.current = currentVersion;
      }
    } catch (error) {
      console.warn('Failed to check Excel version:', error);
    }
  }, [source, healthCheck, onVersionChange]);

  useEffect(() => {
    if (!enabled || source !== 'excel') {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Start polling
    intervalRef.current = setInterval(checkVersion, interval);

    // Initial check
    checkVersion();

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, source, interval, checkVersion]);

  // Manual check function
  const manualCheck = useCallback(() => {
    return checkVersion();
  }, [checkVersion]);

  return {
    isPolling: enabled && source === 'excel',
    manualCheck,
  };
}
