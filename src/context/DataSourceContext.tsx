import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { DataSource, DEFAULT_DATA_SOURCE_CONFIG } from '@/core/config/dataSource';
import { dataSourceManager } from '@/services/datasource';
import { DataSourceError } from '@/services/datasource/types';

interface DataSourceState {
  source: DataSource;
  isLoading: boolean;
  error: string | null;
  healthStatus: {
    source: DataSource;
    healthy: boolean;
    error?: string;
  } | null;
}

type DataSourceAction =
  | { type: 'SET_SOURCE'; payload: DataSource }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_HEALTH_STATUS'; payload: { source: DataSource; healthy: boolean; error?: string } }
  | { type: 'SWITCH_SOURCE'; payload: DataSource };

const initialState: DataSourceState = {
  source: dataSourceManager.getCurrentDataSource(),
  isLoading: false,
  error: null,
  healthStatus: null,
};

function dataSourceReducer(state: DataSourceState, action: DataSourceAction): DataSourceState {
  switch (action.type) {
    case 'SET_SOURCE':
      return {
        ...state,
        source: action.payload,
        error: null,
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };
    case 'SET_HEALTH_STATUS':
      return {
        ...state,
        healthStatus: action.payload,
      };
    case 'SWITCH_SOURCE':
      return {
        ...state,
        source: action.payload,
        isLoading: true,
        error: null,
      };
    default:
      return state;
  }
}

interface DataSourceContextType extends DataSourceState {
  switchSource: (source: DataSource) => Promise<void>;
  healthCheck: () => Promise<void>;
  clearError: () => void;
  isHealthy: boolean;
}

const DataSourceContext = createContext<DataSourceContextType | undefined>(undefined);

interface DataSourceProviderProps {
  children: ReactNode;
}

export function DataSourceProvider({ children }: DataSourceProviderProps) {
  const [state, dispatch] = useReducer(dataSourceReducer, initialState);

  const switchSource = async (source: DataSource) => {
    if (state.source === source) return;

    dispatch({ type: 'SWITCH_SOURCE', payload: source });

    try {
      await dataSourceManager.switchDataSource(source);
      dispatch({ type: 'SET_SOURCE', payload: source });
      
      // Health check after switching
      await healthCheck();
    } catch (error) {
      const errorMessage = error instanceof DataSourceError 
        ? error.message 
        : 'Failed to switch data source';
      
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      console.error('Failed to switch data source:', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const healthCheck = async () => {
    try {
      const health = await dataSourceManager.healthCheck();
      dispatch({ type: 'SET_HEALTH_STATUS', payload: health });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Health check failed';
      dispatch({ type: 'SET_HEALTH_STATUS', payload: {
        source: state.source,
        healthy: false,
        error: errorMessage
      }});
    }
  };

  const clearError = () => {
    dispatch({ type: 'SET_ERROR', payload: null });
  };

  const isHealthy = state.healthStatus?.healthy ?? true;

  // Initial health check
  useEffect(() => {
    healthCheck();
  }, []);

  // Periodic health check for Excel mode (version polling)
  useEffect(() => {
    if (state.source !== 'excel') return;

    const interval = setInterval(() => {
      healthCheck();
    }, DEFAULT_DATA_SOURCE_CONFIG.versionCheckInterval);

    return () => clearInterval(interval);
  }, [state.source]);

  const value: DataSourceContextType = {
    ...state,
    switchSource,
    healthCheck,
    clearError,
    isHealthy,
  };

  return (
    <DataSourceContext.Provider value={value}>
      {children}
    </DataSourceContext.Provider>
  );
}

export function useDataSource(): DataSourceContextType {
  const context = useContext(DataSourceContext);
  if (context === undefined) {
    throw new Error('useDataSource must be used within a DataSourceProvider');
  }
  return context;
}

export function useActiveDataSource() {
  const { source, isHealthy, isLoading, error } = useDataSource();
  return { source, isHealthy, isLoading, error };
}

export function useDataSourceToggle() {
  const { source, switchSource, isLoading, error, clearError, isHealthy } = useDataSource();
  
  const toggle = async () => {
    const newSource = source === 'excel' ? 'supabase' : 'excel';
    await switchSource(newSource);
  };

  return {
    currentSource: source,
    toggle,
    isLoading,
    error,
    clearError,
    isHealthy,
  };
}
