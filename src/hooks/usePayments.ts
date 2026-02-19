import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { paymentsService } from '@/services/payments'
import { PaymentStatus, TermNumber } from '@/types/enums'

export function usePayments(filters?: {
  pupilId?: string;
  termNumber?: TermNumber;
  year?: number;
  status?: PaymentStatus;
  includeDeleted?: boolean;
}) {
  return useQuery({
    queryKey: ['payments', filters],
    queryFn: () => paymentsService.getPayments(filters),
  })
}

export function useRecordPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: paymentsService.recordPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['balancePerPupil'] })
      queryClient.invalidateQueries({ queryKey: ['gradeSummary'] })
      queryClient.invalidateQueries({ queryKey: ['pendingDeletionApprovals'] })
    },
  })
}

export function useSoftDeletePayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ paymentId, reason }: { paymentId: string; reason: string }) => 
      paymentsService.softDeletePayment(paymentId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['pendingDeletionApprovals'] })
    },
  })
}

export function useApprovePaymentDeletion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: paymentsService.approvePaymentDeletion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['pendingDeletionApprovals'] })
    },
  })
}

export function useRejectPaymentDeletion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ paymentId, rejectionReason }: { paymentId: string; rejectionReason: string }) => 
      paymentsService.rejectPaymentDeletion(paymentId, rejectionReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['pendingDeletionApprovals'] })
    },
  })
}

export function usePaymentHistory(pupilId: string) {
  return useQuery({
    queryKey: ['payments', 'history', pupilId],
    queryFn: () => paymentsService.getPaymentHistory(pupilId),
    enabled: !!pupilId
  })
}

export function usePendingDeletionApprovals() {
  return useQuery({
    queryKey: ['payments', 'pendingDeletions'],
    queryFn: paymentsService.getPendingDeletionApprovals,
  })
}

export function useTotalPayments(termNumber: TermNumber, year: number) {
  return useQuery({
    queryKey: ['payments', 'total', termNumber, year],
    queryFn: () => paymentsService.getTotalPayments(termNumber, year),
  })
}
