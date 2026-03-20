import { IDataSource, DataSource, DataSourceError } from './types';
import { ExcelDataSource } from './excelDataSource';
import { SupabaseDataSource } from './supabaseDataSource';
import { DEFAULT_DATA_SOURCE_CONFIG, DATA_SOURCE_STORAGE_KEY } from '@/core/config/dataSource';

export class DataSourceManager {
  private static instance: DataSourceManager;
  private excelDataSource: ExcelDataSource;
  private supabaseDataSource: SupabaseDataSource;
  private currentSource: DataSource;
  private filePath: string;

  private constructor() {
    this.currentSource = this.getStoredDataSource() || DEFAULT_DATA_SOURCE_CONFIG.source;
    this.filePath = DEFAULT_DATA_SOURCE_CONFIG.excelFilePath;
    this.excelDataSource = new ExcelDataSource(this.filePath);
    this.supabaseDataSource = new SupabaseDataSource();
  }

  static getInstance(): DataSourceManager {
    if (!DataSourceManager.instance) {
      DataSourceManager.instance = new DataSourceManager();
    }
    return DataSourceManager.instance;
  }

  private getStoredDataSource(): DataSource | null {
    try {
      const stored = localStorage.getItem(DATA_SOURCE_STORAGE_KEY);
      return stored as DataSource;
    } catch (error) {
      console.warn('Failed to read stored data source:', error);
      return null;
    }
  }

  private setStoredDataSource(source: DataSource): void {
    try {
      localStorage.setItem(DATA_SOURCE_STORAGE_KEY, source);
    } catch (error) {
      console.warn('Failed to store data source:', error);
    }
  }

  getCurrentDataSource(): DataSource {
    return this.currentSource;
  }

  setActiveDataSource(source: DataSource): void {
    this.currentSource = source;
    this.setStoredDataSource(source);
  }

  getActiveDataSource(): IDataSource {
    switch (this.currentSource) {
      case 'excel':
        return this.excelDataSource;
      case 'supabase':
        return this.supabaseDataSource;
      default:
        throw new DataSourceError(`Unknown data source: ${this.currentSource}`, 'supabase');
    }
  }

  async healthCheck(): Promise<{ source: DataSource; healthy: boolean; error?: string }> {
    const activeSource = this.getActiveDataSource();
    
    try {
      const healthy = await activeSource.healthCheck();
      return {
        source: this.currentSource,
        healthy
      };
    } catch (error) {
      return {
        source: this.currentSource,
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async switchDataSource(source: DataSource): Promise<void> {
    // Test the new source before switching
    const testSource = source === 'excel' ? this.excelDataSource : this.supabaseDataSource;
    
    try {
      const healthy = await testSource.healthCheck();
      if (!healthy) {
        throw new DataSourceError(
          `Cannot switch to ${source}: Health check failed`,
          source
        );
      }
    } catch (error) {
      throw new DataSourceError(
        `Cannot switch to ${source}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        source
      );
    }

    this.setActiveDataSource(source);
  }

  // Convenience methods that delegate to the active data source
  async getPupils(gradeId?: string) {
    return this.getActiveDataSource().getPupils(gradeId);
  }

  async getPupil(id: string) {
    return this.getActiveDataSource().getPupil(id);
  }

  async createPupil(pupil: any) {
    return this.getActiveDataSource().createPupil(pupil);
  }

  async updatePupil(id: string, updates: any) {
    return this.getActiveDataSource().updatePupil(id, updates);
  }

  async deletePupil(id: string) {
    return this.getActiveDataSource().deletePupil(id);
  }

  async getGrades() {
    return this.getActiveDataSource().getGrades();
  }

  async getGrade(id: string) {
    return this.getActiveDataSource().getGrade(id);
  }

  async createGrade(grade: any) {
    return this.getActiveDataSource().createGrade(grade);
  }

  async updateGrade(id: string, updates: any) {
    return this.getActiveDataSource().updateGrade(id, updates);
  }

  async deleteGrade(id: string) {
    return this.getActiveDataSource().deleteGrade(id);
  }

  async getGradeCounts() {
    return this.getActiveDataSource().getGradeCounts();
  }

  async getPayments(pupilId?: string) {
    return this.getActiveDataSource().getPayments(pupilId);
  }

  async getPayment(id: string) {
    return this.getActiveDataSource().getPayment(id);
  }

  async createPayment(payment: any) {
    return this.getActiveDataSource().createPayment(payment);
  }

  async updatePayment(id: string, updates: any) {
    return this.getActiveDataSource().updatePayment(id, updates);
  }

  async deletePayment(id: string) {
    return this.getActiveDataSource().deletePayment(id);
  }

  async getInstallments() {
    return this.getActiveDataSource().getInstallments();
  }

  async getEnrollments(pupilId?: string) {
    return this.getActiveDataSource().getEnrollments(pupilId);
  }

  async getEnrollment(id: number) {
    return this.getActiveDataSource().getEnrollment(id);
  }

  async createEnrollment(enrollment: any) {
    return this.getActiveDataSource().createEnrollment(enrollment);
  }

  async updateEnrollment(id: number, updates: any) {
    return this.getActiveDataSource().updateEnrollment(id, updates);
  }

  async deleteEnrollment(id: number) {
    return this.getActiveDataSource().deleteEnrollment(id);
  }

  async getTerms() {
    return this.getActiveDataSource().getTerms();
  }

  async getTerm(id: string) {
    return this.getActiveDataSource().getTerm(id);
  }

  async createTerm(term: any) {
    return this.getActiveDataSource().createTerm(term);
  }

  async updateTerm(id: string, updates: any) {
    return this.getActiveDataSource().updateTerm(id, updates);
  }

  async deleteTerm(id: string) {
    return this.getActiveDataSource().deleteTerm(id);
  }

  async getParents() {
    return this.getActiveDataSource().getParents();
  }

  async getParent(id: string) {
    return this.getActiveDataSource().getParent(id);
  }

  async createParent(parent: any) {
    return this.getActiveDataSource().createParent(parent);
  }

  async updateParent(id: string, updates: any) {
    return this.getActiveDataSource().updateParent(id, updates);
  }

  async deleteParent(id: string) {
    return this.getActiveDataSource().deleteParent(id);
  }

  async getDashboardStats() {
    return this.getActiveDataSource().getDashboardStats();
  }

  async getOtherFeesBreakdown() {
    return this.getActiveDataSource().getOtherFeesBreakdown();
  }

  async getFeeTypeStats(feeType?: string) {
    return this.getActiveDataSource().getFeeTypeStats(feeType);
  }

  async getFeeTypeNames() {
    return this.getActiveDataSource().getFeeTypeNames();
  }

  async getTransportStats() {
    return this.getActiveDataSource().getTransportStats();
  }

  async getTransportRoutes() {
    return this.getActiveDataSource().getTransportRoutes();
  }
}

// Export singleton instance
export const dataSourceManager = DataSourceManager.getInstance();

// Export convenience functions for backward compatibility
export const getPupils = (gradeId?: string) => dataSourceManager.getPupils(gradeId);
export const getPupil = (id: string) => dataSourceManager.getPupil(id);
export const createPupil = (pupil: any) => dataSourceManager.createPupil(pupil);
export const updatePupil = (id: string, updates: any) => dataSourceManager.updatePupil(id, updates);
export const deletePupil = (id: string) => dataSourceManager.deletePupil(id);

export const getGrades = () => dataSourceManager.getGrades();
export const getGrade = (id: string) => dataSourceManager.getGrade(id);
export const createGrade = (grade: any) => dataSourceManager.createGrade(grade);
export const updateGrade = (id: string, updates: any) => dataSourceManager.updateGrade(id, updates);
export const deleteGrade = (id: string) => dataSourceManager.deleteGrade(id);
export const getGradeCounts = () => dataSourceManager.getGradeCounts();

export const getPayments = (pupilId?: string) => dataSourceManager.getPayments(pupilId);
export const getPayment = (id: string) => dataSourceManager.getPayment(id);
export const createPayment = (payment: any) => dataSourceManager.createPayment(payment);
export const updatePayment = (id: string, updates: any) => dataSourceManager.updatePayment(id, updates);
export const deletePayment = (id: string) => dataSourceManager.deletePayment(id);
export const getInstallments = () => dataSourceManager.getInstallments();

export const getEnrollments = (pupilId?: string) => dataSourceManager.getEnrollments(pupilId);
export const getEnrollment = (id: number) => dataSourceManager.getEnrollment(id);
export const createEnrollment = (enrollment: any) => dataSourceManager.createEnrollment(enrollment);
export const updateEnrollment = (id: number, updates: any) => dataSourceManager.updateEnrollment(id, updates);
export const deleteEnrollment = (id: number) => dataSourceManager.deleteEnrollment(id);

export const getTerms = () => dataSourceManager.getTerms();
export const getTerm = (id: string) => dataSourceManager.getTerm(id);
export const createTerm = (term: any) => dataSourceManager.createTerm(term);
export const updateTerm = (id: string, updates: any) => dataSourceManager.updateTerm(id, updates);
export const deleteTerm = (id: string) => dataSourceManager.deleteTerm(id);

export const getParents = () => dataSourceManager.getParents();
export const getParent = (id: string) => dataSourceManager.getParent(id);
export const createParent = (parent: any) => dataSourceManager.createParent(parent);
export const updateParent = (id: string, updates: any) => dataSourceManager.updateParent(id, updates);
export const deleteParent = (id: string) => dataSourceManager.deleteParent(id);

export const getDashboardStats = () => dataSourceManager.getDashboardStats();
export const getOtherFeesBreakdown = () => dataSourceManager.getOtherFeesBreakdown();
export const getFeeTypeStats = (feeType?: string) => dataSourceManager.getFeeTypeStats(feeType);
export const getFeeTypeNames = () => dataSourceManager.getFeeTypeNames();
export const getTransportStats = () => dataSourceManager.getTransportStats();
export const getTransportRoutes = () => dataSourceManager.getTransportRoutes();

export const switchDataSource = (source: DataSource) => dataSourceManager.switchDataSource(source);
export const getCurrentDataSource = () => dataSourceManager.getCurrentDataSource();
export const healthCheck = () => dataSourceManager.healthCheck();
