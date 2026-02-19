import { supabase } from '@/lib/supabase/client'
import { Database } from '@/types/supabase'
import { PupilStatus } from '@/types/enums'

type Pupil = Database['public']['Tables']['pupils']['Row']
type PupilInsert = Database['public']['Tables']['pupils']['Insert']
type PupilUpdate = Database['public']['Tables']['pupils']['Update']

export const pupilsService = {
  // Fetch all pupils with their grade and parent information
  async getPupils(filters?: { 
    status?: PupilStatus; 
    gradeId?: string; 
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    let query = supabase
      .from('pupils' as any)
      .select(`
        *,
        grades!grade_id(name),
        parents!parent_id(full_name, phone_number, account_number),
        currencies!currency_id(code, symbol)
      `)
      .order('created_at', { ascending: false })

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }
    
    if (filters?.gradeId) {
      query = query.eq('grade_id', filters.gradeId)
    }
    
    if (filters?.search) {
      query = query.ilike('full_name', `%${filters.search}%`)
    }
    
    if (filters?.limit) {
      query = query.limit(filters.limit)
    }
    
    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  },

  // Fetch a single pupil by ID
  async getPupilById(id: string) {
    const { data, error } = await supabase
      .from('pupils' as any)
      .select(`
        *,
        grades!grade_id(name),
        parents!parent_id(full_name, phone_number, account_number),
        currencies!currency_id(code, symbol)
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  // Create new pupil
  async createPupil(pupil: PupilInsert) {
    const { data, error } = await supabase
      .from('pupils' as any)
      .insert([pupil])
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Update pupil
  async updatePupil(id: string, updates: PupilUpdate) {
    const { data, error } = await supabase
      .from('pupils' as any)
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Delete pupil
  async deletePupil(id: string) {
    const { error } = await supabase
      .from('pupils' as any)
      .delete()
      .eq('id', id)

    if (error) throw error
    return true
  },

  // Get pupils by status
  async getPupilsByStatus(status: PupilStatus) {
    return this.getPupils({ status })
  },

  // Search pupils by name
  async searchPupils(searchTerm: string) {
    return this.getPupils({ search: searchTerm })
  },

  // Get pupil count by grade
  async getPupilCountByGrade(gradeId: string) {
    const { count, error } = await supabase
      .from('pupils' as any)
      .select('id', { count: 'exact', head: true })
      .eq('grade_id', gradeId)
      .in('status', ['active', 'O'])

    if (error) throw error
    return count || 0
  },

  // Get active pupils count
  async getActivePupilsCount() {
    const { count, error } = await supabase
      .from('pupils' as any)
      .select('id', { count: 'exact', head: true })
      .in('status', ['active', 'O'])

    if (error) throw error
    return count || 0
  }
}
