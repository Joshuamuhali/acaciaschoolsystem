import { useQuery } from '@tanstack/react-query'
import { balanceService } from '@/services/balance'
import { PaymentStatusView } from '@/types/enums'

export function usePupilBalances(filters?: {
  gradeId?: string;
  paymentStatus?: PaymentStatusView;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ['balancePerPupil', filters],
    queryFn: () => balanceService.getPupilBalances(filters),
  })
}

export function usePupilBalance(pupilId: string) {
  return useQuery({
    queryKey: ['balancePerPupil', pupilId],
    queryFn: () => balanceService.getPupilBalance(pupilId),
    enabled: !!pupilId
  })
}

export function useGradeSummary(filters?: {
  gradeId?: string;
  year?: number;
}) {
  return useQuery({
    queryKey: ['gradeSummary', filters],
    queryFn: () => balanceService.getGradeSummary(filters),
  })
}

export function useSchoolSummary() {
  return useQuery({
    queryKey: ['schoolSummary'],
    queryFn: balanceService.getSchoolSummary,
  })
}

export function usePupilsByPaymentStatus(status: PaymentStatusView) {
  return useQuery({
    queryKey: ['balancePerPupil', 'status', status],
    queryFn: () => balanceService.getPupilsByPaymentStatus(status),
  })
}

export function useOverduePupils() {
  return useQuery({
    queryKey: ['balancePerPupil', 'overdue'],
    queryFn: balanceService.getOverduePupils,
  })
}

export function usePartialPaymentPupils() {
  return useQuery({
    queryKey: ['balancePerPupil', 'partial'],
    queryFn: balanceService.getPartialPaymentPupils,
  })
}

export function usePaidPupils() {
  return useQuery({
    queryKey: ['balancePerPupil', 'paid'],
    queryFn: balanceService.getPaidPupils,
  })
}

export function useCollectionStats(termNumber?: number, year?: number) {
  return useQuery({
    queryKey: ['collectionStats', termNumber, year],
    queryFn: () => balanceService.getCollectionStats(termNumber, year),
  })
}
