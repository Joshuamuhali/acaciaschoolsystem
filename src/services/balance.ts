import { supabase } from '@/lib/supabase/client'
import { Database } from '@/types/supabase'
import { PaymentStatusView } from '@/types/enums'

type BalancePerPupil = Database['public']['Views']['balance_per_pupil']['Row']
type GradeSummary = Database['public']['Views']['grade_summary']['Row']

export const balanceService = {
  // Use balance_per_pupil view to get pupil balances
  async getPupilBalances(filters?: {
    gradeId?: string;
    paymentStatus?: PaymentStatusView;
    limit?: number;
    offset?: number;
  }) {
    let query = supabase
      .from('balance_per_pupil')
      .select('*')
      .order('pupil_name', { ascending: true })

    if (filters?.gradeId) {
      query = query.eq('grade_name', filters.gradeId)
    }
    
    if (filters?.paymentStatus) {
      query = query.eq('payment_status', filters.paymentStatus)
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

  // Get balance for a specific pupil
  async getPupilBalance(pupilId: string) {
    const { data, error } = await supabase
      .from('balance_per_pupil')
      .select('*')
      .eq('pupil_id', pupilId)
      .single()

    if (error) throw error
    return data
  },

  // Calculate expected vs collected vs pending using grade_summary view
  async getGradeSummary(filters?: {
    gradeId?: string;
    year?: number;
  }) {
    let query = supabase
      .from('grade_summary')
      .select('*')
      .order('grade_name', { ascending: true })

    if (filters?.gradeId) {
      query = query.eq('grade_id', filters.gradeId)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  },

  // Get overall school balance summary
  async getSchoolSummary() {
    const { data, error } = await supabase
      .from('grade_summary')
      .select('*')

    if (error) throw error
    
    if (!data || data.length === 0) {
      return {
        totalPupils: 0,
        totalExpected: 0,
        totalCollected: 0,
        totalPending: 0,
        collectionRate: 0
      }
    }

    const summary = data.reduce((acc, grade) => ({
      totalPupils: acc.totalPupils + grade.total_pupils,
      totalExpected: acc.totalExpected + grade.total_expected,
      totalCollected: acc.totalCollected + grade.total_collected,
      totalPending: acc.totalPending + grade.total_pending
    }), {
      totalPupils: 0,
      totalExpected: 0,
      totalCollected: 0,
      totalPending: 0
    })

    return {
      ...summary,
      collectionRate: summary.totalExpected > 0 ? (summary.totalCollected / summary.totalExpected) * 100 : 0
    }
  },

  // Get pupils by payment status
  async getPupilsByPaymentStatus(status: PaymentStatusView) {
    return this.getPupilBalances({ paymentStatus: status })
  },

  // Get overdue pupils (unpaid status)
  async getOverduePupils() {
    return this.getPupilBalances({ paymentStatus: 'unpaid' })
  },

  // Get pupils with partial payments
  async getPartialPaymentPupils() {
    return this.getPupilBalances({ paymentStatus: 'partial' })
  },

  // Get fully paid pupils
  async getPaidPupils() {
    return this.getPupilBalances({ paymentStatus: 'paid' })
  },

  // Calculate collection statistics
  async getCollectionStats(termNumber?: number, year?: number) {
    // For now, use grade_summary. In future, we can add term/year filtering
    const summary = await this.getSchoolSummary()
    
    return {
      totalPupils: summary.totalPupils,
      paidPupils: 0, // Would need additional query to calculate this
      partialPupils: 0, // Would need additional query to calculate this
      unpaidPupils: 0, // Would need additional query to calculate this
      totalExpected: summary.totalExpected,
      totalCollected: summary.totalCollected,
      totalPending: summary.totalPending,
      collectionRate: summary.collectionRate,
      averagePaymentPerPupil: summary.totalPupils > 0 ? summary.totalCollected / summary.totalPupils : 0
    }
  }
}
