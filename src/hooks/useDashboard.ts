import { useQuery } from '@tanstack/react-query'
import { dashboardService } from '@/services/dashboard'
import { TermNumber } from '@/types/enums'

export function useDashboardStats(filters?: {
  year?: number;
  termNumber?: TermNumber;
}) {
  return useQuery({
    queryKey: ['dashboardStats', filters],
    queryFn: () => dashboardService.getDashboardStats(filters),
  })
}

export function useGradePerformanceMetrics() {
  return useQuery({
    queryKey: ['gradePerformanceMetrics'],
    queryFn: dashboardService.getGradePerformanceMetrics,
  })
}

export function usePaymentTrends(year?: number) {
  return useQuery({
    queryKey: ['paymentTrends', year],
    queryFn: () => dashboardService.getPaymentTrends(year),
  })
}

export function useMonthlyCollections(year?: number) {
  return useQuery({
    queryKey: ['monthlyCollections', year],
    queryFn: () => dashboardService.getMonthlyCollections(year),
  })
}

export function useTopPerformingGrades(limit = 5) {
  return useQuery({
    queryKey: ['topPerformingGrades', limit],
    queryFn: () => dashboardService.getTopPerformingGrades(limit),
  })
}

export function useGradesNeedingAttention(threshold = 50) {
  return useQuery({
    queryKey: ['gradesNeedingAttention', threshold],
    queryFn: () => dashboardService.getGradesNeedingAttention(threshold),
  })
}

export function useEnrollmentStats() {
  return useQuery({
    queryKey: ['enrollmentStats'],
    queryFn: dashboardService.getEnrollmentStats,
  })
}

export function useFinancialHealth() {
  return useQuery({
    queryKey: ['financialHealth'],
    queryFn: dashboardService.getFinancialHealth,
  })
}

export function useRecentActivity(limit = 10) {
  return useQuery({
    queryKey: ['recentActivity', limit],
    queryFn: () => dashboardService.getRecentActivity(limit),
  })
}
