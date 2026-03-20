export type DataSource = 'supabase' | 'excel';

export interface DataSourceConfig {
  source: DataSource;
  excelFilePath: string;
  versionCheckInterval: number; // in milliseconds
}

export const DEFAULT_DATA_SOURCE_CONFIG: DataSourceConfig = {
  source: 'excel', // Default to Excel since Supabase is not configured
  excelFilePath: '/data/SCHOOL RECONCILIATION 2025.xlsx',
  versionCheckInterval: 15000, // 15 seconds
};

export const DATA_SOURCE_STORAGE_KEY = 'school_system_data_source';
