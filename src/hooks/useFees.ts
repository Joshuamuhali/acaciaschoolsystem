import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { feesService } from '@/services/fees'
import { TermNumber } from '@/types/enums'

export function useFees(filters?: {
  gradeId?: string;
  termNumber?: TermNumber;
  year?: number;
  isActive?: boolean;
}) {
  return useQuery({
    queryKey: ['fees', filters],
    queryFn: () => feesService.getFees(filters),
  })
}

export function useActiveFees(termNumber: TermNumber, year: number) {
  return useQuery({
    queryKey: ['fees', 'active', termNumber, year],
    queryFn: () => feesService.getActiveFees(termNumber, year),
  })
}

export function useFee(gradeId: string, termNumber: TermNumber, year: number) {
  return useQuery({
    queryKey: ['fee', gradeId, termNumber, year],
    queryFn: () => feesService.getFee(gradeId, termNumber, year),
    enabled: !!gradeId && !!termNumber && !!year
  })
}

export function useCreateFee() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: feesService.createFee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fees'] })
      queryClient.invalidateQueries({ queryKey: ['gradeSummary'] })
      queryClient.invalidateQueries({ queryKey: ['balancePerPupil'] })
    },
  })
}

export function useUpdateFee() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => 
      feesService.updateFee(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fees'] })
      queryClient.invalidateQueries({ queryKey: ['gradeSummary'] })
      queryClient.invalidateQueries({ queryKey: ['balancePerPupil'] })
    },
  })
}

export function useToggleFeeStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => 
      feesService.toggleFeeStatus(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fees'] })
      queryClient.invalidateQueries({ queryKey: ['gradeSummary'] })
      queryClient.invalidateQueries({ queryKey: ['balancePerPupil'] })
    },
  })
}

export function useDeleteFee() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: feesService.deleteFee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fees'] })
      queryClient.invalidateQueries({ queryKey: ['gradeSummary'] })
      queryClient.invalidateQueries({ queryKey: ['balancePerPupil'] })
    },
  })
}

export function useCurrentTermFees(year: number) {
  return useQuery({
    queryKey: ['fees', 'currentTerm', year],
    queryFn: () => feesService.getCurrentTermFees(year),
  })
}

export function useTotalExpectedFees(termNumber: TermNumber, year: number) {
  return useQuery({
    queryKey: ['fees', 'total', termNumber, year],
    queryFn: () => feesService.getTotalExpectedFees(termNumber, year),
  })
}
