import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { pupilsService } from '@/services/pupils'
import { PupilStatus } from '@/types/enums'

export function usePupils(filters?: { 
  status?: PupilStatus; 
  gradeId?: string; 
  search?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ['pupils', filters],
    queryFn: () => pupilsService.getPupils(filters),
  })
}

export function usePupil(id: string) {
  return useQuery({
    queryKey: ['pupil', id],
    queryFn: () => pupilsService.getPupilById(id),
    enabled: !!id
  })
}

export function useCreatePupil() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: pupilsService.createPupil,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pupils'] })
      queryClient.invalidateQueries({ queryKey: ['gradeSummary'] })
      queryClient.invalidateQueries({ queryKey: ['balancePerPupil'] })
    },
  })
}

export function useUpdatePupil() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => 
      pupilsService.updatePupil(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pupils'] })
      queryClient.invalidateQueries({ queryKey: ['gradeSummary'] })
      queryClient.invalidateQueries({ queryKey: ['balancePerPupil'] })
    },
  })
}

export function useDeletePupil() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: pupilsService.deletePupil,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pupils'] })
      queryClient.invalidateQueries({ queryKey: ['gradeSummary'] })
      queryClient.invalidateQueries({ queryKey: ['balancePerPupil'] })
    },
  })
}

export function usePupilsByStatus(status: PupilStatus) {
  return useQuery({
    queryKey: ['pupils', 'status', status],
    queryFn: () => pupilsService.getPupilsByStatus(status),
  })
}

export function useSearchPupils(searchTerm: string) {
  return useQuery({
    queryKey: ['pupils', 'search', searchTerm],
    queryFn: () => pupilsService.searchPupils(searchTerm),
    enabled: !!searchTerm
  })
}

export function useActivePupilsCount() {
  return useQuery({
    queryKey: ['pupils', 'count', 'active'],
    queryFn: pupilsService.getActivePupilsCount,
  })
}

export function usePupilCountByGrade(gradeId: string) {
  return useQuery({
    queryKey: ['pupils', 'count', 'grade', gradeId],
    queryFn: () => pupilsService.getPupilCountByGrade(gradeId),
    enabled: !!gradeId
  })
}
