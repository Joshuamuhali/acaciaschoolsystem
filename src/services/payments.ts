import { supabase } from '@/lib/supabase/client'
import { Database } from '@/types/supabase'
import { PaymentStatus, TermNumber } from '@/types/enums'

type Payment = Database['public']['Tables']['payments']['Row']
type PaymentInsert = Database['public']['Tables']['payments']['Insert']
type PaymentUpdate = Database['public']['Tables']['payments']['Update']

export const paymentsService = {
  // Record payments with approval workflow
  async recordPayment(payment: Omit<PaymentInsert, 'id' | 'created_at' | 'approval_status'>) {
    const { data, error } = await supabase
      .from('payments' as any)
      .insert({
        ...payment,
        approval_status: 'approved' as const
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Fetch payments by pupil, term, year
  async getPayments(filters?: {
    pupilId?: string;
    termNumber?: TermNumber;
    year?: number;
    status?: PaymentStatus;
    includeDeleted?: boolean;
  }) {
    let query = supabase
      .from('payments' as any)
      .select(`
        *,
        pupils:pupil_id(full_name, grades:grade_id(name))
      `)
      .order('payment_date', { ascending: false })

    if (filters?.pupilId) {
      query = query.eq('pupil_id', filters.pupilId)
    }
    
    if (filters?.termNumber) {
      query = query.eq('term_number', filters.termNumber)
    }
    
    if (filters?.year) {
      query = query.eq('year', filters.year)
    }
    
    if (filters?.status) {
      query = query.eq('approval_status', filters.status)
    }
    
    if (!filters?.includeDeleted) {
      query = query.eq('is_deleted', false)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  },

  // Handle soft deletes and approval status
  async softDeletePayment(paymentId: string, reason: string) {
    const { data, error } = await supabase
      .from('payments' as any)
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        approval_status: 'pending_approval' as const,
        deletion_reason: reason
      })
      .eq('id', paymentId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Approve payment deletion
  async approvePaymentDeletion(paymentId: string) {
    const { data, error } = await supabase
      .from('payments' as any)
      .update({
        approval_status: 'approved' as const,
        approved_at: new Date().toISOString()
      })
      .eq('id', paymentId)
      .eq('approval_status', 'pending_approval')
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Reject payment deletion
  async rejectPaymentDeletion(paymentId: string, rejectionReason: string) {
    const { data, error } = await supabase
      .from('payments' as any)
      .update({
        approval_status: 'rejected' as const,
        rejection_reason: rejectionReason
      })
      .eq('id', paymentId)
      .eq('approval_status', 'pending_approval')
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Get payment history for a pupil
  async getPaymentHistory(pupilId: string) {
    const { data, error } = await supabase
      .from('payments' as any)
      .select(`
        *
      `)
      .eq('pupil_id', pupilId)
      .eq('is_deleted', false)
      .order('payment_date', { ascending: false })

    if (error) throw error
    return data
  },

  // Get pending deletion approvals
  async getPendingDeletionApprovals() {
    const { data, error } = await supabase
      .from('pending_deletion_approvals' as any)
      .select('*')
      .order('deleted_at', { ascending: false })

    if (error) throw error
    return data
  },

  // Get total payments for a term/year
  async getTotalPayments(termNumber: TermNumber, year: number) {
    const { data, error } = await supabase
      .from('payments' as any)
      .select('amount_paid')
      .eq('term_number', termNumber)
      .eq('year', year)
      .eq('is_deleted', false)
      .eq('approval_status', 'approved')

    if (error) throw error
    
    return data?.reduce((sum, payment) => sum + (payment as any).amount_paid || 0, 0) || 0
  },

  // Update payment
  async updatePayment(id: string, updates: PaymentUpdate) {
    const { data, error } = await supabase
      .from('payments' as any)
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }
}
