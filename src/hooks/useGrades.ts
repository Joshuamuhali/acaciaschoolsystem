import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'

// Define types manually to avoid generated type issues
interface Grade {
  id: string;
  name: string;
  created_at: string;
}

interface GradeInsert {
  id?: string;
  name: string;
  created_at?: string;
}

interface GradeUpdate {
  id?: string;
  name?: string;
  created_at?: string;
}

export const gradesService = {
  async getGrades() {
    const { data, error } = await supabase
      .from('grades')
      .select('*')
      .order('name', { ascending: true })

    if (error) throw error
    return data as Grade[]
  },

  async getGrade(id: string) {
    const { data, error } = await supabase
      .from('grades')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data as Grade
  },

  async createGrade(grade: GradeInsert) {
    const { data, error } = await supabase
      .from('grades')
      .insert([grade])
      .select()
      .single()

    if (error) throw error
    return data as Grade
  },

  async updateGrade(id: string, updates: GradeUpdate) {
    const { data, error } = await supabase
      .from('grades')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as Grade
  },

  async deleteGrade(id: string) {
    const { error } = await supabase
      .from('grades')
      .delete()
      .eq('id', id)

    if (error) throw error
    return true
  }
}

export function useGrades() {
  return useQuery({
    queryKey: ['grades'],
    queryFn: gradesService.getGrades,
  })
}

export function useGrade(id: string) {
  return useQuery({
    queryKey: ['grade', id],
    queryFn: () => gradesService.getGrade(id),
    enabled: !!id
  })
}

export function useCreateGrade() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: gradesService.createGrade,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grades'] })
      queryClient.invalidateQueries({ queryKey: ['pupils'] })
    },
  })
}

export function useUpdateGrade() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: GradeUpdate }) => 
      gradesService.updateGrade(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grades'] })
      queryClient.invalidateQueries({ queryKey: ['pupils'] })
    },
  })
}

export function useDeleteGrade() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: gradesService.deleteGrade,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grades'] })
      queryClient.invalidateQueries({ queryKey: ['pupils'] })
    },
  })
}
