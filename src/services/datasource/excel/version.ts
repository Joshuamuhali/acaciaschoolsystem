import { DEFAULT_DATA_SOURCE_CONFIG } from '@/core/config/dataSource';

export interface ExcelVersion {
  version: string;
  lastUpdated: string;
  description: string;
}

export class ExcelVersionManager {
  private currentVersion: ExcelVersion | null = null;
  private lastCheckTime = 0;
  private checkInterval: number;

  constructor() {
    this.checkInterval = DEFAULT_DATA_SOURCE_CONFIG.versionCheckInterval;
  }

  async getCurrentVersion(): Promise<ExcelVersion> {
    try {
      // Try version.json first, if not found, use file modification time
      const response = await fetch('/data/version.json');
      if (response.ok) {
        const version = await response.json();
        this.currentVersion = version;
        this.lastCheckTime = Date.now();
        return version;
      }
      
      // Fallback: use file modification time
      const fileResponse = await fetch(DEFAULT_DATA_SOURCE_CONFIG.excelFilePath, { method: 'HEAD' });
      if (fileResponse.ok) {
        const lastModified = fileResponse.headers.get('last-modified');
        const timestamp = lastModified ? new Date(lastModified).getTime() : Date.now();
        
        const fallbackVersion: ExcelVersion = {
          version: '1.0.0',
          lastUpdated: new Date(timestamp).toISOString(),
          description: 'SCHOOL RECONCILIATION 2025.xlsx'
        };
        
        this.currentVersion = fallbackVersion;
        this.lastCheckTime = Date.now();
        return fallbackVersion;
      }
      
      throw new Error('Failed to fetch version information');
    } catch (error) {
      console.error('Error fetching Excel version:', error);
      throw new Error('Failed to fetch Excel version information');
    }
  }

  async hasVersionChanged(): Promise<boolean> {
    if (!this.currentVersion) {
      await this.getCurrentVersion();
      return true;
    }

    // Don't check too frequently
    const now = Date.now();
    if (now - this.lastCheckTime < this.checkInterval) {
      return false;
    }

    try {
      const newVersion = await this.getCurrentVersion();
      return newVersion.lastUpdated !== this.currentVersion.lastUpdated;
    } catch (error) {
      console.error('Error checking version:', error);
      return false;
    }
  }

  getLastCheckTime(): number {
    return this.lastCheckTime;
  }

  getCheckInterval(): number {
    return this.checkInterval;
  }

  setCheckInterval(interval: number): void {
    this.checkInterval = interval;
  }
}
