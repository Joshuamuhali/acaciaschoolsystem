import { useState, useEffect, useCallback } from 'react';
import {
  DashboardStats,
  GradeCount,
  PaymentRecord,
  FeeTypeStat,
  OtherFeesBreakdown,
  TransportStats
} from '@/services/datasource/types';
import { dataSourceManager } from '@/services/datasource';

interface UseDashboardDataReturn {
  stats: DashboardStats | null;
  gradeCounts: GradeCount[];
  installments: PaymentRecord[];
  feeTypeStats: FeeTypeStat[];
  otherFeesBreakdown: OtherFeesBreakdown | null;
  transportStats: TransportStats | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useDashboardData(autoFetch = true): UseDashboardDataReturn {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [gradeCounts, setGradeCounts] = useState<GradeCount[]>([]);
  const [installments, setInstallments] = useState<PaymentRecord[]>([]);
  const [feeTypeStats, setFeeTypeStats] = useState<FeeTypeStat[]>([]);
  const [otherFeesBreakdown, setOtherFeesBreakdown] = useState<OtherFeesBreakdown | null>(null);
  const [transportStats, setTransportStats] = useState<TransportStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [
        dashboardStats,
        grades,
        payments,
        feeStats,
        otherFees,
        transport,
      ] = await Promise.all([
        dataSourceManager.getDashboardStats(),
        dataSourceManager.getGradeCounts(),
        dataSourceManager.getInstallments(),
        dataSourceManager.getFeeTypeStats(),
        dataSourceManager.getOtherFeesBreakdown(),
        dataSourceManager.getTransportStats(),
      ]);

      setStats(dashboardStats);
      setGradeCounts(grades);
      setInstallments(payments);
      setFeeTypeStats(feeStats);
      setOtherFeesBreakdown(otherFees);
      setTransportStats(transport);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch dashboard data';
      setError(errorMessage);
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const reload = useCallback(async () => {
    await fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    if (autoFetch) {
      fetchDashboardData();
    }
  }, [autoFetch, fetchDashboardData]);

  return {
    stats,
    gradeCounts,
    installments,
    feeTypeStats,
    otherFeesBreakdown,
    transportStats,
    loading,
    error,
    reload,
  };
}

export function useDashboardStats(autoFetch = true) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await dataSourceManager.getDashboardStats();
      setStats(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch dashboard stats';
      setError(errorMessage);
      console.error('Failed to fetch dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const reload = useCallback(async () => {
    await fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (autoFetch) {
      fetchStats();
    }
  }, [autoFetch, fetchStats]);

  return {
    stats,
    loading,
    error,
    reload,
  };
}
