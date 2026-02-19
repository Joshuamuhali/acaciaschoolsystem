import { supabase } from '@/lib/supabase/client'
import { Database } from '@/types/supabase'
import { TermNumber } from '@/types/enums'

type Fee = Database['public']['Tables']['fees']['Row']
type FeeInsert = Database['public']['Tables']['fees']['Insert']
type FeeUpdate = Database['public']['Tables']['fees']['Update']

export const feesService = {
  // Manage fee structures per grade/term/year
  async getFees(filters?: {
    gradeId?: string;
    termNumber?: TermNumber;
    year?: number;
    isActive?: boolean;
  }) {
    let query = supabase
      .from('fees')
      .select(`
        *,
        grades:grade_id(name)
      `)
      .order('created_at', { ascending: false })

    if (filters?.gradeId) {
      query = query.eq('grade_id', filters.gradeId)
    }
    
    if (filters?.termNumber) {
      query = query.eq('term_number', filters.termNumber)
    }
    
    if (filters?.year) {
      query = query.eq('year', filters.year)
    }
    
    if (filters?.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  },

  // Get current active fees for all grades
  async getActiveFees(termNumber: TermNumber, year: number) {
    const { data, error } = await supabase
      .from('fees')
      .select(`
        *,
        grades:grade_id(name)
      `)
      .eq('term_number', termNumber)
      .eq('year', year)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  // Get fee for specific grade/term/year
  async getFee(gradeId: string, termNumber: TermNumber, year: number) {
    const { data, error } = await supabase
      .from('fees')
      .select(`
        *,
        grades:grade_id(name)
      `)
      .eq('grade_id', gradeId)
      .eq('term_number', termNumber)
      .eq('year', year)
      .single()

    if (error) throw error
    return data
  },

  // Create fee structure
  async createFee(fee: Omit<FeeInsert, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('fees')
      .insert(fee)
      .select(`
        *,
        grades:grade_id(name)
      `)
      .single()

    if (error) throw error
    return data
  },

  // Update fee structure
  async updateFee(id: string, updates: FeeUpdate) {
    const { data, error } = await supabase
      .from('fees')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        grades:grade_id(name)
      `)
      .single()

    if (error) throw error
    return data
  },

  // Activate/deactivate fees
  async toggleFeeStatus(id: string, isActive: boolean) {
    const { data, error } = await supabase
      .from('fees')
      .update({ is_active: isActive })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Delete fee structure
  async deleteFee(id: string) {
    const { error } = await supabase
      .from('fees')
      .delete()
      .eq('id', id)

    if (error) throw error
    return true
  },

  // Get fees by grade
  async getFeesByGrade(gradeId: string) {
    return this.getFees({ gradeId })
  },

  // Get current term fees
  async getCurrentTermFees(year: number) {
    const currentTerm = this.getCurrentTerm()
    return this.getActiveFees(currentTerm, year)
  },

  // Helper to determine current term (based on month)
  getCurrentTerm(): TermNumber {
    const month = new Date().getMonth() + 1 // Convert to 1-12
    
    if (month >= 1 && month <= 4) return 1
    if (month >= 5 && month <= 8) return 2
    return 3
  },

  // Get total expected fees for term/year
  async getTotalExpectedFees(termNumber: TermNumber, year: number) {
    const { data, error } = await supabase
      .from('fees')
      .select('amount')
      .eq('term_number', termNumber)
      .eq('year', year)
      .eq('is_active', true)

    if (error) throw error
    
    return data?.reduce((sum, fee) => sum + (fee.amount || 0), 0) || 0
  }
}
