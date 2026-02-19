import { supabase } from '@/lib/supabase/client'
import { Database } from '@/types/supabase'

type GradeSummary = Database['public']['Views']['grade_summary']['Row']
type BalancePerPupil = Database['public']['Views']['balance_per_pupil']['Row']

export const dashboardService = {
  // Use grade_summary view for dashboard statistics
  async getDashboardStats(filters?: {
    year?: number;
    termNumber?: 1 | 2 | 3;
  }) {
    let query = supabase
      .from('grade_summary')
      .select('*')

    const { data, error } = await query
    if (error) throw error

    if (!data || data.length === 0) {
      return {
        totalPupils: 0,
        totalExpected: 0,
        totalCollected: 0,
        totalPending: 0,
        collectionRate: 0,
        gradesData: []
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
      collectionRate: summary.totalExpected > 0 ? (summary.totalCollected / summary.totalExpected) * 100 : 0,
      gradesData: data
    }
  },

  // Get summary data for charts and reports
  async getGradePerformanceMetrics() {
    const { data, error } = await supabase
      .from('grade_summary')
      .select(`
        *,
        collection_rate: total_collected / NULLIF(total_expected, 0) * 100
      `)
      .order('collection_rate', { ascending: false })

    if (error) throw error
    return data || []
  },

  // Get payment trends over time
  async getPaymentTrends(year?: number) {
    const currentYear = year || new Date().getFullYear()
    
    const { data, error } = await supabase
      .from('payments')
      .select(`
        amount_paid,
        payment_date,
        term_number,
        pupils:pupil_id(full_name, grades:grade_id(name))
      `)
      .eq('year', currentYear)
      .eq('is_deleted', false)
      .eq('approval_status', 'approved')
      .order('payment_date', { ascending: true })

    if (error) throw error
    return data || []
  },

  // Get monthly collection data
  async getMonthlyCollections(year?: number) {
    const currentYear = year || new Date().getFullYear()
    
    const { data, error } = await supabase
      .from('payments')
      .select(`
        amount_paid,
        payment_date,
        term_number
      `)
      .eq('year', currentYear)
      .eq('is_deleted', false)
      .eq('approval_status', 'approved')
      .order('payment_date', { ascending: true })

    if (error) throw error
    return data || []
  },

  // Get top performing grades
  async getTopPerformingGrades(limit = 5) {
    const { data, error } = await supabase
      .from('grade_summary')
      .select(`
        *,
        collection_rate: total_collected / NULLIF(total_expected, 0) * 100
      `)
      .order('collection_rate', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  },

  // Get grades needing attention (low collection rates)
  async getGradesNeedingAttention(threshold = 50) {
    const { data, error } = await supabase
      .from('grade_summary')
      .select(`
        *,
        collection_rate: total_collected / NULLIF(total_expected, 0) * 100
      `)
      .lt('total_collected / NULLIF(total_expected, 0) * 100', threshold)
      .order('collection_rate', { ascending: true })

    if (error) throw error
    return data || []
  },

  // Get enrollment statistics
  async getEnrollmentStats() {
    const { data, error } = await supabase
      .from('grade_summary')
      .select('*')
      .order('total_pupils', { ascending: false })

    if (error) throw error

    const totalEnrollment = data?.reduce((sum, grade) => sum + grade.total_pupils, 0) || 0
    
    return {
      totalEnrollment,
      gradesData: data || [],
      averageClassSize: data && data.length > 0 ? totalEnrollment / data.length : 0,
      largestGrade: data?.reduce((max, grade) => 
        grade.total_pupils > max.total_pupils ? grade : max, data?.[0] || {} as any
      ),
      smallestGrade: data?.reduce((min, grade) => 
        grade.total_pupils < min.total_pupils ? grade : min, data?.[0] || {} as any
      )
    }
  },

  // Get financial health indicators
  async getFinancialHealth() {
    const summary = await this.getDashboardStats()
    
    return {
      overallHealth: summary.collectionRate >= 80 ? 'excellent' : 
                   summary.collectionRate >= 60 ? 'good' : 
                   summary.collectionRate >= 40 ? 'fair' : 'poor',
      collectionRate: summary.collectionRate,
      totalRevenue: summary.totalCollected,
      outstandingRevenue: summary.totalPending,
      revenuePerPupil: summary.totalPupils > 0 ? summary.totalCollected / summary.totalPupils : 0,
      atRiskGrades: summary.gradesData.filter(grade => 
        (grade.total_collected / grade.total_expected) * 100 < 50
      ).length,
      healthyGrades: summary.gradesData.filter(grade => 
        (grade.total_collected / grade.total_expected) * 100 >= 80
      ).length
    }
  },

  // Get recent activity
  async getRecentActivity(limit = 10) {
    const { data, error } = await supabase
      .from('recent_access_attempts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  }
}
